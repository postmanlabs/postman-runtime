module.exports = {
    /**
     * Initializes a item (fetches all required parameters, etc) before the actual authorization step.
     * @todo - add support for prompting a user for basic auth credentials if not already provided
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
     * Verifies whether the basic auth succeeded.
     *
     * @param {RequestContext} context
     * @param {Requester} requester
     * @param done
     */
    post: function (context, requester, done) {
        done(null, true);
    },

    /**
     * Signs a request.
     *
     * @param {Request} request
     * @todo - this should be made into ".sign" after the signature calculation is moved out of the SDK.
     */
    _sign: function (request) {
        return this.authorize(request);
    }
};
