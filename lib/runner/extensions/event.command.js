var _ = require('lodash'),
    uuid = require('uuid'),
    async = require('async'),

    util = require('../util'),
    sdk = require('postman-collection'),
    sandbox = require('postman-sandbox'),
    serialisedError = require('serialised-error'),

    createItemContext = require('../create-item-context'),

    ASSERTION_FAILURE = 'AssertionFailure',
    SAFE_CONTEXT_VARIABLES = ['_variables', 'environment', 'globals', 'collectionVariables', 'cookies', 'data',
        'request', 'response'],

    EXECUTION_REQUEST_EVENT_BASE = 'execution.request.',
    EXECUTION_RESPONSE_EVENT_BASE = 'execution.response.',
    EXECUTION_ASSERTION_EVENT_BASE = 'execution.assertion.',
    EXECUTION_ERROR_EVENT_BASE = 'execution.error.',

    FILE = 'file',

    REQUEST_BODY_MODE_FILE = 'file',
    REQUEST_BODY_MODE_FORMDATA = 'formdata',

    postProcessContext, // fn
    sanitizeFiles; // fn

postProcessContext = function (execution, failures) { // function determines whether the event needs to abort
    var error;

    if (failures && failures.length) {
        error = new Error(failures.join(', '));
        error.name = ASSERTION_FAILURE;
    }
    return error ? serialisedError(error, true) : undefined;
};

/**
 * Removes files in Request body if any.
 *
 * @private
 *
 * @param {Request~definition} request Request JSON representation to be sanitized
 * @param {Function} callback function invoked with error, request and sanitisedFiles.
 * sanitisedFiles is the list of files removed from request.
 *
 * @note this function mutates the request
 */
sanitizeFiles = function (request, callback) {
    if (!request) {
        return callback(new Error('Could not complete pm.sendRequest. Request is empty.'));
    }

    var sanitisedFiles = [];

    // do nothing if request body is empty
    if (!request.body) {
        // send request as such
        return callback(null, request, sanitisedFiles);
    }

    // in case of request body mode is file, we strip it out
    if (request.body.mode === REQUEST_BODY_MODE_FILE) {
        sanitisedFiles.push(_.get(request, 'body.file.src'));
        request.body = null; // mutate the request for body
    }

    // if body is form-data then we deep dive into the data items and remove the entries that have file data
    else if (request.body.mode === REQUEST_BODY_MODE_FORMDATA) {
        _.remove(request.body.formdata, function (param) {
            // blank param and non-file param is removed
            if (!param || param.type !== FILE) { return false; }

            // at this point the param needs to be removed
            sanitisedFiles.push(param.src);
            return true;
        });
    }

    return callback(null, request, sanitisedFiles);
};

/**
 * Script execution extension of the runner.
 * This module exposes processors for executing scripts before and after requests. Essentially, the processors are
 * itself not aware of other processors and simply allow running of a script and then queue a procesor as defined in
 * payload.
 *
 * Adds options
 * - stopOnScriptError:Boolean [false]
 * - host:Object [undefined]
 */
module.exports = {
    init: function (done) {
        var run = this;

        // if this run object already has a host, we do not need to create one.
        if (run.host) {
            return done();
        }

        // @todo - remove this when chrome app and electron host creation is offloaded to runner
        // @todo - can this be removed now in runtime v4?
        if (run.options.host && run.options.host.external === true) {
            run.host = run.options.host.instance;
            return done();
        }

        sandbox.createContext(_.merge({
            timeout: _(run.options.timeout).pick(['script', 'global']).values().min()
            // debug: true
        }, run.options.host), function (err, context) {
            if (err) { return done(err); }
            // store the host in run object for future use and move on
            run.host = context;

            context.on('console', function () {
                run.triggers.console.apply(run.triggers, arguments);
            });

            context.on('error', function () {
                run.triggers.error.apply(run.triggers, arguments);
            });

            context.on('execution.error', function () {
                run.triggers.exception.apply(run.triggers, arguments);
            });

            context.on('execution.assertion', function () {
                run.triggers.assertion.apply(run.triggers, arguments);
            });

            done();
        });
    },

    /**
     * This lists the name of the events that the script processors are likely to trigger
     *
     * @type {Array}
     */
    triggers: ['beforeScript', 'script', 'assertion', 'exception', 'console'],

    process: {
        /**
         * This processors job is to do the following:
         * - trigger event by its name
         * - execute all scripts that the event listens to and return execution results
         *
         * @param {Object} payload
         * @param {String} payload.name
         * @param {Item} payload.item
         * @param {Object} [payload.context]
         * @param {Cursor} [payload.coords]
         * @param {Number} [payload.scriptTimeout] - The millisecond timeout for the current running script.
         * @param {Array.<String>} [payload.trackContext]
         * @param {Boolean} [payload.stopOnScriptError] - if set to true, then a synchronous error encountered during
         * execution of a script will stop executing any further scripts
         * @param {Boolean} [payload.abortOnFailure]
         * @param {Boolean} [payload.stopOnFailure]
         * @param {Function} next
         *
         * @note - in order to raise trigger for the entire event, ensure your extension has registered the triggers
         */
        event: function (payload, next) {
            var item = payload.item,
                eventName = payload.name,
                cursor = payload.coords,
                // the payload can have a list of variables to track from the context post execution, ensure that
                // those are accurately set
                track = _.isArray(payload.trackContext) && _.isObject(payload.context) &&
                    // ensure that only those variables that are defined in the context are synced
                    payload.trackContext.filter(function (variable) {
                        return _.isObject(payload.context[variable]);
                    }),
                stopOnScriptError = (_.has(payload, 'stopOnScriptError') ? payload.stopOnScriptError :
                    this.options.stopOnScriptError),
                abortOnError = (_.has(payload, 'abortOnError') ? payload.abortOnError : this.options.abortOnError),

                // @todo: find a better home for this option processing
                abortOnFailure = payload.abortOnFailure,
                stopOnFailure = payload.stopOnFailure,

                events;

            // @todo: find a better place to code this so that event is not aware of such options
            if (abortOnFailure) {
                abortOnError = true;
            }

            // validate the payload
            if (!eventName) {
                return next(new Error('runner.extension~events: event payload is missing the event name.'));
            }
            if (!item) {
                return next(new Error('runner.extension~events: event payload is missing the triggered item.'));
            }

            // get the list of events to be executed
            // includes events in parent as well
            events = item.events.listeners(eventName);

            // call the "before" event trigger by its event name.
            // at this point, the one who queued this event, must ensure that the trigger for it is defined in its
            // 'trigger' interface
            this.triggers[_.camelCase('before-' + eventName)](null, cursor, events, item);

            // with all the event listeners in place, we now iterate on them and execute its scripts. post execution,
            // we accumulate the results in order to be passed on to the event callback trigger.
            async.mapSeries(events, function (event, next) {
                // in case the event has no script we bail out early
                if (!event.script) {
                    return next(null, {event: event});
                }

                // get access to the script from the event.
                var script = event.script,
                    executionId = uuid(),
                    assertionFailed = [],

                    // create copy of cursor so we don't leak script ids outside `event.command`
                    // and across scripts
                    scriptCursor = _.clone(cursor);

                // store the execution id in script
                script._lastExecutionId = executionId; // please don't use it anywhere else!

                // if we can find an id on script or event we add them to the cursor
                // so logs and errors can be traced back to the script they came from
                event.id && (scriptCursor.eventId = event.id);
                event.script.id && (scriptCursor.scriptId = event.script.id);

                // trigger the "beforeScript" callback
                this.triggers.beforeScript(null, scriptCursor, script, event, item);

                // add event listener to trap all assertion events, but only if needed. to avoid needlessly accumulate
                // stuff in memory.
                (abortOnFailure || stopOnFailure) &&
                    this.host.on(EXECUTION_ASSERTION_EVENT_BASE + executionId, function (scriptCursor, assertions) {
                        _.forEach(assertions, function (assertion) {
                            assertion && !assertion.passed && assertionFailed.push(assertion.name);
                        });
                    });

                this.host.on(EXECUTION_REQUEST_EVENT_BASE + executionId,
                    function (scriptCursor, id, requestId, request) {
                        // remove files in request body if any
                        sanitizeFiles(request, function (err, request, sanitisedFiles) {
                            if (err) {
                                return this.host.dispatch(EXECUTION_RESPONSE_EVENT_BASE + id, requestId, err);
                            }

                            var nextPayload;

                            // if request is sanitized send a warning
                            if (!_.isEmpty(sanitisedFiles)) {
                                this.triggers.console(scriptCursor, 'warn',
                                    'uploading files from scripts is not allowed');
                            }

                            nextPayload = {
                                item: new sdk.Item({request: request}),
                                coords: scriptCursor,
                                // @todo - get script type from the sandbox
                                source: 'script',
                                // abortOnError makes sure request command bubbles errors
                                // so we can pass it on to the callback
                                abortOnError: true
                            };

                            // create context for executing this request
                            nextPayload.context = createItemContext(nextPayload);

                            this.immediate('httprequest', nextPayload).done(function (result) {
                                this.host.dispatch(
                                    EXECUTION_RESPONSE_EVENT_BASE + id,
                                    requestId,
                                    null,
                                    result && result.response
                                );
                            }).catch(function (err) {
                                this.host.dispatch(EXECUTION_RESPONSE_EVENT_BASE + id, requestId, err);
                            });
                        }.bind(this));
                    }.bind(this));

                // finally execute the script
                this.host.execute(event, {
                    id: executionId,
                    // debug: true,
                    timeout: payload.scriptTimeout, // @todo: Expose this as a property in Collection SDK's Script
                    cursor: scriptCursor,
                    context: _.pick(payload.context, SAFE_CONTEXT_VARIABLES),

                    // legacy options
                    legacy: {
                        _itemId: item.id,
                        _itemName: item.name
                    }
                }, function (err, result) {
                    this.host.removeAllListeners(EXECUTION_REQUEST_EVENT_BASE + executionId);
                    this.host.removeAllListeners(EXECUTION_ASSERTION_EVENT_BASE + executionId);
                    this.host.removeAllListeners(EXECUTION_ERROR_EVENT_BASE + executionId);

                    // electron IPC does not bubble errors to the browser process, so we serialize it here.
                    err && (err = serialisedError(err, true));

                    // if it is defined that certain variables are to be synced back to result, we do the same
                    track && result && track.forEach(function (variable) {
                        if (!(_.isObject(result[variable]) && payload.context[variable])) { return; }

                        var contextVariable = payload.context[variable],
                            mutations = result[variable].mutations;

                        // bail out if there are no mutations
                        if (!mutations) {
                            return;
                        }

                        // ensure that variable scope is treated accordingly
                        if (_.isFunction(contextVariable.applyMutation)) {
                            mutations = new sdk.MutationTracker(result[variable].mutations);

                            mutations.applyOn(contextVariable);
                        }

                        // @todo: unify the non variable scope flows and consume diff always
                        // and drop sending the full variable scope from sandbox
                        else {
                            util.syncObject(contextVariable, result[variable]);
                        }
                    });

                    // Get the failures. If there was an error running the script itself, that takes precedence
                    if (!err && (abortOnFailure || stopOnFailure)) {
                        err = postProcessContext(result, assertionFailed); // also use async assertions
                    }

                    // Ensure that we have SDK instances, not serialized plain objects.
                    // @todo - should this be handled by the sandbox?
                    result && result._variables && (result._variables = new sdk.VariableScope(result._variables));
                    result && result.environment && (result.environment = new sdk.VariableScope(result.environment));
                    result && result.globals && (result.globals = new sdk.VariableScope(result.globals));
                    result && result.collectionVariables &&
                        (result.collectionVariables = new sdk.VariableScope(result.collectionVariables));
                    result && result.request && (result.request = new sdk.Request(result.request));
                    result && result.response && (result.response = new sdk.Response(result.response));

                    // persist the pm.variables for the next script
                    payload.context._variables = new sdk.VariableScope(result._variables);
                    // persist the pm.variables for the next request
                    this.state._variables = new sdk.VariableScope(result._variables);

                    // now that this script is done executing, we trigger the event and move to the next script
                    this.triggers.script(err || null, scriptCursor, result, script, event, item);

                    // move to next script and pass on the results for accumulation
                    next(((stopOnScriptError || abortOnError || stopOnFailure) && err) ? err : null, _.assign({
                        event: event,
                        script: script,
                        result: result
                    }, err && {error: err})); // we use assign here to avoid needless error property
                }.bind(this));

            }.bind(this), function (err, results) {
                // trigger the event completion callback
                this.triggers[eventName](null, cursor, results, item);
                next((abortOnError && err) ? err : null, results, err);
            }.bind(this));
        }
    }
};
