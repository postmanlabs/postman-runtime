var crypto = require('crypto-js'),
    _extractNonce,
    _extractRealm;

/**
 * Extracts Digest Auth nonce from a WWW-Authenticate header value.
 *
 * @param {String} string
 * @private
 */
_extractNonce = function (string) {
    // todo - make this more robust
    var nonceStart = string.indexOf('"', string.indexOf('nonce')) + 1,
        nonceEnd = string.indexOf('"', nonceStart),
        nonce = string.slice(nonceStart, nonceEnd);
    return nonce;
};

/**
 * Extracts Digest Auth realm from a WWW-Authenticate header value.
 *
 * @param {String} string
 * @private
 */
_extractRealm = function (string) {
    // todo - make this more robust
    var realmStart = string.indexOf('"', string.indexOf('realm')) + 1,
        realmEnd = string.indexOf('"', realmStart),
        realm = string.slice(realmStart, realmEnd);
    return realm;
};

module.exports = {
    /**
     * Initializes an item (extracts parameters from intermediate requests if any, etc)
     * before the actual authorization step.
     *
     * @param {AuthInterface} auth
     * @param {Response} response
     * @param done
     */
    init: function (auth, response, done) {
        done(null);
    },

    /**
     * Checks whether the given item has all the required parameters in its request.
     * Sanitizes the auth parameters if needed.
     *
     * @param {AuthInterface} auth
     * @param done
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
     * @param done
     */
    post: function (auth, response, done) {
        var code,
            realm,
            nonce,
            authHeader;

        code = response && response.code;
        authHeader = response && response.headers.one('www-authenticate');

        // If code is forbidden or unauthorized, and an auth header exists,
        // we can extract the realm & the nonce, and replay the request.
        // todo: add response.is4XX, response.is5XX, etc in the SDK.
        if ((code === 401 || code === 403) && authHeader) {
            nonce = _extractNonce(authHeader.value);
            realm = _extractRealm(authHeader.value);

            auth.set({nonce: nonce, realm: realm});
            return done(null, false);
        }

        done(null, true);
    },

    /**
     * Computes the Digest Authentication header from the given parameters.
     *
     * @param {AuthInterface} auth
     * @returns {String}
     */
    computeHeader: function (auth) {
        var algorithm = auth.get('algorithm'),
            username = auth.get('username'),
            realm = auth.get('realm'),
            password = auth.get('password'),
            method = auth.get('method'),
            nonce = auth.get('nonce'),
            nonceCount = auth.get('nonceCount'),
            clientNonce = auth.get('clientNonce'),
            opaque = auth.get('opaque'),
            qop = auth.get('qop'),
            uri = auth.get('uri'),

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
            // Cannot be implemented here.
            throw new Error('Digest Auth with "qop": "auth-int" is not supported.');
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

        if (qop === 'auth' || qop === 'auth-int') {
            headerParams.push('qop=' + qop);
        }

        if (qop === 'auth' || qop === 'auth-int' || algorithm === 'MD5-sess') {
            headerParams.push('nc=' + nonceCount);
            headerParams.push('cnonce="' + clientNonce + '"');
        }

        headerParams.push('response="' + reqDigest + '"');
        headerParams.push('opaque="' + opaque + '"');

        return 'Digest ' + headerParams.join(', ');
    },

    /**
     * Signs a request.
     *
     * @param {AuthInterface} auth
     * @param {Request} request
     * @param done
     */
    sign: function (auth, request, done) {
        var header,
            params = auth.get(['username', 'realm']);

        if (!params ||
            !params.username ||
            !params.realm) { return done(); } // Nothing to do if no parameters are present.

        request.removeHeader('Authorization', {ignoreCase: true});

        auth.set('method', request.method);
        auth.set('uri', request.url.getPathWithQuery());
        header = this.computeHeader(auth);
        request.addHeader({
            key: 'Authorization',
            value: header,
            system: true
        });
        return done();
    }
};
