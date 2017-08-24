var aws4 = require('aws4'),
    _ = require('lodash'),
    RequestBody = require('postman-collection').RequestBody,

    // These auto-added headers interfere with the AWS Auth signing process.
    // Ideally, they're not supposed to be a part of the signature calculation
    NON_SIGNABLE_HEADERS = ['cache-control', 'postman-token'];

module.exports = {
    /**
     * Initializes a item (fetches all required parameters, etc) before the actual authorization step.
     *
     * @param {RequestContext} context
     * @param {Requester} requester
     * @param done
     */
    init: function (context, requester, done) {
        done(null);
    },

    /**
     * Checks the item, and fetches any parameters that are not already provided.
     *
     * @param {RequestContext} context
     * @param {Requester} requester
     * @param done
     */
    pre: function (context, requester, done) {
        done(null, true);
    },

    /**
     * Verifies whether the request was successful after being sent.
     *
     * @param {RequestContext} context
     * @param {Requester} requester
     * @param done
     */
    post: function (context, requester, done) {
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
     * @param {Request} request
     * @todo - this should be made into ".sign" after the signature calculation is moved out of the SDK.
     */
    sign: function (request) {
        var self = this,
            params = this,
            mode,
            signedData;

        if (!params) { return request; } // Nothing to do if no parameters are present.

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
        signedData = self.computeHeader({
            credentials: {
                accessKeyId: params.accessKey,
                secretAccessKey: params.secretKey,
                sessionToken: params.sessionToken || undefined
            },
            host: request.url.getRemote(),
            path: request.url.getPathWithQuery(),
            service: params.service || params.serviceName || 'execute-api', // AWS API Gateway is the default service.
            region: params.region || 'us-east-1',
            method: request.method,
            body: request.body ? request.body.toString() : undefined,
            headers: _.transform(request.getHeaders({enabled: true}), function (accumulator, value, key) {
                if (!_.includes(NON_SIGNABLE_HEADERS, key.toLowerCase())) {
                    accumulator[key] = value;
                }
            }, {})
        });

        _.forEach(signedData.headers, function (value, key) {
            // TODO: figure out a better way of handling errors.
            if (!_.includes(['content-length', 'content-type', 'host'], key.toLowerCase())) {
                request.upsertHeader({
                    key: key,
                    value: value,
                    system: true
                });
            }
        });
        return request;
    }
};
