/**
 * @implements {AuthHandlerInterface}
 */
module.exports = {
    /**
     * Initializes an item (extracts parameters from intermediate requests if any, etc)
     * before the actual authorization step.
     *
     * @param {AuthInterface} auth
     * @param {Response} response
     * @param {authInitHookCallback} done
     */
    init: function (auth, response, done) {
        done(null);
    },

    /**
     * Verifies whether the request has valid basic auth credentials (which is always).
     * Sanitizes the auth parameters if needed.
     *
     * @param {AuthInterface} auth
     * @param {authPreHookCallback} done
     */
    pre: function (auth, done) {
        done(null, true);
    },

    /**
     * Verifies whether the basic auth succeeded.
     *
     * @param {AuthInterface} auth
     * @param {Response} response
     * @param {authPostHookCallback} done
     */
    post: function (auth, response, done) {
        done(null, true);
    },

    /**
     * Signs a request.
     *
     * @param {AuthInterface} auth
     * @param {Request} request
     * @param {authSignHookCallback} done
     */
    sign: function (auth, request, done) {
        return done();
    }
};
