var url = require('url'),
    _ = require('lodash'),
    crypto = require('crypto'),
    querystring = require('querystring'),
    Hawk = require('postman-request/lib/hawk'),
    RequestBody = require('postman-collection').RequestBody,
    urlencodedBodyBuilder = require('../requester/core-body-builder').urlencoded,
    urlEncoder = require('postman-url-encoder'),

    ASCII_SOURCE = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
    ASCII_SOURCE_LENGTH = ASCII_SOURCE.length,
    EMPTY = '';

/**
 * Generates a random string of given length (useful for nonce generation, etc).
 *
 * @param {Number} length
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
 * Encodes characters not encoded by querystring.stringify() according to RFC3986.
 * REFER: https://github.com/postmanlabs/postman-request/blob/master/lib/querystring.js#L42
 *
 * @param {String} str Partially encoded string by querystring.stringify()
 * @returns {String} Fully encoded string
 */
function rfc3986 (str) {
    return str.replace(/[!'()*]/g, function (c) {
        return '%' + c.charCodeAt(0).toString(16).toUpperCase();
    });
}

/**
 * Calculates body hash with given algorithm and digestEncoding.
 * REFER: https://github.com/postmanlabs/postman-request/blob/master/lib/hawk.js#L12
 *
 * @param {RequestBody} body
 * @param {String} algorithm
 * @param {String} digestEncoding
 * @param {String} contentType
 * @param {Function} callback
 */
function computeBodyHash (body, algorithm, digestEncoding, contentType, callback) {
    if (!(body && algorithm && digestEncoding) || body.isEmpty()) { return callback(); }

    var hash = crypto.createHash(algorithm),
        originalReadStream,
        urlencodedBody;

    hash.update('hawk.1.payload\n');
    hash.update((contentType ? contentType.split(';')[0].trim().toLowerCase() : '') + '\n');

    if (body.mode === RequestBody.MODES.raw) {
        hash.update(body.toString());
        hash.update('\n');

        return callback(hash.digest(digestEncoding));
    }

    if (body.mode === RequestBody.MODES.urlencoded) {
        urlencodedBody = urlencodedBodyBuilder(body.urlencoded).form;
        urlencodedBody = querystring.stringify(urlencodedBody);
        urlencodedBody = rfc3986(urlencodedBody);
        hash.update(urlencodedBody);
        hash.update('\n');

        return callback(hash.digest(digestEncoding));
    }

    if (body.mode === RequestBody.MODES.formdata) {
        // @todo: Figure out a way to calculate hash for this body mode. For now we take empty string as body.
        hash.update('');
        hash.update('\n');

        return callback();
    }

    if (body.mode === RequestBody.MODES.file) {
        originalReadStream = _.get(body, 'file.content');

        if (!originalReadStream) {
            return callback();
        }

        originalReadStream.cloneReadStream(function (err, clonedStream) {
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
     * @param {AuthInterface} auth
     * @param {Response} response
     * @param {AuthHandlerInterface~authInitHookCallback} done
     */
    init: function (auth, response, done) {
        done(null);
    },

    /**
     * Checks the item, and fetches any parameters that are not already provided.
     * Sanitizes the auth parameters if needed.
     *
     * @param {AuthInterface} auth
     * @param {AuthHandlerInterface~authPreHookCallback} done
     */
    pre: function (auth, done) {
        !auth.get('nonce') && auth.set('nonce', randomString(6));
        !_.parseInt(auth.get('timestamp')) && auth.set('timestamp', Math.floor(Date.now() / 1e3));
        done(null, true);
    },

    /**
     * Verifies whether the request was successfully authorized after being sent.
     *
     * @param {AuthInterface} auth
     * @param {Response} response
     * @param {AuthHandlerInterface~authPostHookCallback} done
     */
    post: function (auth, response, done) {
        done(null, true);
    },

    /**
     * Computes signature and Auth header for a request.
     *
     * @param {Object} params
     * @param {Object} params.credentials Contains hawk auth credentials, "id", "key" and "algorithm"
     * @param {String} params.nonce
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
     * @param {AuthInterface} auth
     * @param {Request} request
     * @param {AuthHandlerInterface~authSignHookCallback} done
     */
    sign: function (auth, request, done) {
        var result,
            params = auth.get([
                'authId',
                'authKey',
                'algorithm',
                'nonce',
                'timestamp',
                'extraData',
                'app',
                'delegation',
                'user'
            ]),
            contentType = request.headers.get('content-type'),

            // force toString to add a protocol to the URL.
            url = urlEncoder.toNodeUrl(request.url.toString(true)),

            self = this;

        if (!params.authId || !params.authKey) {
            return done(); // Nothing to do if required parameters are not present.
        }

        request.removeHeader('Authorization', {ignoreCase: true});

        computeBodyHash(request.body, params.algorithm, 'base64', contentType, function (bodyHash) {
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
                url: url.href, // force toString to add a protocol to the URL.
                method: request.method,
                hash: bodyHash
            });
            request.addHeader({
                key: 'Authorization',
                value: result,
                system: true
            });

            return done();
        });
    }
};
