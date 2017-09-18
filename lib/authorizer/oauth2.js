var HEADER = 'header',
    URL = 'url',
    BEARER = 'bearer',
    AUTHORIZATION = 'Authorization',
    AUTHORIZATION_PREFIX = 'Bearer ',
    OAUTH2_PARAMETERS = [
        'accessToken',
        'addTokenTo',
        'tokenType'
    ];

/**
 * @implements {AuthHandlerInterface}
 */
module.exports = {
    /**
     * @property {AuthHandlerInterface~AuthManifest}
     */
    manifest: {
        info: {
            name: 'oauth2',
            version: '1.0.0'
        },
        updates: []
    },

    /**
     * Initializes an item (extracts parameters from intermediate requests if any, etc)
     * before the actual authorization step.
     *
     * @param {AuthInterface} auth
     * @param {Response} response
     * @param {AuthHandlerInterface~authInitHookCallback} done
     */
    init: function (auth, response, done) {
        done(null);
    },

    /**
     * Verifies whether the request has valid basic auth credentials (which is always).
     * Sanitizes the auth parameters if needed.
     *
     * @param {AuthInterface} auth
     * @param {AuthHandlerInterface~authPreHookCallback} done
     */
    pre: function (auth, done) {
        done(null, Boolean(auth.get('accessToken')));
    },

    /**
     * Verifies whether the basic auth succeeded.
     *
     * @param {AuthInterface} auth
     * @param {Response} response
     * @param {AuthHandlerInterface~authPostHookCallback} done
     */
    post: function (auth, response, done) {
        done(null, true);
    },

    /**
     * Signs a request.
     *
     * @param {AuthInterface} auth
     * @param {Request} request
     * @param {AuthHandlerInterface~authSignHookCallback} done
     */
    sign: function (auth, request, done) {
        var params = auth.get(OAUTH2_PARAMETERS);

        if (!params.accessToken) {
            return done(); // Nothing to do if required parameters are not present.
        }

        params.addTokenTo = params.addTokenTo || HEADER;

        // @TODO Add support for HMAC
        if (params.tokenType === BEARER) {
            if (params.addTokenTo === URL) {
                request.addQueryParams({
                    key: 'access_token',
                    value: params.accessToken
                });
            }
            else if (params.addTokenTo === HEADER) {
                request.addHeader({
                    key: AUTHORIZATION,
                    value: AUTHORIZATION_PREFIX + params.accessToken
                });
            }
        }
        return done();
    }
};
