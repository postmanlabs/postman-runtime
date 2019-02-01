var _ = require('lodash'),

    HEADER = 'header',
    QUERY_PARAMS = 'queryParams',
    BEARER = 'bearer',
    AUTHORIZATION = 'Authorization',
    ACCESS_TOKEN = 'access_token',
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
        updates: [
            {
                property: AUTHORIZATION,
                type: 'header'
            },
            {
                property: ACCESS_TOKEN,
                type: 'url.param'
            }
        ]
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
        var params = auth.get(OAUTH2_PARAMETERS),
            tokenType;

        // Validation
        if (!params.accessToken) {
            return done(); // Nothing to do if required parameters are not present.
        }

        // Defaults
        params.addTokenTo = params.addTokenTo || HEADER; // Add token to header by default
        params.tokenType = params.tokenType || BEARER; // Use `Bearer` token type by default

        // Some servers send 'Bearer' while others send 'bearer'
        tokenType = _.toLower(params.tokenType);

        // @TODO Add support for HMAC
        if (tokenType === BEARER) {
            // clean conflicting headers and query params
            // @todo: we should be able to get conflicting params from auth manifest
            // and clear them before the sign step for any auth
            request.removeHeader(AUTHORIZATION, {ignoreCase: true});
            request.removeQueryParams([ACCESS_TOKEN]);

            if (params.addTokenTo === QUERY_PARAMS) {
                request.addQueryParams({
                    key: ACCESS_TOKEN,
                    value: params.accessToken,
                    system: true
                });
            }
            else if (params.addTokenTo === HEADER) {
                request.addHeader({
                    key: AUTHORIZATION,
                    value: AUTHORIZATION_PREFIX + params.accessToken,
                    system: true
                });
            }
        }

        return done();
    }
};
