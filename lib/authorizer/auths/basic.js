var _ = require('lodash'),

    /**
     * The Basic Auth method, ensures that the Authorization header is added to the request.
     *
     * @param options
     * @constructor
     *
     * @todo Add support for dynamic realm based signing of the request.
     */
    Basic = function (options) {
        this.options = options;
    };

_.extend(Basic.prototype, {
    /**
     * Initializes a item (fetches all required parameters, etc) before the actual authorization step.
     *
     * @param {Item} item
     * @param {Run} run
     * @param {Requester} requester
     * @param done
     * @todo - add support for prompting a user for basic auth credentials if not already provided
     */
    init: function (item, run, requester, done) {
        done(null);
    },

    /**
     * Verifies whether the request has valid basic auth credentials (which is always).
     *
     * @param {Item} item
     * @param {Run} run
     * @param {Requester} requester
     * @param done
     */
    pre: function (item, run, requester, done) {
        done(null, true);
    },

    /**
     * Verifies whether the basic auth succeeded.
     *
     * @param {Item} item
     * @param {Response} response
     * @param {Run} run
     * @param {Requester} requester
     * @param done
     */
    post: function (item, response, run, requester, done) {
        done(null, true);
    },

    /**
     * Adds a Base64 encoded authorization header.
     *
     * @param {Item} item
     * @param {Run} run
     * @param callback
     */
    sign: function (item, run, callback) {
        item.request = item.request.authorize();
        callback(null);
    }
});

module.exports = Basic;
