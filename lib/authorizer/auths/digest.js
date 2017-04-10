var _ = require('lodash'),

    Digest = function (options) {
        this.options = options;
    };

_.extend(Digest.prototype, {
    /**
     * Makes a item to the server, and fetches the nonce
     *
     * @param {Item} item
     * @param run
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

            nonce = Digest._extractNonce(authHeader.value);
            realm = Digest._extractRealm(authHeader.value);

            done(null, nonce, realm);
        }, run);
    },

    /**
     * Initializes a item (fetches all required parameters, etc) before the actual authorization step.
     *
     * @param item
     * @param run
     * @param requester
     * @param done
     */
    init: function (item, run, requester, done) {
        this.fetchParameters(item, run, requester, function (err, nonce, realm) {
            if (err) { return done(err); }

            _.extend(item.request.auth.digest, {
                nonce: nonce,
                realm: realm
            });
            done(null);
        });
    },

    /**
     * Checks whether the given item has all the required parameters in its request.
     *
     * @param {Item} item
     * @param run
     * @param requester
     * @param done
     */
    pre: function (item, run, requester, done) {
        var parameters = item.request.auth.digest;


        // ensure that all dynamic parameter values are present in the parameters
        // if even one is absent, we return false.
        if (!parameters.nonce || !parameters.realm) {
            return done(null, false);
        }

        done(null, true);
    },

    /**
     * Verifies whether the request was successfully authorized after being sent.
     *
     * @param item
     * @param response
     * @param run
     * @param requester
     * @param done
     */
    post: function (item, response, run, requester, done) {
        done(null, true);
    },

    /**
     * Signs a request based on the authentication parameters.
     *
     * @param item
     * @param run
     * @param callback
     */
    sign: function (item, run, callback) {
        item.request = item.request.authorize();
        callback(null);
    }
});

_.extend(Digest, {
    /**
     * Extracts Digest Auth nonce from a WWW-Authenticate header value.
     * @private
     */
    _extractNonce: function (string) {
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
    _extractRealm: function (string) {
        // todo - make this more robust
        var realmStart = string.indexOf('"', string.indexOf('realm')) + 1,
            realmEnd = string.indexOf('"', realmStart),
            realm = string.slice(realmStart, realmEnd);
        return realm;
    }
});

module.exports = Digest;
