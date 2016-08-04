var _ = require('lodash'),
    async = require('async'),
    serialisedError = require('serialised-error'),

    util = require('../util'),
    uvm = require('../../uvm'),

    ASSERTION_FAILURE = 'AssertionFailure',

    postProcessContext = function (globals) {  // This function determines whether the event needs to abort
        var tests = globals && globals.tests,
            failures,
            error;

        _.forOwn(tests, function (result, test) {
            !result && (failures || (failures = [])).push(test);
        });

        if (failures) {
            error = new Error(failures.join(', '));
            error.name = ASSERTION_FAILURE;
        }
        return error ? serialisedError(error, true) : undefined;
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
        if (run.options.host && run.options.host.external === true) {
            run.host = run.options.host.instance;
            return done();
        }

        // create a new host to run scripts
        uvm.createHost({}, _.merge({
            // @todo - get the requires merged with run construction options
            requires: ['lodash', 'crypto-all', 'tv4', 'xml2js', 'atob', 'btoa', 'cheerio', 'backbone', 'buffer'],
            on: {
                exception: function () { // @todo need uvm to bubble up log types and some passed during execute options
                    run.triggers.exception.apply(run.triggers, arguments);
                },
                // @todo this is supposed to fire just critical errors and stop run. but apparently it is firing
                // error even for events that shuld be ideally triggered as exception
                error: function () {
                    run.triggers.exception.apply(run.triggers, arguments);
                },
                console: function () { // @todo need uvm to bubble up log types and some passed during execute options
                    run.triggers.console.apply(run.triggers, arguments);
                }
            }
        }, run.options.host), function (err, host) {
            if (err) { return done(err); }
            // store the host in run object for future use and move on
            run.host = host;
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
                var script = event.script;

                // trigger the "beforeScript" callback
                this.triggers.beforeScript(null, cursor, script, event, item);

                // finally execute the script
                this.host.execute(script.toSource(), {
                    masked: {
                        scriptType: eventName, // @todo TBD should this come as payload?
                        cursor: cursor,
                        stopOnScriptError: stopOnScriptError
                    },
                    // while passing value of ctx, we directly use payload.ctx and not make a local copy to ensure we
                    // have the live copy
                    globals: _.cloneDeep(payload.context)
                }, function (err, result) {
                     // electron IPC does not bubble errors to the browser process, so we serialize it here.
                    err && (err = serialisedError(err, true));

                    // if it is defined that certain variables are to be synced back to result, we do the same
                    track && result && result.globals && track.forEach(function (variable) {
                        _.isObject(result.globals[variable]) &&
                            util.syncObject(payload.context[variable], result.globals[variable]);
                    });

                    // Get the failures. If there was an error running the script itself, that takes precedence
                    if (!err && (abortOnFailure || stopOnFailure)) {
                        err = postProcessContext(result.globals);
                    }
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
