var _ = require('lodash'),

    BasicAuth = function (options) {
        this.options = options;
    };

_.extend(BasicAuth.prototype, {

    /**
     * The parameters that may be fetched dynamically.
     *
     * @type {Array}
     */
    dynamicParameters: ['realm', 'nonce'],

    /**
     * Initializes a item (fetches all required parameters, etc) before the actual authorization step.
     *
     * @param item
     * @param run
     * @param requester
     * @param done
     */
    init: function (item, run, requester, done) {
        done(null);
    },

    /**
     * Verifies whether the request has valid basic auth (which is always).
     *
     * @param {Request} item
     * @param run
     * @param requester
     * @param done
     */
    pre: function (item, run, requester, done) {
        done(null, true);
    },

    /**
     * Verifies whether the basic auth succeeded.
     *
     * @param item
     * @param response
     * @param run
     * @param requester
     * @param done
     */
    post: function (item, response, run, requester, done) {
        done(null, true);
    }
});

module.exports = BasicAuth;
