var _ = require('lodash'),

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
    },

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
     * Makes a item to the server, and fetches the nonce
     *
     * @param {Item} item
     * @param {Run} run
     * @param {Requester} run.requester
     * @param {Cursor} cursor
     * @param done
     * @private
     */
    fetchParameters: function (item, run, cursor, done) {
        var requester = run.requester;

        if (!requester) { return done(null); }

        requester.request(item, run.triggers, cursor, function (err, response) {
            if (err) { return done(err); }

            var authHeader = response.headers.one('www-authenticate'),
                realm,
                nonce;

            if (!authHeader) { return done(null); }

            nonce = _extractNonce(authHeader.value);
            realm = _extractRealm(authHeader.value);

            done(null, nonce, realm);
        });
    },

    /**
     * Initializes a item (fetches all required parameters, etc) before the actual authorization step.
     *
     * @param {Item} item
     * @param {Run} run
     * @param {Cursor} cursor
     * @param done
     */
    init: function (item, run, cursor, done) {
        this.fetchParameters(item, run, cursor, function (err, nonce, realm) {
            if (err) { return done(err); }

            _.assign(this, {
                nonce: nonce,
                realm: realm
            });
            done(null);
        }.bind(this));
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
        done(null, true);
    }
};
