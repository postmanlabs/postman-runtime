var jose = require('jose'),
    uuid = require('uuid'),
    nodeForge = require('node-forge'),
    AUTHORIZATION = 'Authorization',
    AUTHORIZATION_PREFIX = 'Bearer ',
    ASAP_PARAMETERS = [
        'alg',
        'kid',
        'iss',
        'exp',
        'aud',
        'sub',
        'privateKey',
        'claims'
    ],
    DEFAULT_EXPIRY = 3600,
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
    },

    // eslint-disable-next-line no-useless-escape
    DATA_URI_PATTERN = /^data:application\/pkcs8;kid=([\w.\-\+/]+);base64,([a-zA-Z0-9+/=]+)$/;

function removeNewlines (str) {
    return str.replace(/\n/g, '');
}


function trimStringDoubleQuotes (str) {
    return str.replace(/^"(.*)"$/, '$1');
}

function parsePrivateKey (keyId, privateKey) {
    privateKey = trimStringDoubleQuotes(privateKey);
    var uriDecodedPrivateKey = decodeURIComponent(privateKey),
        match,
        privateKeyDerBuffer,
        privateKeyAsn1,
        privateKeyInfo,
        pkcs1pem,
        base64pkcs1,
        privateKeyInfoPKCS1,
        privateKeyInfoPKCS8,
        asn1pkcs1privateKey,
        pkcs8pem;

    if (!uriDecodedPrivateKey.startsWith('data:')) {
        return uriDecodedPrivateKey;
    }

    match = DATA_URI_PATTERN.exec(uriDecodedPrivateKey);

    if (!match) {
        throw new Error('Malformed Data URI');
    }

    if (keyId !== match[1]) {
        throw new Error('Supplied key id does not match the one included in data uri.');
    }

    // Convert DER to PEM if needed
    // Create a private key from the DER buffer
    privateKeyDerBuffer = nodeForge.util.decode64(match[2]);
    privateKeyAsn1 = nodeForge.asn1.fromDer(privateKeyDerBuffer);
    privateKeyInfo = nodeForge.pki.privateKeyFromAsn1(privateKeyAsn1);
    pkcs1pem = nodeForge.pki.privateKeyToPem(privateKeyInfo);
    base64pkcs1 = pkcs1pem.toString('base64').trim();

    // convert the PKCS#1 key generated to PKCS#8 format
    privateKeyInfoPKCS1 = nodeForge.pki.privateKeyFromPem(base64pkcs1);
    asn1pkcs1privateKey = nodeForge.pki.privateKeyToAsn1(privateKeyInfoPKCS1);
    privateKeyInfoPKCS8 = nodeForge.pki.wrapRsaPrivateKey(asn1pkcs1privateKey);
    pkcs8pem = nodeForge.pki.privateKeyInfoToPem(privateKeyInfoPKCS8);

    return pkcs8pem.toString('base64').trim();
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
            issuer,
            subject,
            audience,
            jwtTokenId,
            currentTimeStamp,
            issuedAt,
            expiry,
            expiryTimestamp,
            privateKey,
            kid,
            alg;

        if (typeof claims === 'string') {
            const trimmedClaims = claims.trim();

            try {
                claims = trimmedClaims && JSON.parse(trimmedClaims);
            }
            catch (err) {
                return done(new Error('Failed to parse claims'));
            }
        }

        // Give priority to the claims object, if present
        issuer = claims.iss || params.iss;

        // Atlassian wants subject to fall back to issuer if not present
        subject = claims.sub || params.sub || issuer;
        audience = claims.aud || params.aud;

        // Default to a uuid, this is mandatory in ASAP
        jwtTokenId = claims.jti || uuid.v4();
        currentTimeStamp = Math.floor(Date.now() / 1000);
        issuedAt = claims.iat || currentTimeStamp;

        // Check if expiry is present in claims or params, parse it to int
        expiry = (params.exp && parseInt(params.exp, 10)) ||
            DEFAULT_EXPIRY;

        // Allow overriding expiry timestamp in claims. The ASAP and JWT specs
        // mention exp to be a timestamp rather than a duration, so we let the
        // override pass through.
        expiryTimestamp = (claims.exp && parseInt(claims.exp, 10)) ||
            currentTimeStamp + expiry;
        privateKey = params.privateKey;
        kid = claims.kid || params.kid;

        // Atlassian's internal tool for generating keys uses RS256 by default
        alg = params.alg || DEFAULT_ALGORITHM;

        // Validation
        if (!kid || !issuer || !audience || !jwtTokenId || !privateKey || !kid) {
            return done(new Error('One or more of required claims missing'));
        }

        if (!ALGORITHMS_SUPPORTED[alg]) {
            return done(new Error('invalid algorithm'));
        }

        if (typeof privateKey !== 'string') {
            return done(new Error('privateKey must be a string'));
        }

        try {
            privateKey = removeNewlines(privateKey);
            privateKey = parsePrivateKey(kid, privateKey);
        }
        catch (err) {
            return done(new Error('Failed to parse private key.'));
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
                    .setExpirationTime(expiryTimestamp)
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
            .catch(() => {
                done(new Error('Failed to sign request with key.'));
            });
    }
};
