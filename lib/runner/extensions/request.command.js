var _ = require('lodash'),
    async = require('async'),
    sdk = require('postman-collection'),

    // we need to access tough-cookie if no external cookie jar is provided. however, the `request` module does not work
    // with vanilla tough-cookie and needs a flavour of tough-cookie returned by itself. Hence we depend on
    // `postman-request` here.
    postmanRequest = require('postman-request'),

    helpers = require('../request-helpers'),

    Requester = require('../../requester').Requester;

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

        done();
    },

    triggers: ['beforeRequest', 'request', 'io'],

    process: {
        /**
         * @param {Object} payload
         * @param {Item} payload.item
         * @param {Object} payload.data
         * @param {VariableScope} payload.globals
         * @param {VariableScope} payload.environment
         * @param {Cursor} payload.coords
         * @param {Function} next
         *
         * @todo  validate payload
         */
        request: function (payload, next) {
            var abortOnError = _.has(payload, 'abortOnError') ? payload.abortOnError : this.options.abortOnError,
                self = this;

            // clone the item, which is mutated by all the helpers
            payload._item = new sdk.Item(payload.item.toJSON());

            // in order to ensure that variable resolution works correctly, we set the __parent property,
            // so that the SDK can locate the VariableList in the collection.
            // todo - add a helper function in the sdk to set this.
            _.set(payload._item, '__parent', payload.item.__parent);

            // Run the helper functions
            async.applyEachSeries(helpers, payload, self, function (err) {
                var xhr,
                    aborted,
                    item = payload._item,

                    /**
                     * Helper function which calls the beforeRequest trigger.
                     *
                     * @param err
                     */
                    beforeRequest = function (err) {
                        // Trigger the beforeRequest callback
                        // todo: ensure that the correct item and other params are bubbled up
                        self.triggers.beforeRequest(err, payload.coords, item.request, payload.item, {
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

                xhr = self.requester.request(item, self.triggers, payload.coords, function (err, res, req, cookies) {
                    err = err || null;

                    afterRequest(err, res, req, cookies);

                    next((err && abortOnError) ? err : null, {
                        response: res,
                        request: req,
                        cookies: cookies
                    }, err);
                }, self);
            });
        }
    }
};
