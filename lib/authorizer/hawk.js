var url = require('url'),
    _ = require('lodash'),
    crypto = require('crypto'),
    Hawk = require('postman-request/lib/hawk'),
    RequestBody = require('postman-collection').RequestBody,
    bodyBuilder = require('../requester/core-body-builder'),
    urlEncoder = require('postman-url-encoder'),

    ASCII_SOURCE = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
    ASCII_SOURCE_LENGTH = ASCII_SOURCE.length,
    AUTHORIZATION = 'Authorization',
    EMPTY = '';

/**
 * Generates a random string of given length (useful for nonce generation, etc).
 *
 * @param {Number} length -
 */
function randomString (length) {
    length = length || 6;

    var result = [],
        i;

    for (i = 0; i < length; i++) {
        result[i] = ASCII_SOURCE[(Math.random() * ASCII_SOURCE_LENGTH) | 0];
    }

    return result.join(EMPTY);
}

/**
 * Calculates body hash with given algorithm and digestEncoding.
 * REFER: https://github.com/postmanlabs/postman-request/blob/master/lib/hawk.js#L12
 *
 * @param {RequestBody} body -
 * @param {String} algorithm -
 * @param {String} digestEncoding -
 * @param {String} contentType -
 * @param {Function} callback -
 */
function computeBodyHash (body, algorithm, digestEncoding, contentType, callback) {
    if (!(body && algorithm && digestEncoding) || body.isEmpty()) { return callback(); }

    var hash = crypto.createHash(algorithm),
        originalReadStream,
        rawBody,
        urlencodedBody,
        graphqlBody;

    hash.update('hawk.1.payload\n');
    hash.update((contentType ? contentType.split(';')[0].trim().toLowerCase() : '') + '\n');

    if (body.mode === RequestBody.MODES.raw) {
        rawBody = bodyBuilder.raw(body.raw).body;
        hash.update(rawBody);
        hash.update('\n');

        return callback(hash.digest(digestEncoding));
    }

    if (body.mode === RequestBody.MODES.urlencoded) {
        urlencodedBody = bodyBuilder.urlencoded(body.urlencoded).form;
        urlencodedBody = urlEncoder.encodeQueryString(urlencodedBody);
        hash.update(urlencodedBody);
        hash.update('\n');

        return callback(hash.digest(digestEncoding));
    }

    if (body.mode === RequestBody.MODES.file) {
        originalReadStream = _.get(body, 'file.content');

        if (!originalReadStream) {
            return callback();
        }

        return originalReadStream.cloneReadStream(function (err, clonedStream) {
            if (err) { return callback(); }

            clonedStream.on('data', function (chunk) {
                hash.update(chunk);
            });

            clonedStream.on('end', function () {
                hash.update('\n');
                callback(hash.digest(digestEncoding));
            });
        });
    }

    if (body.mode === RequestBody.MODES.graphql) {
        graphqlBody = bodyBuilder.graphql(body.graphql).body;
        hash.update(graphqlBody);
        hash.update('\n');

        return callback(hash.digest(digestEncoding));
    }

    // @todo: Figure out a way to calculate hash for formdata body type.

    // ensure that callback is called if body.mode doesn't match with any of the above modes
    return callback();
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
            name: 'hawk',
            version: '1.0.0'
        },
        updates: [
            {
                property: 'Authorization',
                type: 'header'
            },
            {
                property: 'nonce',
                type: 'auth'
            },
            {
                property: 'timestamp',
                type: 'auth'
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
     * Checks the item, and fetches any parameters that are not already provided.
     * Sanitizes the auth parameters if needed.
     *
     * @param {AuthInterface} auth -
     * @param {AuthHandlerInterface~authPreHookCallback} done -
     */
    pre: function (auth, done) {
        !auth.get('nonce') && auth.set('nonce', randomString(6));
        !_.parseInt(auth.get('timestamp')) && auth.set('timestamp', Math.floor(Date.now() / 1e3));
        done(null, true);
    },

    /**
     * Verifies whether the request was successfully authorized after being sent.
     *
     * @param {AuthInterface} auth -
     * @param {Response} response -
     * @param {AuthHandlerInterface~authPostHookCallback} done -
     */
    post: function (auth, response, done) {
        done(null, true);
    },

    /**
     * Computes signature and Auth header for a request.
     *
     * @param {Object} params -
     * @param {Object} params.credentials Contains hawk auth credentials, "id", "key" and "algorithm"
     * @param {String} params.nonce -
     * @param {String} params.ext Extra data that may be associated with the request.
     * @param {String} params.app Application ID used in Oz authorization protocol
     * @param {String} params.dlg Delegation information (used in the Oz protocol)
     * @param {String} params.user User id
     * @param {String} params.url Complete request URL
     * @param {String} params.method Request method
     *
     * @returns {*}
     */
    computeHeader: function (params) {
        return Hawk.header(url.parse(params.url), params.method, params);
    },

    /**
     * Signs a request.
     *
     * @param {AuthInterface} auth -
     * @param {Request} request -
     * @param {AuthHandlerInterface~authSignHookCallback} done -
     */
    sign: function (auth, request, done) {
        var params = auth.get([
                'authId',
                'authKey',
                'algorithm',
                'nonce',
                'timestamp',
                'extraData',
                'app',
                'delegation',
                'user',
                'includePayloadHash'
            ]),

            contentType = request.headers.get('content-type'),

            self = this,

            signRequest = function (bodyHash) {
                // force toString to add a protocol to the URL.
                var url = urlEncoder.toNodeUrl(request.url),

                    result = self.computeHeader({
                        credentials: {
                            id: params.authId,
                            key: params.authKey,
                            algorithm: params.algorithm
                        },
                        nonce: params.nonce,
                        timestamp: params.timestamp,
                        ext: params.extraData,
                        app: params.app,
                        dlg: params.delegation,
                        user: params.user,
                        url: url.href,
                        method: request.method,
                        hash: bodyHash
                    });

                request.addHeader({
                    key: AUTHORIZATION,
                    value: result,
                    system: true
                });

                return done();
            };

        if (!params.authId || !params.authKey) {
            return done(); // Nothing to do if required parameters are not present.
        }

        request.removeHeader(AUTHORIZATION, { ignoreCase: true });

        // @note: Payload verification is optional in hawk auth according to specifications (see below link). If user
        //        opt-in for payload verification, `Content-Type` header must be specified explicitely otherwise
        //        authentication might fail because we automatically add `Content-Type` header after auth handlers which
        //        is not accounted while calculating payload hash for hawk auth.
        //        documentation: https://github.com/hapijs/hawk#payload-validation
        //        issue: https://github.com/postmanlabs/postman-app-support/issues/6550
        //
        // @todo: Change flow of auto adding `Content-Type` header to happen before auth handlers
        if (!params.includePayloadHash) {
            return signRequest(); // sign request without calculating payload hash
        }

        computeBodyHash(request.body, params.algorithm, 'base64', contentType, signRequest);
    }
};
