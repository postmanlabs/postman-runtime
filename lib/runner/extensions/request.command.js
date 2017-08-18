var _ = require('lodash'),
    async = require('async'),
    uuid = require('uuid'),
    sdk = require('postman-collection'),

    // These are functions which a request passes through _before_ being sent. They take care of stuff such as
    // variable resolution, loading of files, etc.
    prehelpers = require('../request-helpers-presend'),

    // Similarly, these run after the request, and have the power to dictate whether a request should be re-queued
    posthelpers = require('../request-helpers-postsend'),

    Authorizer = require('../../authorizer').Authorizer,
    RequesterPool = require('../../requester').RequesterPool,

    RESPONSE_DOT = 'response.',

    CONTEXT_PROPERTIES = [
        'data',
        'environment',
        'globals',
        'coords'
    ],

    /**
     * Creates a request execution context from a given payload.
     *
     * @param payload
     * @returns {Object}
     */
    createContext = function (payload) {
        var context = payload.context ? payload.context : _.pick(payload, CONTEXT_PROPERTIES),
            parent;

        // get a reference to the Auth instance from the original item, so any changes don't have to be synced back
        context.auth = payload.item.getAuth();

        // if an item is not provided in the context, clone the one from the payload,
        // so that we can make any changes we need there, without mutating the collection.
        context.item = context.item || new sdk.Item(payload.item.toJSON());

        if (!_.get(payload, 'coords._httpId')) {
            context.coords = _.clone(payload.coords);
            _.set(context, 'coords._httpId', uuid());
        }

        // in order to ensure that variable resolution works correctly, we set the __parent property,
        // so that the SDK can locate the VariableList in the collection.
        parent = payload.item.parent();
        parent && (context.item.setParent(parent));

        return context;
    };

module.exports = {
    init: function (done) {
        // Request timeouts are applied by the requester, so add them to requester options (if any).
        var self = this;

        // create a requester pool
        self.requester = new RequesterPool(self.options);

        // Create an authorizer
        Authorizer.create(self.options.authorizer || {}, function (err, authorizer) {
            if (err) { return done(err); }
            self.authorizer = authorizer;
            done();
        });
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
        request: function (payload, next) {
            var abortOnError = _.has(payload, 'abortOnError') ? payload.abortOnError : this.options.abortOnError,
                self = this,
                replayed,
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
             * @property {Boolean} replay - Indicates whether this request a replayed request
             */
            context = createContext(payload);
            replayed = context.replay;

            // Run the helper functions
            async.applyEachSeries(prehelpers, context, self, function (err) {
                var xhr,
                    aborted,
                    item = context.item,
                    beforeRequest,
                    afterRequest;

                // Helper function which calls the beforeRequest trigger ()
                beforeRequest = function (err) {
                    !replayed && self.triggers.beforeRequest(err, context.coords, item.request, payload.item, {
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

                if (aborted) { return next(new Error('runtime: request aborted')); }

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

                            // called when we want to complete this request.
                            complete = function () {
                                // trigger the request event.
                                // @note -  we give the _original_ item in this trigger, so someone can do reference
                                //          checking. Not sure if we should do that or not, but that's how it is.
                                //          Don't break it.
                                afterRequest(err, res, req, cookies);

                                // Dispose off the requester, we don't need it anymore.
                                requester.dispose();

                                // the error is passed twice to allow control between aborting the error vs just
                                // bubbling it up
                                return next((err && abortOnError) ? err : null, nextPayload, err);
                            };

                        if (err) {
                            return complete(); // complete handles the error, it's not a callback.
                        }

                        // we could have also added the response to the set of responses in the cloned item,
                        // but then, we would have to iterate over all of them, which seems unnecessary
                        context.response = res;

                        // run the post request helpers, which need to use the response, assigned above
                        async.applyEachSeries(posthelpers, context, self, function (err) {
                            var pload;

                            if (context.replay) {
                                pload = _.clone(payload);
                                pload.context = context;
                                // queue the request again
                                self.interrupt('request', pload);
                                return next((err && abortOnError) ? err : null, nextPayload, err);
                            }

                            complete();
                        });
                    });
                });
            });
        }
    }
};
