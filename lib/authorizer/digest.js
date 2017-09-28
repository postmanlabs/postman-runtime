var crypto = require('crypto-js'),
    _ = require('lodash'),

    EMPTY = '',
    ONE = '00000001',
    DISABLE_RETRY_REQUEST = 'disableRetryRequest',
    ASCII_SOURCE = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
    ASCII_SOURCE_LENGTH = ASCII_SOURCE.length,

    nonceRegex = /nonce="([^"]*)"/,
    realmRegex = /realm="([^"]*)"/,
    qopRegex = /qop="([^"]*)"/,
    opaqueRegex = /opaque="([^"]*)"/,
    _extractField;

/**
 * Generates a random string of given length
 *
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
        if (auth.get(DISABLE_RETRY_REQUEST)) {
            return done(null, true);
        }

        var code,
            realm,
            nonce,
            qop,
            opaque,
            authHeader;

        code = response && response.code;
        authHeader = response && response.headers.find(function (property) {
            return (property.key.toLowerCase() === 'www-authenticate') && (_.startsWith(property.value, 'Digest'));
        });

        // If code is forbidden or unauthorized, and an auth header exists,
        // we can extract the realm & the nonce, and replay the request.
        // todo: add response.is4XX, response.is5XX, etc in the SDK.
        if ((code === 401 || code === 403) && authHeader) {
            nonce = _extractField(authHeader.value, nonceRegex);
            realm = _extractField(authHeader.value, realmRegex);
            qop = _extractField(authHeader.value, qopRegex);
            opaque = _extractField(authHeader.value, opaqueRegex);

            auth.set({nonce: nonce, realm: realm});
            opaque && (auth.set('opaque', opaque));
            // we give pref to the value provided by user and then the server
            // @todo this means user can't clear the qop value (we will always take the value from the server)
            !auth.get('qop') && qop && (auth.set('qop', qop));

            if (auth.get('qop')) {
                auth.set({'clientNonce': randomString(8), 'nonceCount': ONE});
            }

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

            reqDigest,
            headerParams;

        if (algorithm === 'MD5-sess') {
            A0 = crypto.MD5(username + ':' + realm + ':' + password).toString();
            A1 = A0 + ':' + nonce + ':' + clientNonce;
        }
        else {
            A1 = username + ':' + realm + ':' + password;
        }

        if (qop === 'auth-int') {
            A2 = method + ':' + uri + ':' + crypto.MD5(params.body);
        }
        else {
            A2 = method + ':' + uri;
        }
        hashA1 = crypto.MD5(A1).toString();
        hashA2 = crypto.MD5(A2).toString();

        if (qop === 'auth' || qop === 'auth-int') {
            reqDigest = crypto.MD5([hashA1, nonce, nonceCount, clientNonce, qop, hashA2].join(':')).toString();
        }
        else {
            reqDigest = crypto.MD5([hashA1, nonce, hashA2].join(':')).toString();
        }

        headerParams = ['username="' + username + '"',
            'realm="' + realm + '"',
            'nonce="' + nonce + '"',
            'uri="' + uri + '"'
        ];

        algorithm && headerParams.push('algorithm="' + algorithm + '"');

        if (qop === 'auth' || qop === 'auth-int') {
            headerParams.push('qop=' + qop);
        }

        if (qop === 'auth' || qop === 'auth-int' || algorithm === 'MD5-sess') {
            nonceCount && headerParams.push('nc=' + nonceCount);
            headerParams.push('cnonce="' + clientNonce + '"');
        }

        headerParams.push('response="' + reqDigest + '"');
        opaque && headerParams.push('opaque="' + opaque + '"');

        return 'Digest ' + headerParams.join(', ');
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
            params = auth.get([
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
            ]);

        if (!params.username || !params.realm) {
            return done(); // Nothing to do if required parameters are not present.
        }

        request.removeHeader('Authorization', {ignoreCase: true});

        params.method = request.method;
        params.uri = request.url.getPathWithQuery();
        params.body = request.body && request.body.toString();

        try {
            header = this.computeHeader(params);
        }
        catch (e) { return done(e); }

        request.addHeader({
            key: 'Authorization',
            value: header,
            system: true
        });
        return done();
    }
};
