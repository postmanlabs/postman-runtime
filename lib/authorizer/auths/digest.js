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
     * @param {Requester} requester
     * @param done
     * @private
     */
    fetchParameters: function (item, run, requester, done) {
        requester.request(item, run.triggers, function (err, response) {
            if (err) { return done(err); }

            var authHeader = response.headers.one('www-authenticate'),
                realm,
                nonce;

            if (!authHeader) { return done(null); }

            nonce = _extractNonce(authHeader.value);
            realm = _extractRealm(authHeader.value);

            done(null, nonce, realm);
        }, run);
    },

    /**
     * Initializes a item (fetches all required parameters, etc) before the actual authorization step.
     *
     * @param {Item} item
     * @param {Run} run
     * @param {Requester} requester
     * @param done
     */
    init: function (item, run, requester, done) {
        this.fetchParameters(item, run, requester, function (err, nonce, realm) {
            if (err) { return done(err); }

            _.extend(this, {
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
     * @param {Requester} requester
     * @param done
     */
    pre: function (item, run, requester, done) {
        // ensure that all dynamic parameter values are present in the parameters
        // if even one is absent, we return false.
        if (!this.nonce || !this.realm) {
            return done(null, false);
        }

        done(null, true);
    },

    /**
     * Verifies whether the request was successfully authorized after being sent.
     *
     * @param {Item} item
     * @param {Response} response
     * @param {Run} run
     * @param {Requester} requester
     * @param done
     */
    post: function (item, response, run, requester, done) {
        done(null, true);
    }
};
