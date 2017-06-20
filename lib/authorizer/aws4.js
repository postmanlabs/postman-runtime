module.exports = {
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
     * Checks the item, and fetches any parameters that are not already provided.
     *
     * @param {RequestContext} context
     * @param {Requester} requester
     * @param done
     */
    pre: function (context, requester, done) {
        done(null, true);
    },

    /**
     * Verifies whether the request was successful after being sent.
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
