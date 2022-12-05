const _ = require('lodash'),
    jwt = require('jsonwebtoken'),
    BEARER_AUTH_PREFIX = 'Bearer ',
    ALGORITHM = 'algorithm',
    HEADER = 'header',
    PAYLOAD = 'payload',
    SECRET_OR_PRIVATE_KEY = 'secretOrPrivateKey',
    TOKEN_ADD_TO = 'tokenAddTo',
    AUTHORIZATION = 'Authorization',
    TOKEN_ADD_TO_TARGETS = {
        AUTHORIZATION_HEADER: 'authorizationHeader',
        QUERY_PARAM: 'queryParam'
    },
    QUERY_PARAM_KEY = 'queryParamKey';

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
        [SECRET_OR_PRIVATE_KEY]: auth.get(SECRET_OR_PRIVATE_KEY),
        [TOKEN_ADD_TO]: auth.get(TOKEN_ADD_TO),
        [QUERY_PARAM_KEY]: auth.get(QUERY_PARAM_KEY)
    };
}

/**
 * Get the sanitized header
 *
 * @param {Array} header - Array[{key:<string>,value:<string>}]
 * @return {Object} - if valid return JSON stringor return null
 */
function getSanitizedHeader (header) {
    try {
        const headerObj = header.reduce((obj, item) => {
            obj[item.key] = item.value;

            return obj;
        }, {});

        // TODO: remove algorithm from header list and treat root level algorithm as source of truth

        return JSON.parse(JSON.stringify(headerObj)); // must be a valid JSON object
    }
    catch (e) {
        return null;
    }
}

/**
 * Get the JSON string for given payload
 *
 * @param {Array} payload - Array[{key:<string>,value:<string>}] to convert into JSON string
 * @return {string | null} - if valid return JSON string  or return null
 */
function getJSONStringForPayload (payload) {
    try {
        const payloadObj = payload.reduce((obj, item) => {
            obj[item.key] = item.value;

            return obj;
        }, {});

        return JSON.stringify(payloadObj);
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
        queryParamKey = authJwtConfig[QUERY_PARAM_KEY];

    if (tokenAddToTarget === TOKEN_ADD_TO_TARGETS.AUTHORIZATION_HEADER) {
        request.removeHeader(AUTHORIZATION, { ignoreCase: true });

        request.addHeader({
            key: AUTHORIZATION,
            value: BEARER_AUTH_PREFIX + jwtToken,
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
 * @param {string} header - JSON string represents header of jwt token
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
    };

    return jwt.sign(payload, secretOrPrivateKey, options, function (err, jwtToken) {
        if (err) {
            return done();
        }

        // add to Authorization Header or as query param
        addJwtTokenToRequest(authJwtConfig, request, jwtToken);

        return done();
    });
}


/** //TODO: check the structure,
 * Request auth payload structure
 * request:{
 *  auth:{
 *      type:'jwt',
 *      jwt:{
 *          algorithm:<string>,
 *          header:<Array[{key:<string>, value:<string>, type:<string>}]>,
 *          payload:<Array[{key:<string>, value:<string>, type:<string>}]>,
 *          secretOrPrivateKey:<string>,
 *          tokenAddTo:<string> possible values - authorizationHeader | queryParam,
 *          queryParamKey:<string> - optional property added when <tokenAddTo> set to [queryParam]
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
                property: '*',
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
        if (!authJwtConfig[ALGORITHM] || _.isEmpty(authJwtConfig[HEADER]) || !header || !payload ||
            !secretOrPrivateKey || !_.isString(secretOrPrivateKey)) {
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
