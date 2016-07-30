var _ = require('lodash'),
    async = require('async'),
    sdk = require('postman-collection'),
    Requester = require('../../requester').Requester,

    /**
     * Takes a list for Form-data parameters, and "resolve"s them.
     *
     * @param request
     * @param resolver
     * @param triggers
     * @param {Function} triggers.exception
     * @param callback
     */
    resolveFiles = function (request, resolver, triggers, callback) {
        var formParams = _.get(request, 'body.formdata');

        if (!formParams) { return callback(null, request); }

        async.reduce(formParams.all(), [], function (list, param, cb) {
            var isFile = (param.type === 'file');

            if (isFile && !(resolver && _.isFunction(resolver.createReadStream))) {
                triggers.console('warn', 'Unable to load file for upload: ' + param.src);
                return cb(null, list);
            }

            list.push({
                key: param.key,
                value: isFile ? resolver.createReadStream(param.src) : param.value,
                type: param.type,
                src: param.src
            });
            return cb(null, list);
        }, function (err, results) {
            if (err) { return callback(err); }

            request.body.formdata = new sdk.PropertyList(sdk.FormParam, request, results);
            return callback(null, request);
        });
    };

module.exports = {
    init: function (done) {
        var timeout = _.min([
            _.get(this.options, 'timeout.request'),
            _.get(this.options, 'timeout.global')
        ]);


        // @todo - remove this when requester creation is offloaded to runner
        if (this.options.requester && this.options.requester.external === true) {
            this.requester = this.options.requester.instance;
            // Just so we don't break the App, pull the file resolver out of the requester
            this.options.fileResolver = _.get(this.requester, 'fileResolver');
            return done();
        }

        !_.isFinite(timeout) && (timeout = undefined);

        // @todo: get requester options and maybe store per-protocol requester
        !this.requester && (this.requester = new Requester(_.merge(this.options.requester, {
            timeout: timeout || undefined
        })));

        done();
    },

    triggers: ['beforeRequest', 'request'],

    process: {
        /**
         * @param {Object} payload
         * @param {Item} payload.item
         * @param {Object} payload.data
         * @param {Object} payload.globals
         * @param {Object} payload.environment
         * @param {Cursor} payload.coords
         * @param {Function} next
         *
         * @todo  validate payload
         */
        request: function (payload, next) {
            // @todo - resolve variables in a more graceful way
            var item = new sdk.Item(payload.item.toObjectResolved(null,
                [payload.data, payload.environment, payload.globals])),

                abortOnError = _.has(payload, 'abortOnError') ? payload.abortOnError : this.options.abortOnError,
                self = this;

            async.waterfall([
                // Process any authentication helpers in the request.
                function (cb) {
                    cb(null, item.request.authorize());
                },
                // Handle file resolution
                function (request, cb) {
                    var resolver = _.get(self.options, 'fileResolver') ||
                            // todo: remove this once apps give the options correctly
                            _.get(self.options, 'requester.fileResolver');
                    resolveFiles(request, resolver, self.triggers, cb);
                },
                // Send the request
                function (request, cb) {
                    var xhr,
                        aborted;

                    item.request = request;

                    // Trigger the beforeRequest callback
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

                this.triggers.request(err, payload.coords, new sdk.Response(response),
                    item.request, payload.item,
                    // todo: remove these asap
                    legacyResponse, legacyRequest);

                next((err && this.options.abortOnError) ? err : null, {
                    response: response,
                    request: item.request,
                    legacyResponse: legacyResponse,
                    legacyRequest: legacyRequest
                }, err);
            }.bind(this));
        }
    }
};
