/**
 * @fileOverview
 *
 * Implements the EdgeGrid authentication method.
 * Specification document: https://developer.akamai.com/legacy/introduction/Client_Auth.html
 * Sample impletentation by Akamai: https://github.com/akamai/AkamaiOPEN-edgegrid-node
 */

var _ = require('lodash'),
    uuid = require('uuid/v4'),
    crypto = require('crypto'),
    sdk = require('postman-collection'),
    RequestBody = sdk.RequestBody,
    urlEncoder = require('postman-url-encoder'),
    bodyBuilder = require('../requester/core-body-builder'),

    EMPTY = '',
    COLON = ':',
    UTC_OFFSET = '+0000',
    ZERO = '0',
    DATE_TIME_SEPARATOR = 'T',
    TAB = '\t',
    SPACE = ' ',
    SLASH = '/',
    STRING = 'string',
    SIGNING_ALGORITHM = 'EG1-HMAC-SHA256 ',
    AUTHORIZATION = 'Authorization',

    /**
     * Returns current timestamp in the format described in EdgeGrid specification (yyyyMMddTHH:mm:ss+0000)
     *
     * @returns {String} UTC timestamp in format yyyyMMddTHH:mm:ss+0000
     */
    getTimestamp = function () {
        var date = new Date();

        return date.getUTCFullYear() +
                _.padStart(date.getUTCMonth() + 1, 2, ZERO) +
                _.padStart(date.getUTCDate(), 2, ZERO) +
                DATE_TIME_SEPARATOR +
                _.padStart(date.getUTCHours(), 2, ZERO) +
                COLON +
                _.padStart(date.getUTCMinutes(), 2, ZERO) +
                COLON +
                _.padStart(date.getUTCSeconds(), 2, ZERO) +
                UTC_OFFSET;
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
            if (typeof headerName !== STRING) { return; }

            // trim the header name to remove extra spaces from user input
            headerName = headerName.trim().toLowerCase();
            headerValue = headers[headerName];

            // should not include empty headers as per the specification
            if (typeof headerValue !== STRING || headerValue === EMPTY) { return; }

            formattedHeaders.push(`${headerName}:${headerValue.trim().replace(/\s+/g, SPACE)}`);
        });

        return formattedHeaders.join(TAB);
    },

    /**
     * Returns base64 encoding of the SHA–256 HMAC of given data signed with given key
     *
     * @param {String} data Data to sign
     * @param {String} key Key to use while signing the data
     * @returns {String} Base64 encoded signature
     */
    base64HmacSha256 = function (data, key) {
        var encrypt = crypto.createHmac('sha256', key);

        encrypt.update(data);

        return encrypt.digest('base64');
    },

    /**
     * Calculates body hash with given algorithm and digestEncoding.
     *
     * @param {RequestBody} body Request body
     * @param {String} algorithm Hash algorithm to use
     * @param {String} digestEncoding Encoding of the hash
     * @param {Function} callback Callback function that will be called with body hash
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
            urlencodedBody = urlEncoder.encodeQueryString(urlencodedBody);
            hash.update(urlencodedBody);

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
                    callback(hash.digest(digestEncoding));
                });
            });
        }

        if (body.mode === RequestBody.MODES.graphql) {
            graphqlBody = bodyBuilder.graphql(body.graphql).body;
            hash.update(graphqlBody);

            return callback(hash.digest(digestEncoding));
        }

        // @todo: Figure out a way to calculate hash for formdata body type.

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
     * @param {AuthInterface} auth AuthInterface instance created with request auth
     * @param {Response} response Response of intermediate request (it any)
     * @param {AuthHandlerInterface~authInitHookCallback} done Callback function called with error as first argument
     */
    init: function (auth, response, done) {
        done(null);
    },

    /**
     * Checks the item, and fetches any parameters that are not already provided.
     *
     * @param {AuthInterface} auth AuthInterface instance created with request auth
     * @param {AuthHandlerInterface~authPreHookCallback} done Callback function called with error, success and request
     */
    pre: function (auth, done) {
        // only check required auth params here
        done(null, Boolean(auth.get('accessToken') && auth.get('clientToken') && auth.get('clientSecret')));
    },

    /**
     * Verifies whether the request was successful after being sent.
     *
     * @param {AuthInterface} auth AuthInterface instance created with request auth
     * @param {Requester} response Response of the request
     * @param {AuthHandlerInterface~authPostHookCallback} done Callback function called with error and success
     */
    post: function (auth, response, done) {
        done(null, true);
    },

    /**
     * Generates the signature, and returns the Authorization header.
     *
     * @param {Object} params Auth parameters to use in header calculation
     * @param {String} params.accessToken Access token provided by service provider
     * @param {String} params.clientToken Client token provided by service provider
     * @param {String} params.clientSecret Client secret provided by service provider
     * @param {String} params.nonce Nonce to include in authorization header
     * @param {String} params.timestamp Timestamp as defined in protocol specification
     * @param {String} [params.bodyHash] Base64-encoded SHA–256 hash of request body for POST request
     * @param {Object[]} params.headers Request headers
     * @param {String[]} params.headersToSign Ordered list of headers to include in signature
     * @param {String} params.method Request method
     * @param {Url} params.url Node's URL object
     * @returns {String} Authorization header
     */
    computeHeader: function (params) {
        var authHeader = SIGNING_ALGORITHM,
            signingKey = base64HmacSha256(params.timestamp, params.clientSecret),
            dataToSign;

        authHeader += `client_token=${params.clientToken};`;
        authHeader += `access_token=${params.accessToken};`;
        authHeader += `timestamp=${params.timestamp};`;
        authHeader += `nonce=${params.nonce};`;

        dataToSign = [
            params.method,

            // trim to convert 'http:' from Node's URL object to 'http'
            _.trimEnd(params.url.protocol, COLON),
            params.baseURL || params.url.host,
            params.url.path || SLASH,
            canonicalizeHeaders(params.headersToSign, params.headers),
            params.bodyHash || EMPTY,
            authHeader
        ].join(TAB);

        return authHeader + 'signature=' + base64HmacSha256(dataToSign, signingKey);
    },

    /**
     * Signs a request.
     *
     * @param {AuthInterface} auth AuthInterface instance created with request auth
     * @param {Request} request Request to be sent
     * @param {AuthHandlerInterface~authSignHookCallback} done Callback function
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
            url = urlEncoder.toNodeUrl(request.url),
            self = this;

        if (!(params.accessToken && params.clientToken && params.clientSecret)) {
            return done(); // Nothing to do if required parameters are not present.
        }

        request.removeHeader(AUTHORIZATION, {ignoreCase: true});

        // Extract host from provided baseURL.
        params.baseURL = params.baseURL && urlEncoder.toNodeUrl(params.baseURL).host;
        params.nonce = params.nonce || uuid();
        params.timestamp = params.timestamp || getTimestamp();
        params.url = url;
        params.method = request.method;

        // ensure that headers are case-insensitive as specified in the documentation
        params.headers = request.getHeaders({enabled: true, ignoreCase: true});

        if (typeof params.headersToSign === STRING) {
            params.headersToSign = params.headersToSign.split(',');
        }
        else if (!_.isArray(params.headersToSign)) {
            params.headersToSign = [];
        }

        // only calculate body hash for POST requests according to specification
        if (request.method === 'POST') {
            return computeBodyHash(request.body, 'sha256', 'base64', function (bodyHash) {
                params.bodyHash = bodyHash;

                request.addHeader({
                    key: AUTHORIZATION,
                    value: self.computeHeader(params),
                    system: true
                });

                return done();
            });
        }

        request.addHeader({
            key: AUTHORIZATION,
            value: self.computeHeader(params),
            system: true
        });

        return done();
    }
};
