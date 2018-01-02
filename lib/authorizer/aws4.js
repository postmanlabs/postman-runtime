var aws4 = require('aws4'),
    _ = require('lodash'),
    RequestBody = require('postman-collection').RequestBody;

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
                property: 'Content-Length',
                type: 'header'
            },
            {
                property: 'Content-Type',
                type: 'header'
            },
            {
                property: 'Host',
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
        done(null, true);
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
     * Generates the signature, and returns the Authorization, X-Amz-Date and Content-Type headers.
     * AWS v4 auth mandates that a content type header be present in each request.
     *
     * @param {Object} params
     * @param {Object} params.credentials Should contain the AWS credentials, "accessKeyId" and "secretAccessKey"
     * @param {String} params.host Contains the host name for the request
     * @param {String} params.path Contains the complete path, with query string as well, e.g: /something/kane?hi=ho
     * @param {String} params.service The name of the AWS service
     * @param {String} params.region AWS region
     * @param {String} params.method Request method
     * @param {String} params.body Stringified request body
     * @param {Object} params.headers Each key should be a header key, and the value should be a header value
     */
    computeHeader: function (params) {
        return aws4.sign(params, params.credentials);
    },

    /**
     * Signs a request.
     *
     * @param {AuthInterface} auth
     * @param {Request} request
     * @param {AuthHandlerInterface~authSignHookCallback} done
     */
    sign: function (auth, request, done) {
        var mode,
            signedData,
            params = auth.get([
                'accessKey',
                'secretKey',
                'sessionToken',
                'service',
                'region'
            ]);

        // Clean up the request (if needed)
        request.removeHeader('Authorization', {ignoreCase: true});
        request.removeHeader('X-Amz-Date', {ignoreCase: true});
        request.removeHeader('X-Amz-Security-Token', {ignoreCase: true});
        if (!request.getHeaders({ignoreCase: true})['content-type']) {
            // Since AWS v4 requires a content type header to be set, add one.
            mode = _.get(request, 'body.mode');
            request.addHeader({
                key: 'Content-Type',
                value: (mode === RequestBody.MODES.formdata) ?
                    'multipart/form-data' : 'application/x-www-form-urlencoded',
                system: true
            });
        }
        signedData = this.computeHeader({
            credentials: {
                accessKeyId: params.accessKey,
                secretAccessKey: params.secretKey,
                sessionToken: params.sessionToken || undefined
            },
            host: request.url.getRemote(),
            path: request.url.getPathWithQuery(),
            service: params.service || 'execute-api', // AWS API Gateway is the default service.
            region: params.region || 'us-east-1',
            method: request.method,
            body: request.body ? request.body.toString() : undefined,
            headers: _.transform(request.getHeaders({enabled: true}), function (accumulator, value, key) {
                accumulator[key] = value;
            }, {})
        });

        _.forEach(signedData.headers, function (value, key) {
            request.upsertHeader({
                key: key,
                value: value,
                system: true
            });
        });
        return done();
    }
};
