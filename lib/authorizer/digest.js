var _extractNonce,
    _extractRealm;

/**
 * Extracts Digest Auth nonce from a WWW-Authenticate header value.
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
     * @param {Item} item
     * @param {Run} run
     * @param {Cursor} cursor
     * @param done
     */
    init: function (item, run, cursor, done) {
        done(null);
    },

    /**
     * Checks whether the given item has all the required parameters in its request.
     *
     * @param {Item} item
     * @param {Run} run
     * @param {Cursor} cursor
     * @param done
     */
    pre: function (item, run, cursor, done) {
        // ensure that all dynamic parameter values are present in the parameters
        // if even one is absent, we return false.
        done(null, Boolean(this.nonce && this.realm));
    },

    /**
     * Verifies whether the request was successfully authorized after being sent.
     *
     * @param {Item} item
     * @param {Response} response
     * @param {Run} run
     * @param {Cursor} cursor
     * @param done
     */
    post: function (item, response, run, cursor, done) {
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

            this.nonce = nonce;
            this.realm = realm;
            return done(null, false);
        }

        done(null, true);
    }
};
