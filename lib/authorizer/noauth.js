module.exports = {
    /**
     * Indicates whether this auth type is interactive.
     *
     * @type {Boolean}
     */
    interactive: false,

    /**
     * Initializes a item (fetches all required parameters, etc) before the actual authorization step.
     *
     * @param {RequestContext} context
     * @param {Requester} requester
     * @param done
     */
    init: function (context, requester, done) {
        done(null);
    },

    /**
     * Verifies whether the request has valid basic auth credentials (which is always).
     *
     * @param {RequestContext} context
     * @param {Requester} requester
     * @param done
     */
    pre: function (context, requester, done) {
        done(null, true);
    },

    /**
     * Verifies whether the no auth succeeded. (Which means, does nothing.)
     *
     * @param {RequestContext} context
     * @param {Requester} requester
     * @param done
     */
    post: function (context, requester, done) {
        done(null, true);
    }
};
