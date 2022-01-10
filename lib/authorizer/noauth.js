/**
 * @implements {AuthHandlerInterface}
 */
module.exports = {
    /**
     * @property {AuthHandlerInterface~AuthManifest}
     * @todo runtime needs to make sure AuthHandler
     * cannot mutate any property on Request that it has not declared on the manifest.
     */
    manifest: {
        info: {
            name: 'noauth',
            version: '1.0.0'
        },
        updates: []
    },

    /**
     * Initializes an item (extracts parameters from intermediate requests if any, etc)
     * before the actual authorization step.
     *
     * @param {AuthInterface} auth -
     * @param {Response} response -
     * @param {AuthHandlerInterface~authInitHookCallback} done -
     */
    init: function (auth, response, done) {
        done(null);
    },

    /**
     * Checks whether the given item has all the required parameters in its request.
     * Sanitizes the auth parameters if needed.
     *
     * @param {AuthInterface} auth -
     * @param {AuthHandlerInterface~authPreHookCallback} done -
     */
    pre: function (auth, done) {
        done(null, true);
    },

    /**
     * Verifies whether the request was successfully authorized after being sent.
     *
     * @param {AuthInterface} auth -
     * @param {Response} response -
     * @param {AuthHandlerInterface~authPostHookCallback} done -
     */
    post: function (auth, response, done) {
        done(null, true);
    },

    /**
     * Signs a request.
     *
     * @param {AuthInterface} auth -
     * @param {Request} request -
     * @param {AuthHandlerInterface~authSignHookCallback} done -
     */
    sign: function (auth, request, done) {
        return done();
    }
};
