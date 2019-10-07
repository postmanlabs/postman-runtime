/**
 * @fileOverview
 *
 * Implements the EdgeGrid authorization method.
 * Specification document: https://developer.akamai.com/legacy/introduction/Client_Auth.html
 * Sample impletentation by Akamai: https://github.com/akamai/AkamaiOPEN-edgegrid-node
 */

var _ = require('lodash'),
    sdk = require('postman-collection'),
    crypto = require('crypto'),
    moment = require('moment'),
    querystring = require('querystring'),
    urlEncoder = require('postman-url-encoder'),
    RequestBody = require('postman-collection').RequestBody,
    bodyBuilder = require('../requester/core-body-builder'),

    ASCII_SOURCE = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
    ASCII_SOURCE_LENGTH = ASCII_SOURCE.length,
    EMPTY = '',
    AUTHORIZATION = 'Authorization',

    /**
     * Generates a random string of given length
     *
     * @param {Number} [length=6] Length of the string to be generated
     * @returns {String} Randomly generated string
     */
    randomString = function (length) {
        length = length || 6;

        var result = [],
            i;

        for (i = 0; i < length; i++) {
            result[i] = ASCII_SOURCE[(Math.random() * ASCII_SOURCE_LENGTH) | 0];
        }

        return result.join(EMPTY);
    },

    /**
     * Creates a String containing a tab delimited set of headers.
     *
     * @param {String[]} headersToSign Headers to include in signature
     * @param {Object} headers Request headers
     * @returns {String} Canonicalized headers
     */
    canonicalizeHeaders = function (headersToSign, headers) {
        var formattedHeaders = [],
            headerValue;

        headersToSign.forEach(function (headerName) {
            headerValue = headers[headerName];

            if (!headerValue) { return; }

            formattedHeaders.push(`${headerName.toLowerCase()}:${headerValue.trim().replace(/\s+/g, ' ')}`);
        });

        return formattedHeaders.join('\t');
    },

    /**
     * Returns base64 encoding of the SHA–256 HMAC of given data signed with given key
     *
     * @param {String} data Data to sign
     * @param {String} key Key to use while signing the data
     * @returns {String} base64 encoded signature
     */
    base64HmacSha256 = function (data, key) {
        var encrypt = crypto.createHmac('sha256', key);

        encrypt.update(data);

        return encrypt.digest('base64');
    },

    /**
     * Encodes characters not encoded by querystring.stringify() according to RFC3986.
     * REFER: https://github.com/postmanlabs/postman-request/blob/master/lib/querystring.js#L42
     *
     * @param {String} str Partially encoded string by querystring.stringify()
     * @returns {String} Fully encoded string
     */
    rfc3986 = function (str) {
        return str.replace(/[!'()*]/g, function (c) {
            return '%' + c.charCodeAt(0).toString(16).toUpperCase();
        });
    },

    /**
     * Calculates body hash with given algorithm and digestEncoding.
     *
     * @param {RequestBody} body
     * @param {String} algorithm
     * @param {String} digestEncoding
     * @param {Function} callback
     */
    computeBodyHash = function (body, algorithm, digestEncoding, callback) {
        if (!(body && algorithm && digestEncoding) || body.isEmpty()) { return callback(); }

        var hash = crypto.createHash(algorithm),
            originalReadStream,
            rawBody,
            urlencodedBody,
            graphqlBody;

        if (body.mode === RequestBody.MODES.raw) {
            rawBody = bodyBuilder.raw(body.raw).body;
            hash.update(rawBody);

            return callback(hash.digest(digestEncoding));
        }

        if (body.mode === RequestBody.MODES.urlencoded) {
            urlencodedBody = bodyBuilder.urlencoded(body.urlencoded).form;
            urlencodedBody = querystring.stringify(urlencodedBody);
            urlencodedBody = rfc3986(urlencodedBody);
            hash.update(urlencodedBody);

            return callback(hash.digest(digestEncoding));
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
                    callback(hash.digest(digestEncoding));
                });
            });
        }

        if (body.mode === RequestBody.MODES.graphql) {
            graphqlBody = bodyBuilder.graphql(body.graphql).body;
            hash.update(graphqlBody);

            return callback(hash.digest(digestEncoding));
        }

        // @todo: formdata body type requires adding new data to form instead of setting headers for AWS auth.
        //        Figure out how to do that. See below link:
        //        AWS auth with formdata: https://docs.aws.amazon.com/AmazonS3/latest/API/sigv4-post-example.html

        // ensure that callback is called if body.mode doesn't match with any of the above modes
        return callback();
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
            name: 'edgegrid',
            version: '1.0.0'
        },
        updates: [
            {
                property: 'Authorization',
                type: 'header'
            }
        ]
    },

    /**
     * Initializes a item (fetches all required parameters, etc) before the actual authorization step.
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
     *
     * @param {AuthInterface} auth
     * @param {AuthHandlerInterface~authPreHookCallback} done
     */
    pre: function (auth, done) {
        // only check required auth params here
        done(null, Boolean(auth.get('accessToken') && auth.get('clientToken') && auth.get('clientSecret')));
    },

    /**
     * Verifies whether the request was successful after being sent.
     *
     * @param {AuthInterface} auth
     * @param {Requester} response
     * @param {AuthHandlerInterface~authPostHookCallback} done
     */
    post: function (auth, response, done) {
        done(null, true);
    },

    /**
     * Generates the signature, and returns the Authorization header.
     *
     * @param {Object} params
     * @param {String} params.accessToken Access token provided by service provider
     * @param {String} params.clientToken Client token provided by service provider
     * @param {String} params.clientSecret Client secret provided by service provider
     * @param {String} params.nonce Nonce to include in authorization header
     * @param {String} params.timestamp Timestamp as defined in protocol specification
     * @param {String} [params.bodyHash] Base64-encoded SHA–256 hash of request body for POST request
     * @param {String} params.method Request method
     * @param {Url} params.url Node's URL object
     * @returns {String} Authorization header
     */
    computeHeader: function (params) {
        var authHeader = 'EG1-HMAC-SHA256 ',
            signingKey = base64HmacSha256(params.timestamp, params.clientSecret),
            dataToSign;

        authHeader += `client_token=${params.clientToken};`;
        authHeader += `access_token=${params.accessToken};`;
        authHeader += `timestamp=${params.timestamp};`;
        authHeader += `nonce=${params.nonce};`;

        dataToSign = [
            params.method,
            params.url.protocol.replace(':', ''),
            params.baseURL || params.url.host,
            params.url.path,
            canonicalizeHeaders(params.headersToSign, params.headers),
            params.bodyHash || '',
            authHeader
        ].join('\t');

        return authHeader + 'signature=' + base64HmacSha256(dataToSign, signingKey);
    },

    /**
     * Signs a request.
     *
     * @param {AuthInterface} auth
     * @param {Request} request
     * @param {AuthHandlerInterface~authSignHookCallback} done
     */
    sign: function (auth, request, done) {
        var params = auth.get([
                'accessToken',
                'clientToken',
                'clientSecret',
                'baseURL',
                'nonce',
                'timestamp',
                'headersToSign'
            ]),
            url = urlEncoder.toNodeUrl(request.url.toString(true)),
            self = this;

        // Extract host from provided baseURL.
        // @note: Here, instead of directly passing params.baseURL in urlEncoder.toNodeUrl() we first parse it using
        //        sdk.Url() and add protocol because urlEncoder.toNodeUrl() method doesn't work properly with URLs
        //        without protocol
        params.baseURL = params.baseURL && urlEncoder.toNodeUrl(new sdk.Url(params.baseURL).toString(true)).host;
        params.nonce = params.nonce || randomString(6);
        params.timestamp = params.timestamp || moment().utc().format('YYYYMMDDTHH:mm:ss+0000');
        params.url = url;
        params.method = request.method;
        params.headers = request.getHeaders({enabled: true});

        if (typeof params.headersToSign === 'string') {
            params.headersToSign = params.headersToSign.split(',');
        }
        else {
            params.headersToSign = [];
        }

        if (request.method === 'POST') {
            return computeBodyHash(request.body, 'sha256', 'base64', function (bodyHash) {
                params.bodyHash = bodyHash;

                request.upsertHeader({
                    key: AUTHORIZATION,
                    value: self.computeHeader(params),
                    system: true
                });

                return done();
            });
        }

        request.upsertHeader({
            key: AUTHORIZATION,
            value: self.computeHeader(params),
            system: true
        });

        return done();
    }
};
