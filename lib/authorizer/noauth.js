module.exports = {
    /**
     * Initializes an item (extracts parameters from intermediate requests if any, etc)
     * before the actual authorization step.
     *
     * @param {RequestAuth} auth
     * @param {Response} response
     * @param done
     */
    init: function (auth, response, done) {
        done(null);
    },

    /**
     * Checks whether the given item has all the required parameters in its request.
     * Sanitizes the auth parameters if needed.
     *
     * @param {RequestAuth} auth
     * @param done
     */
    pre: function (auth, done) {
        done(null, true);
    },

    /**
     * Verifies whether the request was successfully authorized after being sent.
     *
     * @param {RequestAuth} auth
     * @param {Response} response
     * @param done
     */
    post: function (auth, response, done) {
        done(null, true);
    },

    /**
     * Signs a request.
     *
     * @param {Object} auth
     * @param {Request} request
     * @param done
     */
    sign: function (auth, request, done) {
        return done();
    }
};
