const _ = require('lodash'),
    jwt = require('jsonwebtoken'),

    // jwt key constants
    BEARER_AUTH_PREFIX = 'Bearer',
    AUTH_KEYS = {
        ALGORITHM: 'algorithm',
        HEADER: 'header',
        HEADER_ALGORITHM: 'alg',
        PAYLOAD: 'payload',
        SECRET: 'secret',
        IS_SECRET_BASE_64_ENCODED: 'isSecretBase64Encoded',
        PRIVATE_KEY: 'privateKey',
        PASSPHRASE: 'passphrase',
        ADD_TOKEN_TO: 'addTokenTo',
        HEADER_PREFIX: 'headerPrefix',
        QUERY_PARAM_KEY: 'queryParamKey'
    },

    ADD_TOKEN_TO_TARGETS = {
        HEADER: 'header',
        QUERY_PARAM: 'queryParam'
    },
    AUTHORIZATION = 'Authorization',
    BASE64 = 'base64',
    ASCII = 'ascii',
    SPACE = ' ',

    // HS Algorithms
    HS_ALGORITHMS = {
        HS256: 'HS256',
        HS384: 'HS384',
        HS512: 'HS512'
    },

    // algorithms supported
    ALGORITHMS_SUPPORTED = {
        ...HS_ALGORITHMS,
        RS256: 'RS256',
        RS384: 'RS384',
        RS512: 'RS512',
        PS256: 'PS256',
        PS384: 'PS384',
        PS512: 'PS512',
        ES256: 'ES256',
        ES384: 'ES384',
        ES512: 'ES512'
    };

/**
 * add the JWT Token to the request in auth header or query param
 *
 * @param {AuthInterface} auth - auth
 * @param {Request} request - request
 * @param {string} jwtToken - base64encoded jwt token
 */
function addTokenToRequest (auth, request, jwtToken) {
    const addTokenTo = auth.get(AUTH_KEYS.ADD_TOKEN_TO) || ADD_TOKEN_TO_TARGETS.HEADER,
        queryParamKey = auth.get(AUTH_KEYS.QUERY_PARAM_KEY),
        headerPrefix = auth.get(AUTH_KEYS.HEADER_PREFIX);

    if (addTokenTo === ADD_TOKEN_TO_TARGETS.HEADER) {
        request.removeHeader(AUTHORIZATION, { ignoreCase: true });

        request.addHeader({
            key: AUTHORIZATION,
            value: (headerPrefix || BEARER_AUTH_PREFIX) + SPACE + jwtToken,
            system: true
        });
    }
    else if (addTokenTo === ADD_TOKEN_TO_TARGETS.QUERY_PARAM) {
        request.url.query.remove(function (query) {
            return query && query.key === queryParamKey;
        });

        request.url.query.add({
            key: queryParamKey,
            value: jwtToken,
            system: true
        });
    }
}

/**
 * Request auth payload structure
 * request:{
 *  auth:{
 *   type:'jwt',
 *   jwt:{
 *    algorithm: <string>  - ALGORITHMS_SUPPORTED,
 *    header:  <JSON string> | JSON Object
 *    payload: <JSON string> | JSON Object
 *    secret: <string>  - secret for HS algorithms
 *    isSecretBase64Encoded: <boolean> - optional property used when <secret> for HS algorithms
 *                                       is encoded in base64 format
 *    privateKey: <string> - PEM format private key for RS, PS, ES algorithms
 *    passphrase: <string> - optional property used when PEM private key is generated with passphrase
 *    addTokenTo: <string> - possible values - header | queryParam,
 *    headerPrefix: <string> - prefix added before jwt token in header - Default Bearer
 *    queryParamKey: <string> - optional property added when <addTokenTo> set to [queryParam],
 *   }
 *  }
 * }
 */
/**
 * @implements {AuthHandlerInterface}
 */
module.exports = {
    /**
     * @property {AuthHandlerInterface~AuthManifest}
     */
    manifest: {
        info: {
            name: 'jwt',
            version: '1.0.0'
        },
        updates: [
            {
                property: 'Authorization',
                type: 'header'
            },
            {
                property: '*',
                type: 'url.param'
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
     * Checks the item, and fetches any parameters that are not already provided.
     *
     * @param {AuthInterface} auth -
     * @param {AuthHandlerInterface~authPreHookCallback} done -
     */
    pre: function (auth, done) {
        return done(null, true);
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
        const algorithm = auth.get(AUTH_KEYS.ALGORITHM),
            secret = auth.get(AUTH_KEYS.SECRET),
            privateKey = auth.get(AUTH_KEYS.PRIVATE_KEY),
            isHsAlgorithm = HS_ALGORITHMS[algorithm];

        // bail out - invalid algorithm
        if (!ALGORITHMS_SUPPORTED[algorithm]) {
            return done(new Error('jwt: invalid algorithm'));
        }

        // bail out - invalid secret or private key
        if (!(secret || privateKey)) {
            return done(new Error('jwt: invalid secret or private key'));
        }

        // bail out - secret not a valid string
        if (isHsAlgorithm && (!secret || !_.isString(secret))) {
            return done(new Error('jwt: secret must be a valid string'));
        }

        // bail out - private key not a valid string
        if (!isHsAlgorithm && (!privateKey || !_.isString(privateKey))) {
            return done(new Error('jwt: private key must be a valid string'));
        }

        try {
            let signKey = null;

            const rawHeader = auth.get(AUTH_KEYS.HEADER),
                header = _.isString(rawHeader) ? JSON.parse(rawHeader) : rawHeader,
                // must stringify payload - else by default 'iat claim' will be auto added in payload
                rawPayload = auth.get(AUTH_KEYS.PAYLOAD),
                payload = _.isString(rawPayload) ? rawPayload : JSON.stringify(rawPayload),
                options = {
                    algorithm: algorithm,
                    // treat root level alg as source of truth & remove alg from header to avoid conflict
                    header: header && _.omit(header, [AUTH_KEYS.HEADER_ALGORITHM])
                };

            // HS Algorithms use secret for token generation
            if (isHsAlgorithm) {
                const isBase64 = auth.get(AUTH_KEYS.IS_SECRET_BASE_64_ENCODED);

                signKey = isBase64 ? Buffer.from(secret, BASE64).toString(ASCII) : secret;
            }

            // RS,PS,ES Algorithms use private key for token generation
            else {
                const passphrase = auth.get(AUTH_KEYS.PASSPHRASE);

                signKey = passphrase ? {
                    key: privateKey,
                    passphrase: passphrase
                } : privateKey;
            }

            // generate the token and add to request
            return jwt.sign(payload, signKey, options, function (err, jwtToken) {
                if (err) {
                    return done(err);
                }

                // add token to request header or as query param
                addTokenToRequest(auth, request, jwtToken);

                return done();
            });
        }
        catch (err) {
            done(err);
        }
    }
};
