var _ = require('lodash'),
    jose = require('jose'),
    AUTHORIZATION = 'Authorization',
    AUTHORIZATION_PREFIX = 'Bearer',
    ASAP_PARAMETERS = [
        'alg',
        'kid',
        'iss',
        'exp',
        'aud',
        'jti',
        'privateKey',
        'claims'
    ],
    DEFAULT_EXPIRY = '1h',
    DEFAULT_ALGORITHM = 'RS256',

    // No synchronous algorithms supported in ASAP, Ref:
    // https://s2sauth.bitbucket.io/spec/#overview
    ALGORITHMS_SUPPORTED = {
        RS256: 'RS256',
        RS384: 'RS384',
        RS512: 'RS512',
        PS256: 'PS256',
        PS384: 'PS384',
        PS512: 'PS512',
        ES256: 'ES256',
        ES384: 'ES384',
        ES512: 'ES512'
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
            claims = params.claims || {},

            // Give priority to the claims object, if present
            issuer = claims.iss || params.iss,
            subject = claims.sub || params.sub,
            audience = claims.aud || params.aud,
            jwtTokenId = claims.jti || params.jti,
            issuedAt = claims.iat,
            expiry = params.exp || DEFAULT_EXPIRY,
            privateKey = params.privateKey,
            kid = params.kid,
            alg = params.alg || DEFAULT_ALGORITHM;

        // Validation
        if (!kid || !issuer || !audience || !jwtTokenId || !privateKey || !kid) {
            return done(new Error('One or more of required claims missing'));
        }

        if (!ALGORITHMS_SUPPORTED[alg]) {
            return done(new Error('invalid algorithm'));
        }

        // Create the token
        jose.importPKCS8(privateKey, alg).then((resolvedPrivateKey) => {
            jose.SignJWT(claims)
                .setProtectedHeader({ alg, kid })
                .setIssuedAt(issuedAt)
                .setIssuer(issuer)
                .setSubject(subject)
                .setAudience(audience)
                .setExpirationTime(expiry)
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
