const _ = require('lodash'),
    sdk = require('postman-collection'),
    serialisedError = require('serialised-error'),

    SYNCABLE_CONTEXT_VARIABLE_SCOPES = ['_variables', 'collectionVariables', 'environment', 'globals'],
    MAX_RUN_REQUEST_EVENT_DEPTH = 5,
    EXECUTION_RUN_REQUEST_RESPONSE_EVENT_BASE = 'execution.run_collection_request_response.';

function runNestedRequest ({ executionId, isExecutionSkipped }) {
    // Note: Don't forget to bind this function to the runner to make sure `this` can give you the right options & state
    return function (_cursor, eventId, requestId, requestToRunId, runRequestOptions = {}, runContext = {}) {
        const self = this,
            requestResolver = _.get(self, 'options.script.requestResolver'),
            containerRequestState = self.state,
            containerRequestPassedOptions = self.options,
            runRequestRespEvent = EXECUTION_RUN_REQUEST_RESPONSE_EVENT_BASE + eventId;

        function dispatchErrorToListener (err) {
            const error = serialisedError(err);

            delete error.stack;

            return self.host.dispatch(EXECUTION_RUN_REQUEST_RESPONSE_EVENT_BASE + eventId,
                requestId, error);
        }

        if (containerRequestPassedOptions.currentRequestNestingDepth > MAX_RUN_REQUEST_EVENT_DEPTH) {
            return dispatchErrorToListener(new Error('Exceeded max depth for pm.execution.runRequest'));
        }

        if (!requestResolver) {
            return self.host.dispatch(runRequestRespEvent, requestId, null, null);
        }

        // Should fetch the request from the consumer of postman-runtime & resolve scripts and variables
        requestResolver(requestToRunId, function (err, collection) {
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
            const variableValues = runContext.currentScopeVariableValues || {},
                globals = { values: [] },
                localVariables = { values: [] },
                environment = { values: [] },
                collectionVariables = { values: [] };

            if (variableValues.globals && variableValues.globals.length) {
                globals.values = variableValues.globals;
            }
            if (variableValues.environment && variableValues.environment.length) {
                environment.values = variableValues.environment;
            }
            if (variableValues._variables && variableValues._variables.length) {
                localVariables.values = variableValues._variables;
            }
            if (variableValues.collectionVariables && variableValues.collectionVariables.length) {
                collectionVariables.values = variableValues.collectionVariables;
            }

            if (collectionVariables.values.length) {
                collection.variable = [...collectionVariables.values, ...(collection.variable || [])];
            }

            const runner = require('.'),
                variableOverrides = runRequestOptions.variables ?
                    Object.entries(runRequestOptions.variables)
                        .map(function ([key, value]) {
                            return { key, value };
                        }) :
                    [],
                runnableCollection = new sdk.Collection(collection);

            // Merge local variables from parent requests & scope + nestedRequest.options.variables
            localVariables.values = [...localVariables.values, ...variableOverrides];

            new runner().run(runnableCollection,
                {
                    ...containerRequestState,
                    ...containerRequestPassedOptions,
                    iterationCount: 1,
                    globals: globals,
                    environment: environment,
                    localVariables: localVariables,
                    abortOnFailure: true,
                    isNestedRequest: true,
                    currentRequestNestingDepth: (self.state.currentRequestNestingDepth || 0) + 1,
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
                        return self.host
                            .dispatch(EXECUTION_RUN_REQUEST_RESPONSE_EVENT_BASE + eventId,
                                requestId, err);
                    }
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
                                    (variableMutationsFromThisExecution[type] ||= [])
                                        .push(result[type].mutations);
                                });
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
