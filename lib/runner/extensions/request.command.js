var _ = require('lodash'),
    async = require('async'),
    sdk = require('postman-collection'),

    // we need to access tough-cookie if no external cookie jar is provided. however, the `request` module does not work
    // with vanilla tough-cookie and needs a flavour of tough-cookie returned by itself. Hence we depend on
    // `postman-request` here.
    postmanRequest = require('postman-request'),

    // These are functions which a request passes through _before_ being sent. They take care of stuff such as
    // variable resolution, loading of files, etc.
    prehelpers = require('../request-helpers-presend'),

    // Similarly, these run after the request, and have the power to dictate whether a request should be re-queued
    posthelpers = require('../request-helpers-postsend'),

    Authorizer = require('../../authorizer').Authorizer,
    Requester = require('../../requester').Requester,

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

        // in order to ensure that variable resolution works correctly, we set the __parent property,
        // so that the SDK can locate the VariableList in the collection.
        parent = payload.item.parent();
        parent && (context.item.setParent(parent));

        return context;
    };

module.exports = {
    init: function (done) {
        var timeout = _.min([
                _.get(this.options, 'timeout.request'),
                _.get(this.options, 'timeout.global')
            ]),
            cookieJar;

        // @todo - remove this when requester creation is offloaded to runner
        if (this.options.requester && this.options.requester.external === true) {
            this.requester = this.options.requester.instance;
            return done();
        }

        !_.isFinite(timeout) && (timeout = undefined);
        cookieJar = _.get(this.options, 'requester.cookieJar');
        if (!cookieJar) {
            cookieJar = postmanRequest.jar();
        }

        // @todo: get requester options and maybe store per-protocol requester
        !this.requester && (this.requester = new Requester(_.merge(this.options.requester || {}, {
            timeout: timeout || undefined,
            cookieJar: cookieJar || undefined
        })));

        // Create an authorizer
        Authorizer.create(this.options.authorizer || {}, function (err, authorizer) {
            if (err) { return done(err); }
            this.authorizer = authorizer;
            done();
        }.bind(this));
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

                    /**
                     * Helper function which calls the beforeRequest trigger.
                     *
                     * @param err
                     */
                    beforeRequest = function (err) {
                        // Trigger the beforeRequest callback
                        // todo: ensure that the correct item and other params are bubbled up
                        !replayed && self.triggers.beforeRequest(err, payload.coords, item.request, payload.item, {
                            abort: function () {
                                !aborted && xhr && xhr.abort();
                                aborted = true;
                            }
                        });
                    },

                    /**
                     * Helper function to call the afterRequest trigger.
                     *
                     * @param err
                     * @param response
                     * @param request
                     * @param cookies
                     */
                    afterRequest = function (err, response, request, cookies) {
                        self.triggers.request(err, payload.coords, response, request, payload.item, cookies);
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

                xhr = self.requester.request(item, self.triggers, context.coords, function (err, res, req, cookies) {
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

                            // the error is passed twice to allow control between aborting the error vs just
                            // bubbling it up
                            return next((err && abortOnError) ? err : null, nextPayload, err);
                        };

                    if (err) {
                        return complete();
                    }

                    // we could have also added the response to the set of responses in the cloned item,
                    // but then, we would have to iterate over all of them, which seems unnecessary
                    context.response = res;

                    // run the post request helpers, which need to use the response, assigned above
                    async.applyEachSeries(posthelpers, context, self, function (err) {
                        var pload;

                        if (!replayed && context.replay) {
                            pload = _.clone(payload);
                            pload.context = context;
                            // queue the request again
                            self.queue('request', pload);
                            return next((err && abortOnError) ? err : null, nextPayload, err);
                        }

                        complete();
                    });
                });
            });
        }
    }
};
