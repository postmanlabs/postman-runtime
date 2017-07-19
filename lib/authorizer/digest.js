var _extractNonce,
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
     * Initializes a item (fetches all required parameters, etc) before the actual authorization step.
     *
     * @param {RequestContext} context
     * @param {Requester} requester
     * @param done
     */
    init: function (context, requester, done) {
        done(null);
    },

    /**
     * Checks whether the given item has all the required parameters in its request.
     *
     * @param {RequestContext} context
     * @param {Requester} requester
     * @param done
     */
    pre: function (context, requester, done) {
        // ensure that all dynamic parameter values are present in the parameters
        // if even one is absent, we return false.
        done(null, Boolean(this.nonce && this.realm));
    },

    /**
     * Verifies whether the request was successfully authorized after being sent.
     *
     * @param {RequestContext} context
     * @param {Requester} requester
     * @param done
     */
    post: function (context, requester, done) {
        var code,
            realm,
            nonce,
            authHeader,
            response = context.response;

        code = response && response.code;
        authHeader = response && response.headers.one('www-authenticate');

        // If code is forbidden or unauthorized, and an auth header exists,
        // we can extract the realm & the nonce, and replay the request.
        // todo: add response.is4XX, response.is5XX, etc in the SDK.
        if ((code === 401 || code === 403) && authHeader) {
            nonce = _extractNonce(authHeader.value);
            realm = _extractRealm(authHeader.value);

            this.nonce = nonce;
            this.realm = realm;
            return done(null, false);
        }

        done(null, true);
    },

    /**
     * Signs a request.
     *
     * @param {Request} request
     * @todo - this should be made into ".sign" after the signature calculation is moved out of the SDK.
     */
    _sign: function (request) {
        return this.authorize(request);
    }
};
