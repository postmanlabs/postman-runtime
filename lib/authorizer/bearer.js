
var BEARER_AUTH_PREFIX = 'Bearer ';

/**
 * @implements {AuthHandlerInterface}
 */
module.exports = {
    /**
     * @property {AuthHandlerInterface~AuthManifest}
     */
    manifest: {
        info: {
            name: 'bearer',
            version: '1.0.0'
        },
        updates: [
            {
                property: 'Authorization',
                type: 'header'
            }
        ]
    },

    /**
     * Initializes an item (extracts parameters from intermediate requests if any, etc)
     * before the actual authorization step
     *
     * @param {AuthInterface} auth -
     * @param {Response} response -
     * @param {AuthHandlerInterface~authInitHookCallback} done -
     */
    init: function (auth, response, done) {
        done();
    },

    /**
     * Verifies whether the request has required parameters
     *
     * @param {AuthInterface} auth -
     * @param {AuthHandlerInterface~authPreHookCallback} done -
     */
    pre: function (auth, done) {
        return done(null, Boolean(auth.get('token')));
    },

    /**
     * Verifies whether the auth succeeded
     *
     * @param {AuthInterface} auth -
     * @param {Response} response -
     * @param {AuthHandlerInterface~authPostHookCallback} done -
     */
    post: function (auth, response, done) {
        done(null, true);
    },

    /**
     * Signs the request
     *
     * @param {AuthInterface} auth -
     * @param {Request} request -
     * @param {AuthHandlerInterface~authSignHookCallback} done -
     */
    sign: function (auth, request, done) {
        var token = auth.get('token');

        if (!token) {
            return done(); // Nothing to do if required parameters are not present.
        }

        // @TODO Should we support adding to query params and/or body also?
        // According to the RFC#6750 they are supported but not recommended!

        request.removeHeader('Authorization', { ignoreCase: true });
        request.addHeader({
            key: 'Authorization',
            value: BEARER_AUTH_PREFIX + token,
            system: true
        });

        return done();
    }
};
