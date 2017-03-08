var _ = require('lodash'),
    async = require('async'),
    sdk = require('postman-collection'),

    // we need to access tough-cookie if no external cookie jar is provided. however, the `request` module does not work
    // with vanilla tough-cookie and needs a flavour of tough-cookie returned by itself. Hence we depend on
    // `postman-request` here.
    postmanRequest = require('postman-request'),

    helpers = require('../pre'),

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
            // Just so we don't break the App, pull the file resolver out of the requester
            this.options.fileResolver = _.get(this.requester, 'fileResolver');
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

    triggers: ['beforeRequest', 'request'],

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

            async.waterfall([
                // Run the helper functions
                // todo - move this to the right place
                function (cb) {
                    async.series(
                        // binds each helper to self, and adds a default first parameter of "payload"
                        // todo - update eslint to not groan if we don't use invokeMap.
                        _.invokeMap(helpers, Function.prototype.bind, self, payload),
                        function (err) { // swallow up the second argument here
                            cb(err);
                        }
                    );
                },
                // Send the request
                function (cb) {
                    var xhr,
                        item,
                        aborted;

                    item = payload.item;

                    // Trigger the beforeRequest callback
                    // todo: ensure that the correct item and other params are bubbled up
                    self.triggers.beforeRequest(null, payload.coords, item.request, payload.item, {
                        abort: function () {
                            !aborted && xhr && xhr.abort();
                            aborted = true;
                        }
                    });

                    if (aborted) {
                        return cb(new Error('runtime: request aborted'));
                    }

                    xhr = self.requester.request(item, cb, self);
                }
            ], function (err, legacyResponse, legacyRequest, response) {
                err = err || null;

                var item = payload.item;

                // todo: ensure that the correct item and other params are bubbled up
                this.triggers.request(err, payload.coords, new sdk.Response(response),
                    item.request, payload.item,
                    // todo: remove these asap
                    legacyResponse, legacyRequest);

                next((err && abortOnError) ? err : null, {
                    response: response,
                    request: item.request,
                    legacyResponse: legacyResponse,
                    legacyRequest: legacyRequest
                }, err);
            }.bind(this));
        }
    }
};
