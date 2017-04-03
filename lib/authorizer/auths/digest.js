var _ = require('lodash'),
    sdk = require('postman-collection'),

    DigestAuth = function (options) {
        this.options = options;
    };

_.extend(DigestAuth.prototype, {

    /**
     * The parameters that may be fetched dynamically.
     *
     * @type {Array}
     */
    dynamicParameters: ['realm', 'nonce'],

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

            // todo - remove this and update the requester API once the app uses the runtime bridge,
            // coz IPC issues :/
            response = new sdk.Response(response);

            var authHeader = response.headers.one('www-authenticate'),
                realm,
                nonce;

            if (!authHeader) { return done(null); }

            nonce = DigestAuth._extractNonce(authHeader.value);
            realm = DigestAuth._extractRealm(authHeader.value);

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
     *
     * @param {Request} item
     * @param run
     * @param requester
     * @param done
     */
    pre: function (item, run, requester, done) {
        var parameters = item.request.auth.digest;

        if (!parameters.nonce || !parameters.realm) {
            return done(null, false);
        }

        done(null, true);
    },

    post: function (item, response, run, requester, done) {
        done(new Error('authorizer: base auth does not implement post-processor'));
    },
});

_.extend(DigestAuth, {
    /**
     * Extracts Digest Auth nonce from a WWW-Authenticate header value.
     * @private
     */
    _extractNonce: function (string) {
        // todo - make this more robust
        var nonceStart = string.indexOf('"', string.indexOf("nonce")) + 1,
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
        var realmStart = string.indexOf('"', string.indexOf("realm")) + 1,
            realmEnd = string.indexOf('"', realmStart),
            realm = string.slice(realmStart, realmEnd);
        return realm;
    },
});

module.exports = DigestAuth;
