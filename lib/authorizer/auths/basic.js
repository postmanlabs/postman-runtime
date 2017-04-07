var _ = require('lodash'),

    Basic = function (options) {
        this.options = options;
    };

_.extend(Basic.prototype, {
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
    },

    /**
     * Signs a request based on the authentication parameters.
     *
     * @param item
     * @param run
     * @param callback
     */
    sign: function (item, run, callback) {
        item.request = item.request.authorize();
        callback(null);
    }
});

module.exports = Basic;
