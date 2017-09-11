var _ = require('lodash'),
    async = require('async'),
    uuid = require('uuid'),
    sdk = require('postman-collection'),

    // These are functions which a request passes through _before_ being sent. They take care of stuff such as
    // variable resolution, loading of files, etc.
    prehelpers = require('../request-helpers-presend'),

    // Similarly, these run after the request, and have the power to dictate whether a request should be re-queued
    posthelpers = require('../request-helpers-postsend'),

    ReplayController = require('../replay-controller'),
    RequesterPool = require('../../requester').RequesterPool,

    RESPONSE_DOT = 'response.',

    CONTEXT_PROPERTIES = [
        'data',
        'environment',
        'globals',
        'coords',
        'replayState'
    ],

    /**
     * Creates a request execution context from a given payload.
     *
     * @param payload
     * @returns {Object}
     */
    createContext = function (payload) {
        var context = _.pick(payload, CONTEXT_PROPERTIES),
            item,
            parent;

        // we clone item from the payload, so that we can make any changes we need there, without mutating the
        // collection.
        item = new sdk.Item(payload.item.toJSON());

        // in order to ensure that variable resolution works correctly, we set the __parent property,
        // so that the SDK can locate the VariableList in the collection.
        parent = payload.item.parent();
        parent && (item.setParent(parent));

        // save the cloned item in context
        context.item = item;

        // save original item for reference
        context.originalItem = payload.item;

        // get a reference to the Auth instance from the item, so changes are synced back
        context.auth = context.originalItem.getAuth();

        // adds a unique id to each request being sent over network
        // in cases where one Collection Request can send multiple intermediate requests
        // like a script or auth requests, this id will give fine grained identification
        if (!_.get(payload, 'coords._httpId')) {
            context.coords = _.clone(payload.coords);
            _.set(context, 'coords._httpId', uuid());
        }

        return context;
    };

module.exports = {
    init: function (done) {
        // Request timeouts are applied by the requester, so add them to requester options (if any).

        // create a requester pool
        this.requester = new RequesterPool(this.options);
        done();
    },

    // the http trigger is actually directly triggered by the requester
    // todo - figure out whether we should trigger it from here rather than the requester.
    triggers: ['beforeRequest', 'request', 'io'],

    process: {
        /**
         * @param {Object} payload
         * @param {Item} payload.item
         * @param {Object} payload.data
         * @param {Object} payload.context
         * @param {VariableScope} payload.globals
         * @param {VariableScope} payload.environment
         * @param {Cursor} payload.coords
         * @param {Boolean} payload.abortOnError
         * @param {Function} next
         *
         * @todo  validate payload
         */
        httpRequest: function (payload, next) {
            var abortOnError = _.has(payload, 'abortOnError') ? payload.abortOnError : this.options.abortOnError,
                self = this,
                context;

            /**
             * @type {Object}
             * @property {Item} item -  Holds a copy of the item given in the payload, so that it can be manipulated
             * as necessary
             * @property {RequestAuthBase|undefined} auth - If present, is the instance of Auth in the collection, which
             * is changed as necessary using intermediate requests, etc.
             * @property {VariableScope} environment
             * @property {VariableScope} globals
             * @property {Object} data
             * @property {ReplayState} replayState - has context on number of replays(if any) for this request
             */
            context = createContext(payload);

            // Run the helper functions
            async.applyEachSeries(prehelpers, context, self, function (err) {
                var xhr,
                    aborted,
                    item = context.item,
                    beforeRequest,
                    afterRequest;

                // Helper function which calls the beforeRequest trigger ()
                beforeRequest = function (err) {
                    self.triggers.beforeRequest(err, context.coords, item.request, payload.item, {
                        abort: function () {
                            !aborted && xhr && xhr.abort();
                            aborted = true;
                        }
                    });
                };

                // Helper function to call the afterRequest trigger.
                afterRequest = function (err, response, request, cookies) {
                    self.triggers.request(err, context.coords, response, request, payload.item, cookies);
                };

                // Ensure that this is called.
                beforeRequest(null);

                if (err) {
                    // Since we encountered an error before even attempting to send the request, we bubble it up
                    // here.
                    afterRequest(err, undefined, item.request);
                    return next((err && abortOnError) ? err : null, {
                        request: item.request
                    }, err);
                }

                if (aborted) {
                    return next(new Error('runtime: request aborted'));
                }

                self.requester.create(context.trace || {
                    type: 'http',
                    source: context.coords._source || 'collection',
                    cursor: context.coords
                }, function (err, requester) {
                    if (err) { return next(err); } // this should never happen

                    var sendId = RESPONSE_DOT + uuid();

                    requester.on(sendId, self.triggers.io.bind(self.triggers));

                    xhr = requester.request(sendId, item.request, function (err, res, req, cookies) {
                        err = err || null;

                        var nextPayload = {
                                response: res,
                                request: req,
                                cookies: cookies
                            },

                            // finish up current command
                            safeNext = function (error) {
                                // the error is passed twice to allow control between aborting the error vs just
                                // bubbling it up
                                return next((error && abortOnError) ? error : null, nextPayload, error);
                            },

                            // called when we want to complete this request.
                            complete = function (error, options) {
                                var replayController;

                                // trigger the request event.
                                // @note -  we give the _original_ item in this trigger, so someone can do reference
                                //          checking. Not sure if we should do that or not, but that's how it is.
                                //          Don't break it.
                                afterRequest(error, res, req, cookies);

                                // Dispose off the requester, we don't need it anymore.
                                requester.dispose();

                                // do not process replays if there was an error
                                if (error) { return safeNext(error); }

                                // request replay logic
                                if (options && options.replay) {
                                    // prepare for replay
                                    replayController = new ReplayController(context.replayState, self);

                                    // bubble up error and proceed for both success and error cases
                                    return replayController.requestReplay(context, context.item, safeNext, safeNext);
                                }

                                // finish up for any other request
                                return safeNext(error);
                            };

                        if (err) {
                            return complete(err); // complete handles the error, it's not a callback.
                        }

                        // we could have also added the response to the set of responses in the cloned item,
                        // but then, we would have to iterate over all of them, which seems unnecessary
                        context.response = res;

                        // run the post request helpers, which need to use the response, assigned above
                        async.applyEachSeries(posthelpers, context, self, function (error, options) {

                            /**
                             * This allows adjusting request flows post processing helpers, like replays etc.
                             *
                             * @type {Object}
                             *
                             * @param {?Boolean} replay
                             */
                            var finalOptions = _.reduce(options, function (accumulator, helperOptions) {
                                // combine options from each post helper
                                return _.merge(accumulator, helperOptions);
                            }, {});

                            // bubbling up any errors in post helpers
                            complete(error, finalOptions);
                        });
                    });
                });
            });
        }
    }
};
