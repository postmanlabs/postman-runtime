const _ = require('lodash'),
    jwt = require('jsonwebtoken'),

    // jwt key constants
    BEARER_AUTH_PREFIX = 'Bearer',
    ALGORITHM = 'algorithm',
    HEADER = 'header',
    PAYLOAD = 'payload',
    SECRET_OR_PRIVATE_KEY = 'secretOrPrivateKey',
    TOKEN_ADD_TO = 'tokenAddTo',
    AUTH_TOKEN_PREFIX = 'tokenPrefix',
    PASSPHRASE = 'passphrase',
    SECRET_BASE_64_ENCODED = 'secretBase64Encoded',
    AUTHORIZATION = 'Authorization',
    TOKEN_ADD_TO_TARGETS = {
        AUTHORIZATION_HEADER: 'authorizationHeader',
        QUERY_PARAM: 'queryParam'
    },
    QUERY_PARAM_KEY = 'queryParamKey',
    BASE64 = 'base64',
    ASCII = 'ascii',
    SPACE = ' ',

    // algorithms supported by package
    ALGORITHMS_SUPPORTED = {
        HS256: 'HS256',
        HS384: 'HS384',
        HS512: 'HS512',
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
 * Get the request jwt auth payload values
 *
 * @param {AuthInterface} auth - authInterface (refer auth-interface.js)
 * @return {Object} - AuthJwtConfig
 */
function getRequestAuthJwtConfig (auth) {
    return {
        [ALGORITHM]: auth.get(ALGORITHM),
        [HEADER]: auth.get(HEADER),
        [PAYLOAD]: auth.get(PAYLOAD),
        [TOKEN_ADD_TO]: auth.get(TOKEN_ADD_TO),
        // Authorization header prefix - defaults to Bearer <jwtToken>
        [AUTH_TOKEN_PREFIX]: auth.get(AUTH_TOKEN_PREFIX),
        // SECRET_OR_PRIVATE_KEY - secret - string | privateKey - generated using openssl or ssh-keygen
        [SECRET_OR_PRIVATE_KEY]: auth.get(SECRET_OR_PRIVATE_KEY),
        // optional value - valid when TOKEN_ADD_TO === QUERY_PARAM
        [QUERY_PARAM_KEY]: auth.get(QUERY_PARAM_KEY),
        // optional value - valid when SECRET_OR_PRIVATE_KEY[privateKey] is generated with passphrase
        [PASSPHRASE]: auth.get(PASSPHRASE),
        // optional value - valid when SECRET_OR_PRIVATE_KEY[secret] is encoded as base64
        [SECRET_BASE_64_ENCODED]: auth.get(SECRET_BASE_64_ENCODED)
    };
}

/**
 * Get the sanitized header
 *
 * @param {Object | JSON String} header - Object{ key:value } which is checked as valid JSON
 * @return {Object | null} - if valid return object or return null
 */
function getSanitizedHeader (header) {
    try {
        const parsedHeader = _.isString(header) ? JSON.parse(header) : JSON.parse(JSON.stringify(header));

        // remove algorithm from header object and treat root level algorithm property as source of truth
        delete parsedHeader.alg;

        return parsedHeader; // must be a valid JSON object for jwt token generation
    }
    catch (e) {
        return null;
    }
}

/**
 * Get the JSON string for given payload
 *
 * @param {Object | JSON String} payload - Object{ key:value } to convert into JSON string
 * @return {JSON String | null} - if valid return JSON string  or return null
 */
function getJSONStringForPayload (payload) {
    try {
        // validate the string is valid JSON
        return _.isString(payload) ? JSON.stringify(JSON.parse(payload)) : JSON.stringify(payload);
    }
    catch (e) {
        return null;
    }
}

/**
 * add the JWT Token to the request in Authorization Header or Query
 *
 * @param {AuthJwtConfig} authJwtConfig - return value of getRequestAuthJwtValues()
 * @param {Request} request - request
 * @param {string} jwtToken - base64encoded jwt token
 */
function addJwtTokenToRequest (authJwtConfig, request, jwtToken) {
    const tokenTarget = authJwtConfig[TOKEN_ADD_TO],
        tokenAddToTarget = tokenTarget || TOKEN_ADD_TO_TARGETS.AUTHORIZATION_HEADER,
        queryParamKey = authJwtConfig[QUERY_PARAM_KEY],
        authorizationPrefix = authJwtConfig[AUTH_TOKEN_PREFIX];

    if (tokenAddToTarget === TOKEN_ADD_TO_TARGETS.AUTHORIZATION_HEADER) {
        request.removeHeader(AUTHORIZATION, { ignoreCase: true });

        request.addHeader({
            key: AUTHORIZATION,
            value: (authorizationPrefix || BEARER_AUTH_PREFIX) + SPACE + jwtToken,
            system: true
        });
    }
    else if (tokenAddToTarget === TOKEN_ADD_TO_TARGETS.QUERY_PARAM) {
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
 * Get the jwt token from AuthJwtConfig using jsonwebtoken npm package
 *
 * @param {Request} request - request
 * @param {AuthJwtConfig} authJwtConfig - return value of getRequestAuthJwtValues()
 * @param {Object} header - object represents header section of jwt token
 * @param {string} payload -  JSON string represents payload of jwt token
 * @param {string} secretOrPrivateKey - string which contains secret or private according to algorithm
 * @param {AuthHandlerInterface~authSignHookCallback} done - done callback
 *
 * @return {string} jwtToken - base64encoded jwt token
 */
function generateAndAddJwtTokenToRequest (request, authJwtConfig, header, payload, secretOrPrivateKey, done) {
    const options = {
            algorithm: authJwtConfig[ALGORITHM],
            header: header
        },
        decodedSecretOrPrivateKey = authJwtConfig[SECRET_BASE_64_ENCODED] ?
            Buffer.from(secretOrPrivateKey, BASE64).toString(ASCII) : secretOrPrivateKey,
        secretOrPrivateKeyOpt = authJwtConfig[PASSPHRASE] ? {
            key: decodedSecretOrPrivateKey,
            passphrase: authJwtConfig[PASSPHRASE]
        } : decodedSecretOrPrivateKey;

    return jwt.sign(payload, secretOrPrivateKeyOpt, options, function (err, jwtToken) {
        if (err) {
            return done();
        }

        // add to Authorization Header or as query param
        addJwtTokenToRequest(authJwtConfig, request, jwtToken);

        return done();
    });
}

/**
 * Request auth payload structure
 * request:{
 *  auth:{
 *      type:'jwt',
 *      jwt:{
 *          algorithm: <string> - ALGORITHMS_SUPPORTED,
 *          header: {} - <valid JSON Object>  | <valid JSON string>
 *          payload: {} - <valid JSON Object> | <valid JSON string>
 *          secretOrPrivateKey: <string> - secret for HS algorithms | privateKey for RS, PS, ES algorithms
 *                                         privateKey is generated using ssh-keygen or open-ssl
 *          tokenAddTo: <string> - possible values - authorizationHeader | queryParam,
 *          tokenPrefix: <string> - prefix added before jwt token in Authorization header
 *          queryParamKey: <string> - optional property added when <tokenAddTo> set to [queryParam],
 *          passphrase: <string> - optional property used when PEM private key is generated with passphrase
 *          secretBase64Encoded: <boolean> - optional property used when <secretOrPrivateKey> for HS algorithms
 *                                           is encoded in base64 format
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
     * Verifies whether the request has required parameters
     *
     * @param {AuthInterface} auth -
     * @param {AuthHandlerInterface~authPreHookCallback} done -
     */
    pre: function (auth, done) {
        const authJwtConfig = getRequestAuthJwtConfig(auth);

        return done(null, authJwtConfig[ALGORITHM] && authJwtConfig[SECRET_OR_PRIVATE_KEY]);
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
     * Signs the request
     *
     * @param {AuthInterface} auth -
     * @param {Request} request -
     * @param {AuthHandlerInterface~authSignHookCallback} done -
     */
    sign: function (auth, request, done) {
        const authJwtConfig = getRequestAuthJwtConfig(auth),
            header = getSanitizedHeader(authJwtConfig[HEADER]),
            payload = getJSONStringForPayload(authJwtConfig[PAYLOAD]),
            secretOrPrivateKey = authJwtConfig[SECRET_OR_PRIVATE_KEY];

        // invalid algorithm | invalid secretOrPrivateKey | invalid jwt header | invalid json -  bail out
        if (!ALGORITHMS_SUPPORTED[authJwtConfig[ALGORITHM]] || _.isEmpty(authJwtConfig[HEADER]) ||
            !authJwtConfig[PAYLOAD] || !header || !payload || !secretOrPrivateKey || !_.isString(secretOrPrivateKey)) {
            return done();
        }

        generateAndAddJwtTokenToRequest(request, authJwtConfig, header, payload, secretOrPrivateKey, done);
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
    }
};
