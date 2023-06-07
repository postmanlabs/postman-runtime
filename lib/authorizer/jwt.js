const _ = require('lodash'),
    jose = require('jose'),

    // jwt key constants
    BEARER_AUTH_PREFIX = 'Bearer',
    QUERY_KEY = 'token',
    AUTH_KEYS = {
        ALGORITHM: 'algorithm',
        HEADER: 'header',
        HEADER_ALGORITHM: 'alg',
        PAYLOAD: 'payload',
        SECRET: 'secret',
        IS_SECRET_BASE_64_ENCODED: 'isSecretBase64Encoded',
        PRIVATE_KEY: 'privateKey',
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
    UTF8 = 'utf8',
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
        queryParamKey = auth.get(AUTH_KEYS.QUERY_PARAM_KEY) || QUERY_KEY;

    if (addTokenTo === ADD_TOKEN_TO_TARGETS.HEADER) {
        request.removeHeader(AUTHORIZATION, { ignoreCase: true });

        let headerPrefix = auth.get(AUTH_KEYS.HEADER_PREFIX);

        headerPrefix = _.isNil(headerPrefix) ? BEARER_AUTH_PREFIX : headerPrefix;
        headerPrefix && (headerPrefix += SPACE);

        request.addHeader({
            key: AUTHORIZATION,
            value: headerPrefix + jwtToken,
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
 *    addTokenTo: <string> - possible values - header | queryParam,
 *    headerPrefix: <string> - prefix added before jwt token in header
 *                             If headerPrefix is null | undefined - `Authorization:Bearer + SPACE + JWT_TOKEN`
 *                             If headerPrefix is valid string - `Authorization:HEADER_PREFIX + SPACE + JWT_TOKEN`
 *                             If headerPrefix is empty string - `Authorization:JWT_TOKEN`
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
            return done(new Error('invalid algorithm'));
        }

        // bail out - secret not a valid string
        if (isHsAlgorithm && (!secret || !_.isString(secret))) {
            return done(new Error('Invalid secret key. Enter a valid key.'));
        }

        // bail out - private key not a valid string
        if (!isHsAlgorithm && (!privateKey || !_.isString(privateKey))) {
            return done(new Error('Invalid private key. Enter a valid key.'));
        }

        try {
            const rawHeader = auth.get(AUTH_KEYS.HEADER),
                rawPayload = auth.get(AUTH_KEYS.PAYLOAD);

            let header = rawHeader,
                payload = rawPayload;

            if (typeof rawHeader === 'string') {
                const trimmedHeader = rawHeader.trim();

                header = trimmedHeader && JSON.parse(trimmedHeader);
            }

            // treat root level alg as source of truth.
            // If header is not set, use empty object.
            header = header ? { ...header, alg: algorithm } : { alg: algorithm };

            if (typeof rawPayload === 'string') {
                const trimmedPayload = rawPayload.trim();

                payload = trimmedPayload ? JSON.parse(trimmedPayload) : {};
            }

            // HS Algorithms use secret for token generation
            if (isHsAlgorithm) {
                const isBase64 = auth.get(AUTH_KEYS.IS_SECRET_BASE_64_ENCODED),
                    secretBuffer = Buffer.from(secret, isBase64 ? BASE64 : UTF8);

                new jose.SignJWT(payload)
                    .setProtectedHeader(header)
                    .sign(new Uint8Array(secretBuffer))
                    .then((token) => {
                        addTokenToRequest(auth, request, token);

                        return done();
                    })
                    .catch((err) => {
                        done(err);
                    });
            }

            // RS,PS,ES Algorithms use private key for token generation
            else {
                jose.importPKCS8(privateKey, algorithm)
                    .then((signKey) => {
                        return new jose.SignJWT(payload)
                            .setProtectedHeader(header)
                            .sign(signKey);
                    })
                    .then((token) => {
                        addTokenToRequest(auth, request, token);

                        return done();
                    })
                    .catch((err) => {
                        done(err);
                    });
            }
        }
        catch (err) {
            done(err);
        }
    }
};
