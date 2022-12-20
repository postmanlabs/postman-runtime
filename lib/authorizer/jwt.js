const _ = require('lodash'),
    jwt = require('jsonwebtoken'),

    // jwt key constants
    BEARER_AUTH_PREFIX = 'Bearer',
    ALGORITHM = 'algorithm',
    HEADER = 'header',
    PAYLOAD = 'payload',
    SECRET = 'secret',
    IS_SECRET_BASE_64_ENCODED = 'isSecretBase64Encoded',
    PRIVATE_KEY = 'privateKey',
    PASSPHRASE = 'passphrase',
    ADD_TOKEN_TO = 'addTokenTo',
    ADD_TOKEN_TO_TARGETS = {
        HEADER: 'header',
        QUERY_PARAM: 'queryParam'
    },
    HEADER_PREFIX = 'headerPrefix',
    QUERY_PARAM_KEY = 'queryParamKey',
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
    const addTokenTo = auth.get(ADD_TOKEN_TO) || ADD_TOKEN_TO_TARGETS.HEADER,
        queryParamKey = auth.get(QUERY_PARAM_KEY),
        headerPrefix = auth.get(HEADER_PREFIX);

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
 *      type:'jwt',
 *      jwt:{
 *          algorithm: <string>  - ALGORITHMS_SUPPORTED,
 *          header:  <JSON string> | JSON Object
 *          payload: <JSON string> | JSON Object
 *          secret: <string>  - secret for HS algorithms
 *          isSecretBase64Encoded: <boolean> - optional property used when <secretOrPrivateKey> for HS algorithms
 *                                             is encoded in base64 format
 *          privateKey: <string> - PEM format private key for RS, PS, ES algorithms
 *          passphrase: <string> - optional property used when PEM private key is generated with passphrase
 *          addTokenTo: <string> - possible values - header | queryParam,
 *          headerPrefix: <string> - prefix added before jwt token in header
 *          queryParamKey: <string> - optional property added when <addTokenTo> set to [queryParam],
 *      }
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
        // bail out - invalid algorithm
        if (!ALGORITHMS_SUPPORTED[auth.get(ALGORITHM)]) {
            return done();
        }

        try {
            let signKey = null;

            const rawHeader = auth.get(HEADER),
                header = _.isString(rawHeader) ? JSON.parse(auth.get(HEADER)) : rawHeader,
                // must stringify payload - else by default 'iat claim' will be auto added in payload
                rawPayload = auth.get(PAYLOAD),
                payload = _.isString(rawPayload) ? rawPayload : JSON.stringify(auth.get(PAYLOAD)),
                options = {
                    algorithm: auth.get(ALGORITHM),
                    // treat root level alg as source of truth
                    header: header && _.omit(header, ['alg'])
                };

            // HS Algorithms use secret for token generation
            if (HS_ALGORITHMS[options.algorithm]) {
                const secret = auth.get(SECRET),
                    isBase64 = auth.get(IS_SECRET_BASE_64_ENCODED);

                signKey = isBase64 ? Buffer.from(secret, BASE64).toString(ASCII) : secret;
            }

            // RS,PS,ES Algorithms use private key for token generation
            else {
                const privateKey = auth.get(PRIVATE_KEY),
                    passphrase = auth.get(PASSPHRASE);

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
