var _ = require('lodash'),
    async = require('async'),
    sdk = require('postman-collection'),

    // we need to access tough-cookie if no external cookie jar is provided. however, the `request` module does not work
    // with vanilla tough-cookie and needs a flavour of tough-cookie returned by itself. Hence we depend on
    // `postman-request` here.
    postmanRequest = require('postman-request'),

    prehelpers = require('../request-helpers-presend'),
    posthelpers = require('../request-helpers-postsend'),

    Authorizer = require('../../authorizer').Authorizer,
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

        // Create an authorizer
        Authorizer.create(this.options.authorizer || {}, function (err, authorizer) {
            if (err) { return done(err); }
            this.authorizer = authorizer;
            done();
        }.bind(this));
    },

    // the http trigger is actually directly triggered by the requester
    // todo - figure out whether we should trigger it from here rather than the requester.
    triggers: ['beforeRequest', 'request', 'http'],

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
                replayed = payload._replay,
                self = this;

            // clone the item, which is mutated by all the helpers
            payload._item = new sdk.Item(payload.item.toJSON());

            // in order to ensure that variable resolution works correctly, we set the __parent property,
            // so that the SDK can locate the VariableList in the collection.
            // todo - add a helper function in the sdk to set this.
            _.set(payload._item, '__parent', payload.item.__parent);

            // Run the helper functions
            async.applyEachSeries(prehelpers, payload, self, function (err) {
                if (err) { return next(err); }

                var xhr,
                    item,
                    aborted;

                item = payload._item;

                // Trigger the beforeRequest callback
                // todo: ensure that the correct item and other params are bubbled up
                self.triggers.beforeRequest(null, payload.coords, item.request, payload.item, {
                    abort: function () {
                        !aborted && xhr && xhr.abort();
                        aborted = true;
                    }
                });

                if (aborted) { return next(new Error('runtime: request aborted')); }

                xhr = self.requester.request(item, self.triggers, payload.coords, function (err, res, req, cookies) {
                    err = err || null;

                    var nextPayload = {
                        response: res,
                        request: req,
                        cookies: cookies
                    };

                    if (err) {
                        // trigger the request event.
                        self.triggers.request(err, payload.coords, res, req, payload.item, cookies);

                        // the error is passed twice to allow control between aborting the error vs just
                        // bubbling it up
                        return next((err && abortOnError) ? err : null, nextPayload, err);
                    }

                    // run the post request helpers, which need to use the response.
                    // the response must be given as a part of the payload to ensure API consistency
                    payload._response = res;
                    async.applyEachSeries(posthelpers, payload, self, function (err) {
                        var pload = _.clone(payload);

                        // remove request resolved in this iteration.
                        pload._item && delete (pload._item);

                        if (!replayed && payload._replay) {
                            // queue the request again
                            self.queue('request', pload);
                            return next((err && abortOnError) ? err : null, nextPayload, err);
                        }

                        self.triggers.request(err, payload.coords, res, req, payload.item, cookies);

                        next((err && abortOnError) ? err : null, nextPayload, err);
                    });
                }, self);
            });
        }
    }
};
