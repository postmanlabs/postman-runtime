var _ = require('lodash'),
    aws4 = require('aws4'),
    crypto = require('crypto'),
    sdk = require('postman-collection'),
    urlEncoder = require('postman-url-encoder'),
    bodyBuilder = require('../requester/core-body-builder'),

    RequestBody = sdk.RequestBody,

    X_AMZ_PREFIX = 'X-Amz-',
    BODY_HASH_HEADER = 'X-Amz-Content-Sha256',

    /**
     * Calculates body hash with given algorithm and digestEncoding.
     *
     * @todo This function can also be used in Digest auth so that it works correctly for urlencoded and file body types
     *
     * @param {RequestBody} body -
     * @param {String} algorithm -
     * @param {String} digestEncoding -
     * @param {Function} callback -
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
            name: 'awsv4',
            version: '1.0.0'
        },
        updates: [
            {
                property: 'Host',
                type: 'header'
            },
            {
                property: 'Authorization',
                type: 'header'
            },
            {
                property: 'X-Amz-Date',
                type: 'header'
            },
            {
                property: 'X-Amz-Security-Token',
                type: 'header'
            },
            {
                property: 'X-Amz-Content-Sha256',
                type: 'header'
            },
            {
                property: 'X-Amz-Security-Token',
                type: 'url.param'
            },
            {
                property: 'X-Amz-Expires',
                type: 'url.param'
            },
            {
                property: 'X-Amz-Date',
                type: 'url.param'
            },
            {
                property: 'X-Amz-Algorithm',
                type: 'url.param'
            },
            {
                property: 'X-Amz-Credential',
                type: 'url.param'
            },
            {
                property: 'X-Amz-SignedHeaders',
                type: 'url.param'
            },
            {
                property: 'X-Amz-Signature',
                type: 'url.param'
            }
        ]
    },

    /**
     * Initializes a item (fetches all required parameters, etc) before the actual authorization step.
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
     *
     * @param {AuthInterface} auth -
     * @param {AuthHandlerInterface~authPreHookCallback} done -
     */
    pre: function (auth, done) {
        done(null, true);
    },

    /**
     * Verifies whether the request was successful after being sent.
     *
     * @param {AuthInterface} auth -
     * @param {Requester} response -
     * @param {AuthHandlerInterface~authPostHookCallback} done -
     */
    post: function (auth, response, done) {
        done(null, true);
    },

    /**
     * Generates the signature and adds auth data to the request as additional headers/query params.
     * AWS v4 auth mandates that a content type header be present in each request.
     *
     * @param {Request} request request to add auth data
     * @param {Object} params data required for auth
     * @param {Object} params.credentials Should contain the AWS credentials, "accessKeyId" and "secretAccessKey"
     * @param {String} params.host Contains the host name for the request
     * @param {String} params.path Contains the complete path, with query string as well, e.g: /something/kane?hi=ho
     * @param {String} params.service The name of the AWS service
     * @param {String} params.region AWS region
     * @param {String} params.method Request method
     * @param {String} params.body Stringified request body
     * @param {Object} params.headers Each key should be a header key, and the value should be a header value
     * @param {Boolean} params.signQuery Add auth data to query params if true, otherwise add it to headers
     */
    addAuthDataToRequest: function (request, params) {
        var signedData = aws4.sign(params, params.credentials);

        if (params.signQuery) {
            _.forEach(sdk.Url.parse(signedData.path).query, function (param) {
                // only add additional AWS specific params to request
                if (_.startsWith(param.key, X_AMZ_PREFIX) && !request.url.query.has(param.key)) {
                    param.system = true;
                    request.url.query.add(param);
                }
            });
        }

        _.forEach(signedData.headers, function (value, key) {
            request.upsertHeader({
                key: key,
                value: value,
                system: true
            });
        });
    },

    /**
     * Signs a request.
     *
     * @param {AuthInterface} auth -
     * @param {Request} request -
     * @param {AuthHandlerInterface~authSignHookCallback} done -
     */
    sign: function (auth, request, done) {
        var self = this,
            params = auth.get([
                'accessKey',
                'secretKey',
                'sessionToken',
                'service',
                'region',
                'addAuthDataToQuery'
            ]),
            url = urlEncoder.toNodeUrl(request.url),
            dataToSign;

        // Clean up the request (if needed)
        request.removeHeader('Authorization', { ignoreCase: true });
        request.removeHeader('X-Amz-Date', { ignoreCase: true });
        request.removeHeader('X-Amz-Security-Token', { ignoreCase: true });
        request.removeHeader('X-Amz-Content-Sha256', { ignoreCase: true });

        // Not removing `X-Amz-Expires` from params here allowing user to override
        // default value
        request.removeQueryParams([
            'X-Amz-Security-Token',
            'X-Amz-Date',
            'X-Amz-Algorithm',
            'X-Amz-Credential',
            'X-Amz-SignedHeaders',
            'X-Amz-Signature'
        ]);

        dataToSign = {
            credentials: {
                accessKeyId: params.accessKey,
                secretAccessKey: params.secretKey,
                sessionToken: params.sessionToken || undefined
            },
            host: url.host,
            path: url.path, // path = pathname + query
            service: params.service || 'execute-api', // AWS API Gateway is the default service.
            region: params.region || 'us-east-1',
            method: request.method,
            body: undefined, // no need to give body since we are setting 'X-Amz-Content-Sha256' header
            headers: _.transform(request.getHeaders({ enabled: true }), function (accumulator, value, key) {
                accumulator[key] = value;
            }, {}),
            signQuery: params.addAuthDataToQuery
        };

        // Removed the code which was adding content-type header if it is not there in the request. Because
        // aws4 does not require content-type header. It is only mandatory to include content-type header in signature
        // calculation if it is there in the request.
        // Refer: https://docs.aws.amazon.com/AmazonS3/latest/API/sig-v4-header-based-auth.html#canonical-request

        // body hash is not required when adding auth data to qury params
        // @see: https://docs.aws.amazon.com/AmazonS3/latest/API/sigv4-query-string-auth.html
        if (params.addAuthDataToQuery) {
            self.addAuthDataToRequest(request, dataToSign);

            return done();
        }

        // aws4 module can't calculate body hash for body with ReadStream.
        // So we calculate it our self and set 'X-Amz-Content-Sha256' header which will be used by aws4 module
        // to calculate the signature.
        computeBodyHash(request.body, 'sha256', 'hex', function (bodyHash) {
            if (bodyHash) {
                request.upsertHeader({
                    key: BODY_HASH_HEADER,
                    value: bodyHash,
                    system: true
                });

                dataToSign.headers[BODY_HASH_HEADER] = bodyHash;
            }

            self.addAuthDataToRequest(request, dataToSign);

            return done();
        });
    }
};
