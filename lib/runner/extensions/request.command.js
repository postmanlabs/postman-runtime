var _ = require('lodash'),
    CollectionItem = require('postman-collection').Item,
    CollectionResponse = require('postman-collection').Response,
    Requester = require('../../requester').Requester,
    util = require('../util');

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
        !this.requester && (this.requester = new Requester({
            timeout: timeout || undefined
        }));

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
                [payload.data, payload.environment, payload.globals]));

            // Process any authentication helpers in the request.
            item.request = item.request.authorize();

            this.triggers.beforeRequest(null, payload.coords, item.request, payload.item);

            this.requester.request(item, function (err, legacyResponse, legacyRequest, response) {
                err = err || null;

                this.triggers.request(err, payload.coords, new CollectionResponse(response), 
                        item.request, payload.item,
                    // todo: remove these asap
                    legacyResponse, legacyRequest);
                next(err, legacyResponse, legacyRequest, response);
            }, this);
        }
    }
};
