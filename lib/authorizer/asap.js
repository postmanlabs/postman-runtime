var _ = require('lodash'),
    jose = require('jose'),
    AUTHORIZATION = 'Authorization',
    AUTHORIZATION_PREFIX = 'Bearer',
    ASAP_PARAMETERS = [
        'iss',
        'sub',
        'aud',
        'privateKey',
        'kid'
    ];

/**
 * @implements {AuthHandlerInterface}
 */
module.exports = {
    /**
     * @property {AuthHandlerInterface~AuthManifest}
     */
    manifest: {
        info: {
            name: 'asap',
            version: '1.0.0'
        },
        updates: [
            {
                property: AUTHORIZATION,
                type: 'header'
            }
        ]
    },

    /**
     * Initializes an item (extracts parameters from intermediate requests if any, etc)
     * before the actual authorization step.
     *
     * @param {AuthInterface} auth -
     * @param {Response} response -
     * @param {AuthHandlerInterface~authInitHookCallback} done -
     */
    init: function (auth, response, done) {
        done(null);
    },

    /**
     * Verifies whether the request has valid basic auth credentials (which is always).
     * Sanitizes the auth parameters if needed.
     *
     * @param {AuthInterface} auth -
     * @param {AuthHandlerInterface~authPreHookCallback} done -
     */
    pre: function (auth, done) {
        done(null);
    },

    /**
     * Verifies whether the basic auth succeeded.
     *
     * @param {AuthInterface} auth -
     * @param {Response} response -
     * @param {AuthHandlerInterface~authPostHookCallback} done -
     */
    post: function (auth, response, done) {
        done(null, true);
    },

    /**
     * Signs a request.
     *
     * @param {AuthInterface} auth -
     * @param {Request} request -
     * @param {AuthHandlerInterface~authSignHookCallback} done -
     */
    sign: function (auth, request, done) {
        var params = auth.get(ASAP_PARAMETERS),
            issuer = params.iss,
            subject = params.sub,
            audience = params.aud,
            privateKey = params.privateKey,
            kid = params.kid,
            alg = params.options && params.options.alg || 'RS256';

        // Validation
        if (!issuer || !subject || !audience || !privateKey || !kid) {
            return done(); // Nothing to do if required parameters are not present.
        }

        // Create the token
        jose.importPKCS8(privateKey, alg).then((resolvedPrivateKey) => {
            jose.SignJWT({})
                .setProtectedHeader({ alg, kid })
                .setIssuedAt()
                .setIssuer(issuer)
                .setSubject(subject)
                .setAudience(audience)
                .setExpirationTime('2h')
                .sign(resolvedPrivateKey)
                .then((token) => {
                    request.addHeader({
                        key: AUTHORIZATION,
                        value: AUTHORIZATION_PREFIX + ' ' + token,
                        system: true
                    });
                });
        }).finally(() => {
            done();
        });
    }
};
