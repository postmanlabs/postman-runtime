var _ = require('lodash'),
    async = require('async'),
    FormParam = require('postman-collection').FormParam,
    CollectionItem = require('postman-collection').Item,
    CollectionResponse = require('postman-collection').Response,
    Requester = require('../../requester').Requester,
    util = require('../util'),

    /**
     * Takes a list for Form-data parameters, and "resolve"s them.
     *
     * @param {PropertyList} parameters
     * @param resolver
     * @param callback
     */
    resolveFiles = function (parameters, resolver, callback) {
        var params = parameters.all();

        async.map(parameters, function (param, cb) {
            var isFile = (param.type === 'file' && param.src);

            if (isFile && !resolver) {
                self.triggers.exception('Unable to load from file: ', param.src);
                return cb(); // ensure that we don't accidentally return false, since triggers are user provided
            }

            cb(null, )
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
            var item = new CollectionItem(payload.item.toObjectResolved(null,
                [payload.data, payload.environment, payload.globals])),

                abortOnError = _.has(payload, 'abortOnError') ? payload.abortOnError : this.options.abortOnError,
                self = this;

            async.waterfall([
                // Process any authentication helpers in the request.
                function (cb) {
                    cb(null, item.request.authorize());
                }.bind(this),
                // Handle file resolution
                function (request, cb) {
                    var formParams = _.get(request, 'body.formdata'),
                        resolver = _.get(self.options, 'requester.fileResolver'),
                        resolvedParams;

                    if (!formParams) {
                        return cb(request);
                    }


                    resolvedParams = _.transform(formParams.filter(function (param) {
                        return
                    }), function (accumulator, param) {

                        if (!resolver) {
                        }
                        param.value = resolver.createReadStream(param.src);
                    }, [])
                }.bind(this)

            ], function (err, legacyResponse, legacyRequest, response) {
                err = err || null;

                this.triggers.request(err, payload.coords, new CollectionResponse(response),
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
            item.request = item.request.authorize();

            this.triggers.beforeRequest(null, payload.coords, item.request, payload.item);

            this.requester.request(item, function (err, legacyResponse, legacyRequest, response) {
                err = err || null;

                this.triggers.request(err, payload.coords, new CollectionResponse(response),
                    item.request, payload.item,
                    // todo: remove these asap
                    legacyResponse, legacyRequest);

                next((err && this.options.abortOnError) ? err : null, {
                    response: response,
                    request: item.request,
                    legacyResponse: legacyResponse,
                    legacyRequest: legacyRequest
                }, err);
            }, this);
        }
    }
};
