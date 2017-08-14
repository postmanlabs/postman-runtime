var _ = require('lodash'),
    uuid = require('uuid'),
    async = require('async'),

    util = require('../util'),
    sdk = require('postman-collection'),
    sandbox = require('postman-sandbox'),
    serialisedError = require('serialised-error'),

    ASSERTION_FAILURE = 'AssertionFailure',
    SAFE_CONTEXT_VARIABLES = ['environment', 'globals', 'cookies', 'data', 'request', 'response'],

    EXECUTION_REQUEST_EVENT_BASE = 'execution.request.',
    EXECUTION_RESPONSE_EVENT_BASE = 'execution.response.',
    EXECUTION_ASSERTION_EVENT_BASE = 'execution.assertion.',
    EXECUTION_ERROR_EVENT_BASE = 'execution.error.',

    FILE = 'file',

    REQUEST_BODY_MODE_FILE = 'file',
    REQUEST_BODY_MODE_FORMDATA = 'formdata',

    postProcessContext = function (execution, failures) { // function determines whether the event needs to abort
        var tests = execution && execution.tests,
            error;

        _.forOwn(tests, function (result, test) {
            !result && (failures || (failures = [])).push(test);
        });

        if (failures && failures.length) {
            error = new Error(failures.join(', '));
            error.name = ASSERTION_FAILURE;
        }
        return error ? serialisedError(error, true) : undefined;
    },

    /**
     * Removes files in Request body if any.
     *
     * @param {Request~definition} request Request JSON representation to be sanitized
     * @param {Function} warn function to invoke when a file is found
     *
     * @returns {Request~definition}
     */
    sanitizeFiles = function (request, warn) {
        var sanitizedRequest,
            sanitizedFormdata;

        // do nothing if request body is empty
        if (!request.body) {
            return request;
        }

        // handle request body in `file` mode
        if (request.body.mode === REQUEST_BODY_MODE_FILE) {
            // clone the request and remove file in body
            sanitizedRequest = _.clone(request);
            sanitizedRequest.body.file = null;

            // send a warning that file was removed
            warn();

            return sanitizedRequest;
        }

        // handle request body in `formdata` mode
        if (request.body.mode === REQUEST_BODY_MODE_FORMDATA) {
            // extract any file type params
            sanitizedFormdata = _.reject(request.body.formdata, {type: FILE});

            // if a file param was detected
            if (sanitizedFormdata.length !== _.get(request, 'body.formdata.length')) {
                // clone the request and set form data without file params
                sanitizedRequest = _.clone(request);
                sanitizedRequest.formdata = sanitizedFormdata;

                // send a warning that file was removed
                warn();

                return sanitizedRequest;
            }

            // return original request if none of the formdata params is a file type
            return request;
        }

        // return original request for any other request body mode
        return request;
    };

/**
 * Script execution extenion of the runner.
 * This module exposes processors for executing scripts before and after requests. Essentially, the processors are
 * itself not aware of other processors and simply allow running of a script and then queue a procesor as defined in
 * payload.
 *
 * Adds options
 * - suppressEventPropagation:Boolean [true]
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
            var suppressEventPropagation = _.has(this.options, 'suppressEventPropagation') ?
                    this.options.suppressEventPropagation : true,
                item = payload.item,
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

            // get the list of events to be executed. note that based on the `suppressEventPropagation` option, use
            // all inherited events or own events only
            events = suppressEventPropagation ? item.events.listenersOwn(eventName) : item.events.listeners(eventName);

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
                    assertionFailed = [];

                // store the execution id in script
                script._lastExecutionId = executionId; // please don't use it anywhere else!

                // trigger the "beforeScript" callback
                this.triggers.beforeScript(null, cursor, script, event, item);

                // add event listener to trap all assertion events, but only if needed. to avoid needlessly accumulate
                // stuff in memory.
                (abortOnFailure || stopOnFailure) &&
                    this.host.on(EXECUTION_ASSERTION_EVENT_BASE + executionId, function (cursor, assertion) {
                        !assertion.passed && assertionFailed.push(assertion.name);
                    });

                this.host.on(EXECUTION_REQUEST_EVENT_BASE + executionId, function (cursor, id, requestId, request) {
                    // clone cursor and add source
                    var cursorWithSource = _.clone(cursor),
                        tempRequest,
                        tempItem;

                    // remove files in request body if any
                    tempRequest = sanitizeFiles(request, function () {
                        this.triggers.console(cursor, 'warn', 'uploading files from scripts is not allowed');
                    }.bind(this));

                    tempItem = new sdk.Item({
                        request: tempRequest
                    });

                    tempItem.setParent(item);

                    cursorWithSource.source = 'script'; // @todo - get script type from the sandbox

                    this.immediate('request', {
                        item: tempItem,
                        globals: payload.context.globals,
                        environment: payload.context.environment,
                        data: payload.context.data,
                        coords: cursorWithSource,
                        // abortOnError is set to true to make sure
                        // request command bubbles errors so we can pass it on to the callback
                        abortOnError: true
                    }).done(function (result) {
                        this.host.dispatch(
                            EXECUTION_RESPONSE_EVENT_BASE + id,
                            requestId, null,
                            result && result.response
                        );
                    }).catch(function (err) {
                        this.host.dispatch(EXECUTION_RESPONSE_EVENT_BASE + id, requestId, err);
                    });
                }.bind(this));

                // finally execute the script
                this.host.execute(event, {
                    id: executionId,
                    // debug: true,
                    timeout: payload.scriptTimeout,
                    cursor: cursor,
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

                        // ensure that variablescope is treated accordingly
                        // @todo find a better way to not sync entire scope, but receive changes and update the existing
                        // scope using that
                        if (_.isFunction(payload.context[variable].syncVariablesFrom)) {
                            payload.context[variable].clear();
                            _.forEach(result[variable].values, function (def) {
                                payload.context[variable].values.add(def);
                            });
                        }
                        else {
                            util.syncObject(payload.context[variable], result[variable]);
                        }
                    });

                    // Get the failures. If there was an error running the script itself, that takes precedence
                    if (!err && (abortOnFailure || stopOnFailure)) {
                        err = postProcessContext(result, assertionFailed); // also use async assertions
                    }

                    // Ensure that we have SDK instances, not serialized plain objects.
                    // @todo - should this be handled by the sandbox?
                    result && result.environment && (result.environment = new sdk.VariableScope(result.environment));
                    result && result.globals && (result.globals = new sdk.VariableScope(result.globals));
                    result && result.request && (result.request = new sdk.Request(result.request));
                    result && result.response && (result.response = new sdk.Response(result.response));

                    // now that this script is done executing, we trigger the event and move to the next script
                    this.triggers.script(err || null, cursor, result, script, event, item);

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
