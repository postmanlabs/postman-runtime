const _ = require('lodash'),
    sdk = require('postman-collection'),
    serialisedError = require('serialised-error'),
    { getIterationData } = require('./util'),

    SYNCABLE_CONTEXT_VARIABLE_SCOPES = ['_variables', 'collectionVariables', 'environment', 'globals'],
    EXECUTION_RUN_REQUEST_RESPONSE_EVENT_BASE = 'execution.run_collection_request_response.';

/**
 * Starts the pm.execution.runRequest chain of a top-level script. The chain is kept per script execution and handed
 * down to every nested run, so concurrent partitions of a run each get their own.
 *
 * @param {Run} run - the run of the top-level script
 * @param {Object} cursor - the top-level script's cursor
 * @param {Item} item - the top-level item
 * @returns {Object}
 */
function createNestedRequestChain (run, cursor, item) {
    const partition = run.areIterationsParallelized &&
        _.get(run, ['partitionManager', 'partitions', cursor.partitionIndex]);

    return {
        isNestedRequest: true,
        rootCursor: cursor,
        rootItem: item,
        callStack: [],
        // nested runs of this chain, aborted when the partition is stopped
        nestedRuns: partition ? partition.nestedRuns : undefined
    };
}

/**
 * Finds the iteration data row of the iteration that a nested request was invoked from.
 *
 * @param {Run} run - the run the nested request was invoked from
 * @param {Object} nestedRequest - the pm.execution.runRequest chain of the top-level script
 * @returns {Object}
 */
function getParentIterationRow (run, nestedRequest) {
    // A streaming source must never be passed down: the child would iterate the same object,
    // stealing the parent's rows, and release the shared cursor on teardown
    // while the parent still has iterations to run.
    if (run.state._dataIterator) {
        return run.state._dataRow;
    }

    // customParallelIterations has no run-level data, each partition holds the row its host injected
    if (run.isCustomParallelIterations) {
        return _.get(run, ['partitionManager', 'partitions', nestedRequest.rootCursor.partitionIndex,
            'iterationData'], {});
    }

    return getIterationData(_.isEmpty(run.state.data) ? [{}] : run.state.data,
        nestedRequest.rootCursor.iteration);
}

function runNestedRequest ({ executionId, isExecutionSkipped, vaultSecrets, item, nestedRequestScope }) {
    // Note: Don't forget to bind this function to the runner to make sure `this` can give you the right options & state
    return function (cursor, eventId, requestId, requestToRunId, runRequestOptions = {}, runContext = {}) {
        const self = this,
            requestResolver = _.get(self, 'options.script.requestResolver'),
            runRequestRespEvent = EXECUTION_RUN_REQUEST_RESPONSE_EVENT_BASE + eventId,
            maxInvokableNestedRequests = _.get(self, 'options.maxInvokableNestedRequests'),
            itemId = item.id,

            // Prepare nested request object for passing down to child request
            // Have to keep object reference common so any changes made by nested executions is bubbled back to
            // parent exec. A top-level script starts the chain on its first call.
            nestedRequest = nestedRequestScope.nestedRequest ||
                (nestedRequestScope.nestedRequest = createNestedRequestChain(self, cursor, item)),
            nestedRuns = nestedRequest.nestedRuns,
            currentItemState = { isPoppedFromCallStack: false },
            popCurrentItemFromCallStack = () => {
                if (currentItemState.isPoppedFromCallStack) { return; }

                currentItemState.isPoppedFromCallStack = true;

                if (!nestedRequest.callStack.length) { return; }

                const { callStack } = nestedRequest,
                    itemIndex = callStack.lastIndexOf(itemId);

                if (itemIndex !== -1) {
                    nestedRequest.callStack.splice(itemIndex, 1);
                }
            };

        function dispatchErrorToListener (err) {
            popCurrentItemFromCallStack();

            const error = serialisedError(err);

            delete error.stack;

            return self.host.dispatch(EXECUTION_RUN_REQUEST_RESPONSE_EVENT_BASE + eventId,
                requestId, error);
        }

        nestedRequest.callStack.push(itemId);

        // The partition that started this chain was stopped, don't start anything new for it
        if (nestedRuns && nestedRuns.aborted) {
            return dispatchErrorToListener(new Error('pm.execution.runRequest: the iteration was stopped.'));
        }

        // No more than maxInvokableNestedRequests nested depth
        if (nestedRequest.callStack.length > maxInvokableNestedRequests) {
            return dispatchErrorToListener(new Error('Max pm.execution.runRequest depth of ' +
                maxInvokableNestedRequests + ' has been reached.'));
        }

        let rootRequestEventsList = nestedRequest.rootItem.events?.all?.() || [],
            nestedRequestMeta = null,
            context = { rootItemId: nestedRequest.rootItem.id };

        for (const event of rootRequestEventsList) {
            if (event.script?.requests?.[requestToRunId]) {
                nestedRequestMeta = event.script.requests[requestToRunId];
                break;
            }
        }

        if (nestedRequestMeta) {
            context.nestedRequestMeta = nestedRequestMeta;
        }

        // Should fetch the request from the consumer of postman-runtime & resolve scripts and variables
        requestResolver(requestToRunId, context, function (err, collection) {
            if (err) {
                return dispatchErrorToListener(err);
            }

            if (!collection) {
                return dispatchErrorToListener(new Error('Expected collection json with request item ' +
                    'to invoke pm.execution.runRequest'));
            }

            // Prepare variables that have been set inside the parent's pre-req/post-res script
            // so far and pass them to the runner for this request.
            // This is important because for nested requests,
            // variables set by the parent using pm.<variable-form>.set do not reflect
            // in postman-runtime's scope immediately. They are present inside postman-sandbox
            // till the parent request's script execution ends.
            const globals = { values: runContext.globals || [] },
                localVariables = { values: runContext._variables || [] },
                environment = { values: runContext.environment || [] },
                collectionVariables = { values: runContext.collectionVariables || [] };

            const runner = require('.'),
                variableOverrides = runRequestOptions.variables ?
                    Object.entries(runRequestOptions.variables)
                        .map(function ([key, value]) {
                            return { key, value };
                        }) :
                    [],
                runnableRefRequestCollection = new sdk.Collection(collection),
                mergedCollectionVariableList = new sdk.VariableList(),

                // A nested request sees the row of the iteration it was invoked from, so
                // resolve it here and hand the child a one-row array.
                parentIterationRow = getParentIterationRow(self, nestedRequest),

                // A partitioned run hands its nested requests the calling partition's cookies: its own jar when
                // per-partition jars are on, else the run's shared jar. An explicit jar also turns off per-partition
                // jars for the nested run. Deeper nested runs inherit it through `requester`. Other runs keep their
                // requester options as they are.
                requester = self.areIterationsParallelized ? {
                    ..._.omit(self.options.requester, 'perPartitionCookieJar'),
                    cookieJar: self.getCookieJarFor(cursor) || _.get(self, 'requester.options.cookieJar')
                } : self.options.requester;

            // Merge parent collection's variables with this collection's variables
            // Why the separate statement? Because we want the referenced request's collection's variables to
            // take precedence over the parent collection's variables if there are any conflicts.
            mergedCollectionVariableList.populate(collectionVariables.values);
            mergedCollectionVariableList.populate(runnableRefRequestCollection.variables.all());

            runnableRefRequestCollection.variables = mergedCollectionVariableList;

            // Merge local variables from parent requests & scope + nestedRequest.options.variables
            localVariables.values = [...localVariables.values, ...variableOverrides];

            // Why clone? Each runner execution needs to track and mutate its vault variables separately and propagate
            // it back up and further down. We don't want to accidentally reset mutations between executions by sharing
            // this scope
            let clonedVaultSecrets;

            if (vaultSecrets) {
                clonedVaultSecrets = new sdk.VariableScope({
                    values: vaultSecrets.values,
                    prefix: vaultSecrets.prefix
                });

                clonedVaultSecrets._ = vaultSecrets._;
            }

            new runner().run(runnableRefRequestCollection,
                {
                    ...self.state,
                    ...self.options,
                    data: [parentIterationRow],
                    entrypoint: {
                        lookupStrategy: 'idOrName',
                        execute: requestToRunId
                    },
                    iterationCount: 1,
                    globals: globals,
                    environment: environment,
                    localVariables: localVariables,
                    vaultSecrets: clonedVaultSecrets,
                    stopOnError: true,
                    nestedRequest: nestedRequest,
                    // The nested request runs once, sequentially, for the script that invoked it
                    customParallelIterations: false,
                    maxConcurrency: 1,
                    requester: requester,
                    host: {
                        // Reuse current run's sandbox host across nested executions
                        external: true,
                        instance: self.host
                    }
                },
                function (err, run) {
                    let exceptionForThisRequest = null,
                        responseForThisRequest = null,
                        variableMutationsFromThisExecution = {};

                    if (err) {
                        popCurrentItemFromCallStack();

                        return self.host
                            .dispatch(EXECUTION_RUN_REQUEST_RESPONSE_EVENT_BASE + eventId,
                                requestId, err);
                    }

                    // the partition may have been stopped while the request was being resolved
                    if (nestedRuns && nestedRuns.aborted) {
                        return dispatchErrorToListener(new Error('pm.execution.runRequest: the iteration was ' +
                            'stopped.'));
                    }

                    nestedRuns && nestedRuns.runs.add(run);

                    run.start({
                        script (_err, _cursor, result) {
                            // This is to sync changes to pm.variables, pm.environment & pm.globals
                            // that happened inside the nested request's script
                            // back to parent request's scripts still currently executing.

                            // collectionVariables don't need to be synced between parent and nested

                            // All other global variables defined by syntax like 'a=1'
                            // are anyway synced as the sandbox's common scope is shared across runs
                            if (result) {
                                SYNCABLE_CONTEXT_VARIABLE_SCOPES.forEach(function (type) {
                                    if (!result[type]) {
                                        return;
                                    }

                                    variableMutationsFromThisExecution[type] = [
                                        ...(variableMutationsFromThisExecution[type] || []),
                                        result[type].mutations
                                    ];
                                });

                                if (clonedVaultSecrets && clonedVaultSecrets.mutations) {
                                    const mutations = new sdk.MutationTracker(clonedVaultSecrets.mutations);

                                    mutations.applyOn(vaultSecrets);
                                }
                            }
                        },
                        request (err, _cursor, ...rest) {
                            // For nested requests, the request event should bubble up to the parent.
                            // This event is merely used for notifying the consumer that a nested request was sent
                            // similar to pm.sendRequest. So the consumer can work this into logs & any other logic.
                            if (typeof self.triggers.request === 'function' && nestedRequestScope.nestedRequest) {
                                self.triggers.request(err, nestedRequest.rootCursor, ...rest);
                            }
                        },
                        exception (_, err) {
                            if (err) {
                                exceptionForThisRequest = err;
                            }
                        },
                        response (err, _, response) {
                            if (isExecutionSkipped(executionId)) {
                                responseForThisRequest = null;
                                exceptionForThisRequest = null;

                                return;
                            }

                            if (err) {
                                exceptionForThisRequest = err;
                            }
                            if (response) {
                                responseForThisRequest = response;
                            }
                        },
                        done (err) {
                            let error = err || exceptionForThisRequest;

                            if (error) {
                                error = serialisedError(error);
                                delete error.stack;
                            }

                            popCurrentItemFromCallStack();
                            nestedRuns && nestedRuns.runs.delete(run);

                            return self.host.dispatch(runRequestRespEvent,
                                requestId, error || null,
                                responseForThisRequest,
                                { variableMutations: variableMutationsFromThisExecution });
                        }
                    });
                });
        });
    };
}

module.exports = runNestedRequest;
