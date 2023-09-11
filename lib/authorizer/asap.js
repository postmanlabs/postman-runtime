var jose = require('jose'),
    uuid = require('uuid'),
    AUTHORIZATION = 'Authorization',
    AUTHORIZATION_PREFIX = 'Bearer ',
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

function removeNewlines (str) {
    return str.replace(/\n/g, '');
}

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
        done(null, true);
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

            // Default to a uuid, this is mandatory in ASAP
            jwtTokenId = claims.jti || params.jti || uuid.v4(),
            issuedAt = claims.iat,
            expiry = params.exp || DEFAULT_EXPIRY,
            privateKey = removeNewlines(params.privateKey),
            kid = params.kid,
            alg = params.alg || DEFAULT_ALGORITHM;

        if (typeof claims === 'string') {
            const trimmedClaims = claims.trim();

            claims = trimmedClaims && JSON.parse(trimmedClaims);
        }
        // Validation
        if (!kid || !issuer || !audience || !jwtTokenId || !privateKey || !kid) {
            return done(new Error('One or more of required claims missing'));
        }

        if (!ALGORITHMS_SUPPORTED[alg]) {
            return done(new Error('invalid algorithm'));
        }

        jose.importPKCS8(privateKey, alg)
            .then((signKey) => {
                return new jose.SignJWT(claims)
                    .setProtectedHeader({ alg, kid })

                    // This will be system generated if not present
                    .setIssuedAt(issuedAt)
                    .setIssuer(issuer)
                    .setSubject(subject)
                    .setJti(jwtTokenId)
                    .setAudience(audience)
                    .setExpirationTime(expiry)
                    .sign(signKey);
            })
            .then((token) => {
                request.removeHeader(AUTHORIZATION, { ignoreCase: true });

                request.addHeader({
                    key: AUTHORIZATION,
                    value: AUTHORIZATION_PREFIX + token,
                    system: true
                });

                return done();
            })
            .catch((err) => {
                done(err);
            });
    }
};
