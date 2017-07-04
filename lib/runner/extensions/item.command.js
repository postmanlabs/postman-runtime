var _ = require('lodash'),
    uuid = require('uuid');

/**
 * Add options
 * stopOnError:Boolean
 * @type {Object}
 */
module.exports = {
    init: function (done) {
        // @todo - code item global timeout and delay here
        done();
    },

    triggers: ['beforeItem', 'item', 'beforePrerequest', 'prerequest', 'beforeTest', 'test'],

    process: {
        /**
         * @param {Function=} callback
         * @param {Object} payload
         * @param {Function} next
         * @todo  validate payload
         */
        item: function (callback, payload, next) {
            // adjust for polymorphic instructions
            if (!next && _.isFunction(payload) && !_.isFunction(callback)) {
                next = payload;
                payload = callback;
                callback = null;
            }

            var item = payload.item,
                coords = payload.coords,
                data = _.isObject(payload.data) ? payload.data : {},
                environment = _.isObject(payload.environment) ? payload.environment : {},
                globals = _.isObject(payload.globals) ? payload.globals : {},
                stopOnError = _.has(payload, 'stopOnError') ? payload.stopOnError : this.options.stopOnError,

                // @todo: this is mostly coded in event extension and we are still not sure whether that is the right
                // place for it to be.
                abortOnFailure = this.options.abortOnFailure,
                stopOnFailure = this.options.stopOnFailure,
                delay = _.get(this.options, 'delay.item'),

                ctxTemplate;

            // validate minimum parameters required for the command to work
            if (!(item && coords)) {
                return next(new Error('runtime: item execution is missing required parameters'));
            }

            // store a common uuid in the coords
            coords.ref = uuid.v4();

            // here we code to queue prerequest script, then make a request and then execute test script
            this.triggers.beforeItem(null, coords, item);

            this.queueDelay(function () {
                // create the context object for scripts to run
                ctxTemplate = {
                    globals: globals,
                    environment: environment,
                    data: data,
                    request: item.request
                };

                // @todo make it less nested by coding Instruction.thenQueue
                this.queue('event', {
                    name: 'prerequest',
                    item: item,
                    coords: coords,
                    context: ctxTemplate,
                    trackContext: ['globals', 'environment'],
                    stopOnScriptError: stopOnError,
                    stopOnFailure: stopOnFailure
                }).done(function (prereqExecutions, prereqExecutionError) {
                    // if stop on error is marked and script executions had an error, we do not proceed with more commands,
                    // instead we bail out
                    if ((stopOnError || stopOnFailure) && prereqExecutionError) {
                        this.triggers.item(null, coords, item); // @todo - should this trigger receive error?
                        return callback && callback.call(this, prereqExecutionError, {
                            prerequest: prereqExecutions
                        });
                    }

                    this.queue('request', {
                        item: item,
                        globals: ctxTemplate.globals,
                        environment: ctxTemplate.environment,
                        data: ctxTemplate.data,
                        coords: coords
                    }).done(function (result, requestError) {
                        !result && (result = {});

                        var request = result.request,
                            response = result.response,
                            cookies = result.cookies;

                        if ((stopOnError || stopOnFailure) && requestError) {
                            this.triggers.item(null, coords, item); // @todo - should this trigger receive error?
                            return callback && callback.call(this, requestError, {
                                request: request
                            });
                        }

                        // also the test object requires the updated request object (since auth helpers may modify it)
                        request && (ctxTemplate.request = request);
                        response && (ctxTemplate.response = response);
                        cookies && (ctxTemplate.cookies = cookies);

                        // the context template also has a test object to store assertions
                        ctxTemplate.tests = {}; // @todo remove

                        this.queue('event', {
                            name: 'test',
                            item: item,
                            coords: coords,
                            context: ctxTemplate,
                            trackContext: ['tests', 'globals', 'environment'],
                            stopOnScriptError: stopOnError,
                            abortOnFailure: abortOnFailure,
                            stopOnFailure: stopOnFailure
                        }).done(function (testExecutions, testExecutionError) {
                            // trigger an event saying that item has been processed
                            this.triggers.item(null, coords, item); // @todo - should this trigger receive error?
                            callback && callback.call(this, ((stopOnError || stopOnFailure) && testExecutionError) ?
                                testExecutionError : null, {
                                prerequest: prereqExecutions,
                                request: request,
                                response: response,
                                test: testExecutions
                            });
                        });
                    });
                });
            }.bind(this), {
                time: delay,
                source: 'item',
                cursor: coords
            }, next);
        }
    }
};
