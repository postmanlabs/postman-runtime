var _ = require('lodash'),

    HEADER = 'header',
    QUERY_PARAMS = 'queryParams',
    BEARER = 'bearer',
    MAC = 'mac',
    AUTHORIZATION = 'Authorization',
    ACCESS_TOKEN = 'access_token',
    AUTHORIZATION_PREFIX = 'Bearer',
    OAUTH2_PARAMETERS = [
        'accessToken',
        'addTokenTo',
        'tokenType',
        'headerPrefix'
    ],
    REFRESH_TOKEN_TIMEOUT_MS = 30000;

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
     * @param {AuthInterface} auth -
     * @param {Response} response -
     * @param {AuthHandlerInterface~authInitHookCallback} done -
     */
    init: function (auth, response, done) {
        done(null);
    },

    /**
     * Verifies whether the request has valid basic auth credentials (which is always).
     * Sanitizes the auth parameters if needed.
     *
     * @param {AuthInterface} auth -
     * @param {AuthHandlerInterface~authPreHookCallback} done -
     */
    pre: function (auth, done) {
        const authId = auth.get('authId'),
            refreshTokenHelper = auth.get('refreshTokenHelper');

        // Go into the refresh token flow ONLY IF we have all necessary information present
        if (authId && refreshTokenHelper && _.isFunction(refreshTokenHelper.refreshToken)) {
            const refreshTokenPromise = refreshTokenHelper.refreshToken(authId);

            return Promise.race([
                refreshTokenPromise,
                new Promise((resolve) => {
                    // We add a timeout to the refresh token promise to ensure that the request is not
                    // hung up on the refresh token call. If the refresh token call takes more than
                    // REFRESH_TOKEN_TIMEOUT_MS, we abandon and move forward with the execution.
                    setTimeout(() => {
                        return resolve();
                    }, REFRESH_TOKEN_TIMEOUT_MS);
                })
            ]).then((accessToken) => {
                accessToken && auth.set('accessToken', accessToken, true);
            }).catch(() => {
                // do nothing, we throw an error from app when refresh fails
                // ? TODO: should we throw an error here? app handles logging to console
                // ? anyway
            }).finally(() => {
                done(null, Boolean(auth.get('accessToken')));
            });
        }

        done(null, Boolean(auth.get('accessToken')));
    },

    /**
     * Verifies whether the basic auth succeeded.
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
        var params = auth.get(OAUTH2_PARAMETERS),
            tokenType;

        // Validation
        if (!params.accessToken) {
            return done(); // Nothing to do if required parameters are not present.
        }

        // Defaults
        params.addTokenTo = params.addTokenTo || HEADER; // Add token to header by default
        params.tokenType = params.tokenType || BEARER; // Use `Bearer` token type by default
        params.headerPrefix = _.isNil(params.headerPrefix) ?
            AUTHORIZATION_PREFIX : _.trim(String(params.headerPrefix));

        // add a space after prefix only if there is any prefix
        params.headerPrefix && (params.headerPrefix += ' ');

        // Some servers send 'Bearer' while others send 'bearer'
        tokenType = _.toLower(params.tokenType);

        // @TODO Add support for HMAC
        if (tokenType === MAC) {
            return done();
        }

        // treat every token types (other than MAC) as bearer token

        // clean conflicting headers and query params
        // @todo: we should be able to get conflicting params from auth manifest
        // and clear them before the sign step for any auth
        request.removeHeader(AUTHORIZATION, { ignoreCase: true });
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
                value: params.headerPrefix + params.accessToken,
                system: true
            });
        }

        return done();
    }
};
