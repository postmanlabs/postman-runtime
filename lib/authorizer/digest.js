var _ = require('lodash'),
    crypto = require('crypto'),
    jsSHA = require('js-sha512'),
    urlEncoder = require('postman-url-encoder'),

    EMPTY = '',
    ONE = '00000001',
    DISABLE_RETRY_REQUEST = 'disableRetryRequest',
    WWW_AUTHENTICATE = 'www-authenticate',
    DIGEST_PREFIX = 'Digest ',
    QOP = 'qop',
    AUTH = 'auth',
    COLON = ':',
    QUOTE = '"',
    SESS = '-sess',
    AUTH_INT = 'auth-int',
    AUTHORIZATION = 'Authorization',
    MD5_SESS = 'MD5-sess',
    ASCII_SOURCE = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
    ASCII_SOURCE_LENGTH = ASCII_SOURCE.length,
    USERNAME_EQUALS_QUOTE = 'username="',
    REALM_EQUALS_QUOTE = 'realm="',
    NONCE_EQUALS_QUOTE = 'nonce="',
    URI_EQUALS_QUOTE = 'uri="',
    ALGORITHM_EQUALS_QUOTE = 'algorithm="',
    CNONCE_EQUALS_QUOTE = 'cnonce="',
    RESPONSE_EQUALS_QUOTE = 'response="',
    OPAQUE_EQUALS_QUOTE = 'opaque="',
    QOP_EQUALS = 'qop=',
    NC_EQUALS = 'nc=',
    ALGO = {
        MD5: 'MD5',
        MD5_SESS: 'MD5-sess',
        SHA_256: 'SHA-256',
        SHA_256_SESS: 'SHA-256-sess',
        SHA_512_256: 'SHA-512-256',
        SHA_512_256_SESS: 'SHA-512-256-sess'
    },
    AUTH_PARAMETERS = [
        'algorithm',
        'username',
        'realm',
        'password',
        'method',
        'nonce',
        'nonceCount',
        'clientNonce',
        'opaque',
        'qop',
        'uri'
    ],

    nonceRegex = /nonce="([^"]*)"/,
    realmRegex = /realm="([^"]*)"/,
    qopRegex = /qop="([^"]*)"/,
    opaqueRegex = /opaque="([^"]*)"/,
    _extractField;

/**
 * Generates a random string of given length
 *
 * @todo Move this to util.js. After moving use that for hawk auth too
 * @param {Number} length
 */
function randomString (length) {
    length = length || 6;

    var result = [],
        i;

    for (i = 0; i < length; i++) {
        result[i] = ASCII_SOURCE[(Math.random() * ASCII_SOURCE_LENGTH) | 0];
    }

    return result.join(EMPTY);
}


/**
 * Extracts a Digest Auth field from a WWW-Authenticate header value using a given regexp.
 *
 * @param {String} string
 * @param {RegExp} regexp
 * @private
 */
_extractField = function (string, regexp) {
    var match = string.match(regexp);

    return match ? match[1] : EMPTY;
};

/**
 * Returns the 'www-authenticate' header for Digest auth. Since a server can suport more than more auth-scheme,
 * there can be more than one header with the same key. So need to loop over and check each one.
 *
 * @param {VariableList} headers
 * @private
 */
function _getDigestAuthHeader (headers) {
    return headers.find(function (property) {
        return (property.key.toLowerCase() === WWW_AUTHENTICATE) && (_.startsWith(property.value, DIGEST_PREFIX));
    });
}

/**
 * Returns hex encoded hash of given data using given algorithm.
 *
 * @param {String} data string to calculate hash
 * @param {String} algorithm hash algorithm
 * @returns {String} hex encoded hash of given data
 */
function getHash (data, algorithm) {
    try {
        return crypto.createHash(algorithm).update(data || EMPTY).digest('hex');
    }
    catch (e) {
        // Current Electron version(7.2.3) in Postman app uses OpenSSL 1.1.0
        // which don't support `SHA-512-256`. Use external `js-sha512` module
        // to handle this case.
        if (e.message === 'Digest method not supported' && algorithm === 'sha512-256') {
            return jsSHA.sha512_256(data);
        }

        // throw other errors as it is
        throw e;
    }
}

/**
 * All the auth definition parameters excluding username and password should be stored and resued.
 * @todo The current implementation would fail for the case when two requests to two different hosts inherits the same
 * auth. In that case a retry would not be attempted for the second request (since all the parameters would be present
 * in the auth definition though invalid).
 *
 * @implements {AuthHandlerInterface}
 */
module.exports = {
    /**
     * @property {AuthHandlerInterface~AuthManifest}
     */
    manifest: {
        info: {
            name: 'digest',
            version: '1.0.0'
        },
        updates: [
            {
                property: 'Authorization',
                type: 'header'
            },
            {
                property: 'nonce',
                type: 'auth'
            },
            {
                property: 'realm',
                type: 'auth'
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
     * Checks whether the given item has all the required parameters in its request.
     * Sanitizes the auth parameters if needed.
     *
     * @param {AuthInterface} auth
     * @param {AuthHandlerInterface~authPreHookCallback} done
     */
    pre: function (auth, done) {
        // ensure that all dynamic parameter values are present in the parameters
        // if even one is absent, we return false.
        done(null, Boolean(auth.get('nonce') && auth.get('realm')));
    },

    /**
     * Verifies whether the request was successfully authorized after being sent.
     *
     * @param {AuthInterface} auth
     * @param {Response} response
     * @param {AuthHandlerInterface~authPostHookCallback} done
     */
    post: function (auth, response, done) {
        if (auth.get(DISABLE_RETRY_REQUEST) || !response) {
            return done(null, true);
        }

        var code,
            realm,
            nonce,
            qop,
            opaque,
            authHeader,
            authParams = {};

        code = response.code;
        authHeader = _getDigestAuthHeader(response.headers);

        // If code is forbidden or unauthorized, and an auth header exists,
        // we can extract the realm & the nonce, and replay the request.
        // todo: add response.is4XX, response.is5XX, etc in the SDK.
        if ((code === 401 || code === 403) && authHeader) {
            nonce = _extractField(authHeader.value, nonceRegex);
            realm = _extractField(authHeader.value, realmRegex);
            qop = _extractField(authHeader.value, qopRegex);
            opaque = _extractField(authHeader.value, opaqueRegex);

            authParams.nonce = nonce;
            authParams.realm = realm;
            opaque && (authParams.opaque = opaque);
            qop && (authParams.qop = qop);

            if (authParams.qop || auth.get(QOP)) {
                authParams.clientNonce = randomString(8);
                authParams.nonceCount = ONE;
            }

            // if all the auth parameters sent by server were already present in auth definition then we do not retry
            if (_.every(authParams, function (value, key) { return auth.get(key); })) {
                return done(null, true);
            }

            auth.set(authParams);

            return done(null, false);
        }

        done(null, true);
    },

    /**
     * Computes the Digest Authentication header from the given parameters.
     *
     * @param {Object} params
     * @param {String} params.algorithm
     * @param {String} params.username
     * @param {String} params.realm
     * @param {String} params.password
     * @param {String} params.method
     * @param {String} params.nonce
     * @param {String} params.nonceCount
     * @param {String} params.clientNonce
     * @param {String} params.opaque
     * @param {String} params.qop
     * @param {String} params.uri
     * @returns {String}
     */
    computeHeader: function (params) {
        var algorithm = params.algorithm,
            username = params.username,
            realm = params.realm,
            password = params.password,
            method = params.method,
            nonce = params.nonce,
            nonceCount = params.nonceCount,
            clientNonce = params.clientNonce,
            opaque = params.opaque,
            qop = params.qop,
            uri = params.uri,

            // RFC defined terms, http://tools.ietf.org/html/rfc2617#section-3
            A0,
            A1,
            A2,
            hashA1,
            hashA2,

            hashAlgo,
            reqDigest,
            headerParams;

        switch (algorithm) {
            case ALGO.SHA_256:
            case ALGO.SHA_256_SESS:
                hashAlgo = 'sha256';
                break;
            case ALGO.MD5:
            case ALGO.MD5_SESS:
            case EMPTY:
            case undefined:
            case null:
                algorithm = algorithm || ALGO.MD5;
                hashAlgo = 'md5';
                break;
            case ALGO.SHA_512_256:
            case ALGO.SHA_512_256_SESS:
                hashAlgo = 'sha512-256';
                break;
            default:
                throw new Error(`Unsupported digest algorithm: ${algorithm}`);
        }

        if (_.endsWith(algorithm, SESS)) {
            A0 = getHash(username + COLON + realm + COLON + password, hashAlgo);
            A1 = A0 + COLON + nonce + COLON + clientNonce;
        }
        else {
            A1 = username + COLON + realm + COLON + password;
        }

        if (qop === AUTH_INT) {
            A2 = method + COLON + uri + COLON + getHash(params.body, hashAlgo);
        }
        else {
            A2 = method + COLON + uri;
        }
        hashA1 = getHash(A1, hashAlgo);
        hashA2 = getHash(A2, hashAlgo);

        if (qop === AUTH || qop === AUTH_INT) {
            reqDigest = getHash([hashA1, nonce, nonceCount, clientNonce, qop, hashA2].join(COLON), hashAlgo);
        }
        else {
            reqDigest = getHash([hashA1, nonce, hashA2].join(COLON), hashAlgo);
        }

        headerParams = [USERNAME_EQUALS_QUOTE + username + QUOTE,
            REALM_EQUALS_QUOTE + realm + QUOTE,
            NONCE_EQUALS_QUOTE + nonce + QUOTE,
            URI_EQUALS_QUOTE + uri + QUOTE
        ];

        algorithm && headerParams.push(ALGORITHM_EQUALS_QUOTE + algorithm + QUOTE);

        if (qop === AUTH || qop === AUTH_INT) {
            headerParams.push(QOP_EQUALS + qop);
        }

        if (qop === AUTH || qop === AUTH_INT || algorithm === MD5_SESS) {
            nonceCount && headerParams.push(NC_EQUALS + nonceCount);
            headerParams.push(CNONCE_EQUALS_QUOTE + clientNonce + QUOTE);
        }

        headerParams.push(RESPONSE_EQUALS_QUOTE + reqDigest + QUOTE);
        opaque && headerParams.push(OPAQUE_EQUALS_QUOTE + opaque + QUOTE);

        return DIGEST_PREFIX + headerParams.join(', ');
    },

    /**
     * Signs a request.
     *
     * @param {AuthInterface} auth
     * @param {Request} request
     * @param {AuthHandlerInterface~authSignHookCallback} done
     */
    sign: function (auth, request, done) {
        var header,
            params = auth.get(AUTH_PARAMETERS),
            url = urlEncoder.toNodeUrl(request.url);

        if (!params.username || !params.realm) {
            return done(); // Nothing to do if required parameters are not present.
        }

        request.removeHeader(AUTHORIZATION, {ignoreCase: true});

        params.method = request.method;
        params.uri = url.path;
        params.body = request.body && request.body.toString();

        try {
            header = this.computeHeader(params);
        }
        catch (e) { return done(e); }

        request.addHeader({
            key: AUTHORIZATION,
            value: header,
            system: true
        });

        return done();
    }
};
