var _ = require('lodash'),
    sdk = require('postman-collection'),

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
     *
     * @param {Request} item
     * @param run
     * @param requester
     * @param done
     */
    pre: function (item, run, requester, done) {
        done(null, true);
    },

    post: function (item, run, requester, done) {
        done(new Error('authorizer: base auth does not implement post-processor'));
    },
});

module.exports = BasicAuth;
