var _ = require('lodash'),
    crypto = require('crypto'),
    oAuth1 = require('node-oauth1'),
    urlEncoder = require('postman-url-encoder'),
    RequestBody = require('postman-collection').RequestBody,
    bodyBuilder = require('../requester/core-body-builder'),

    EMPTY = '',
    RSA = 'RSA',
    HYPHEN = '-',
    PROTOCOL_HTTP = 'http',
    PROTOCOL_SEPARATOR = '://',
    HTTPS_PORT = '443',
    HTTP_PORT = '80',

    OAUTH1_PARAMS = {
        oauthConsumerKey: 'oauth_consumer_key',
        oauthToken: 'oauth_token',
        oauthSignatureMethod: 'oauth_signature_method',
        oauthTimestamp: 'oauth_timestamp',
        oauthNonce: 'oauth_nonce',
        oauthVersion: 'oauth_version',
        oauthSignature: 'oauth_signature',
        oauthCallback: 'oauth_callback',
        oauthVerifier: 'oauth_verifier',
        oauthBodyHash: 'oauth_body_hash'
    };

/**
 * Returns a OAuth1.0-a compatible representation of the request URL, also called "Base URL".
 * For details, http://oauth.net/core/1.0a/#anchor13
 *
 * todo: should we ignore the auth parameters of the URL or not? (the standard does not mention them)
 * we currently are.
 *
 * @private
 * @param {Url} url - Node's URL object
 * @returns {String}
 */
function getOAuth1BaseUrl (url) {
    var port = url.port ? url.port : undefined,
        host = ((port === HTTP_PORT ||
            port === HTTPS_PORT ||
            port === undefined) && url.hostname) || url.host,
        path = url.path,

        // trim to convert 'http:' from Node's URL object to 'http'
        protocol = _.trimEnd(url.protocol || PROTOCOL_HTTP, PROTOCOL_SEPARATOR);

    protocol = (_.endsWith(protocol, PROTOCOL_SEPARATOR) ? protocol : protocol + PROTOCOL_SEPARATOR);

    return protocol.toLowerCase() + host.toLowerCase() + path;
}

/**
 * Query parameters are encoded with WHATWG encoding in the request. OAuth1.0
 * requires the query params to be encoded with the RFC-3986 standard. This
 * function decodes the query parameters and encodes them to the required RFC-3986
 * standard. For details: https://oauth.net/core/1.0a/#encoding_parameters
 *
 * @param {Request} request - request to update query parameters
 * @param {Object} url - Node.js like url object
 */
function updateQueryParamEncoding (request, url) {
    // early bailout if no query is set.
    if (!url.query) {
        return;
    }

    const queryParams = oAuth1.decodeForm(url.query);

    // clear all query parameters
    request.url.query.clear();

    _.forEach(queryParams, function (param) {
        request.url.query.add({
            key: param[0] && oAuth1.percentEncode(param[0]),
            value: param[1] && oAuth1.percentEncode(param[1])
        });
    });
}

/**
 * Calculates body hash with given algorithm and digestEncoding.
 *
 * @param {RequestBody} body Request body
 * @param {String} algorithm Hash algorithm to use
 * @param {String} digestEncoding Encoding of the hash
 * @param {Function} callback Callback function that will be called with body hash
 */
function computeBodyHash (body, algorithm, digestEncoding, callback) {
    if (!(algorithm && digestEncoding)) { return callback(); }

    var hash = crypto.createHash(algorithm),
        originalReadStream,
        rawBody,
        graphqlBody;

    // if body is not available, return hash of empty string
    if (!body || body.isEmpty()) {
        return callback(hash.digest(digestEncoding));
    }

    if (body.mode === RequestBody.MODES.raw) {
        rawBody = bodyBuilder.raw(body.raw).body;
        hash.update(rawBody);

        return callback(hash.digest(digestEncoding));
    }

    // calculations for url-encoded body are not done here unlike other
    // auths(i.e. AWS/HAWK) because it is not required for OAuth1.0

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
            name: 'oauth1',
            version: '1.0.0'
        },
        updates: [
            {
                property: 'Authorization',
                type: 'header'
            },
            {
                property: OAUTH1_PARAMS.oauthConsumerKey,
                type: 'url.param'
            },
            {
                property: OAUTH1_PARAMS.oauthToken,
                type: 'url.param'
            },
            {
                property: OAUTH1_PARAMS.oauthCallback,
                type: 'url.param'
            },
            {
                property: OAUTH1_PARAMS.oauthVerifier,
                type: 'url.param'
            },
            {
                property: OAUTH1_PARAMS.oauthBodyHash,
                type: 'url.param'
            },
            {
                property: OAUTH1_PARAMS.oauthSignatureMethod,
                type: 'url.param'
            },
            {
                property: OAUTH1_PARAMS.oauthTimestamp,
                type: 'url.param'
            },
            {
                property: OAUTH1_PARAMS.oauthNonce,
                type: 'url.param'
            },
            {
                property: OAUTH1_PARAMS.oauthVersion,
                type: 'url.param'
            },
            {
                property: OAUTH1_PARAMS.oauthSignature,
                type: 'url.param'
            },
            {
                property: OAUTH1_PARAMS.oauthConsumerKey,
                type: 'body.urlencoded'
            },
            {
                property: OAUTH1_PARAMS.oauthToken,
                type: 'body.urlencoded'
            },
            {
                property: OAUTH1_PARAMS.oauthCallback,
                type: 'body.urlencoded'
            },
            {
                property: OAUTH1_PARAMS.oauthVerifier,
                type: 'body.urlencoded'
            },
            {
                property: OAUTH1_PARAMS.oauthSignatureMethod,
                type: 'body.urlencoded'
            },
            {
                property: OAUTH1_PARAMS.oauthTimestamp,
                type: 'body.urlencoded'
            },
            {
                property: OAUTH1_PARAMS.oauthNonce,
                type: 'body.urlencoded'
            },
            {
                property: OAUTH1_PARAMS.oauthVersion,
                type: 'body.urlencoded'
            },
            {
                property: OAUTH1_PARAMS.oauthSignature,
                type: 'body.urlencoded'
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
     * Generates and adds oAuth1 data to the request. This function modifies the
     * request passed in the argument.
     *
     * @param {Request} request - request to add oauth1 parameters
     * @param {Object} params - oauth data to generate signature
     * @param {Object} protocolProfileBehavior - Protocol profile behaviors
     * @param {Function} done - callback function
     */
    addAuthDataToRequest: function (request, params, protocolProfileBehavior, done) {
        var url = urlEncoder.toNodeUrl(request.url),
            signatureParams,
            urlencodedBody,
            bodyParams,
            allParams,
            signature,
            message,
            header,
            accessor = {
                consumerSecret: params.consumerSecret || EMPTY,
                tokenSecret: params.tokenSecret || EMPTY,
                privateKey: params.privateKey || EMPTY
            },
            disableUrlEncoding = protocolProfileBehavior && protocolProfileBehavior.disableUrlEncoding;

        signatureParams = [
            { system: true, key: OAUTH1_PARAMS.oauthConsumerKey, value: params.consumerKey },
            { system: true, key: OAUTH1_PARAMS.oauthToken, value: params.token },
            { system: true, key: OAUTH1_PARAMS.oauthSignatureMethod, value: params.signatureMethod },
            { system: true, key: OAUTH1_PARAMS.oauthTimestamp, value: params.timestamp },
            { system: true, key: OAUTH1_PARAMS.oauthNonce, value: params.nonce },
            { system: true, key: OAUTH1_PARAMS.oauthVersion, value: params.version }
        ];

        // bodyHash, callback and verifier parameters are part of extensions of the original OAuth1 spec.
        // So we only include those in signature if they are non-empty, ignoring the addEmptyParamsToSign setting.
        // Otherwise it causes problem for servers that don't support the respective OAuth1 extensions.
        // Issue: https://github.com/postmanlabs/postman-app-support/issues/8737
        if (params.bodyHash) {
            signatureParams.push({ system: true, key: OAUTH1_PARAMS.oauthBodyHash, value: params.bodyHash });
        }

        if (params.callback) {
            signatureParams.push({ system: true, key: OAUTH1_PARAMS.oauthCallback, value: params.callback });
        }

        if (params.verifier) {
            signatureParams.push({ system: true, key: OAUTH1_PARAMS.oauthVerifier, value: params.verifier });
        }

        // filter empty signature parameters
        signatureParams = _.filter(signatureParams, function (param) {
            return params.addEmptyParamsToSign || param.value;
        });

        urlencodedBody = request.body &&
            request.body.mode === RequestBody.MODES.urlencoded &&
            request.body.urlencoded;

        // Body params only need to be included if they are URL encoded.
        // http://oauth.net/core/1.0a/#anchor13
        bodyParams = urlencodedBody ? urlencodedBody.filter(function (param) {
            return !param.disabled;
        }) : [];

        allParams = [].concat(signatureParams, bodyParams);

        message = {
            action: getOAuth1BaseUrl(url),
            method: request.method,
            parameters: _.map(allParams, function (param) {
                return [param.key, param.value];
            })
        };

        try {
            signature = oAuth1.SignatureMethod.sign(message, accessor);
        }
        catch (err) {
            // handle invalid private key errors for RSA signatures
            return done(err);
        }

        // Update the encoding for query parameters to RFC-3986 in accordance with the
        // OAuth1.0a specification: https://oauth.net/core/1.0a/#encoding_parameters
        // disableUrlEncoding option should be respected in authorization flow as well
        if (disableUrlEncoding !== true) {
            updateQueryParamEncoding(request, url);
        }

        signatureParams.push({ system: true, key: OAUTH1_PARAMS.oauthSignature, value: signature });

        // Add signature params to the request. The OAuth specification says
        // that we should add parameters in the following order of preference:
        // 1. Auth Header
        // 2. Body parameters
        // 3. Query parameters
        //
        // http://oauth.net/core/1.0/#consumer_req_param
        if (params.addParamsToHeader) {
            header = oAuth1.getAuthorizationHeader(params.realm, _.map(signatureParams, function (param) {
                return [param.key, param.value];
            }), params.disableHeaderEncoding);

            request.addHeader({
                key: 'Authorization',
                value: header,
                system: true
            });
        }
        else if ((/PUT|POST/).test(request.method) && urlencodedBody) {
            _.forEach(signatureParams, function (param) {
                urlencodedBody.add(param);
            });
        }
        else if (disableUrlEncoding === true) {
            // disableUrlEncoding option should be respected in authorization flow as well
            request.addQueryParams(signatureParams);
        }
        else {
            _.forEach(signatureParams, function (param) {
                request.url.query.add({
                    key: param.key && oAuth1.percentEncode(param.key),
                    value: param.value && oAuth1.percentEncode(param.value),
                    system: true
                });
            });
        }

        done();
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
                'consumerKey',
                'consumerSecret',
                'token',
                'tokenSecret',
                'privateKey',
                'signatureMethod',
                'callback',
                'verifier',
                'timestamp',
                'nonce',
                'version',
                'realm',
                'includeBodyHash',
                'addParamsToHeader',
                'addEmptyParamsToSign',
                'disableHeaderEncoding'
            ]),
            urlencodedBody = request.body,
            signatureAlgo,
            hashAlgo,
            protocolProfileBehavior = auth._protocolProfileBehavior;

        // extract hash and signature algorithm form signatureMethod
        // signature methods are in this format: '<signatureAlgo>-<hashAlgo>' e.g. RSA-SHA1
        hashAlgo = _.split(params.signatureMethod, HYPHEN);
        signatureAlgo = _.upperCase(hashAlgo[0]);
        hashAlgo = hashAlgo[1];

        if (!params.consumerKey ||
            (signatureAlgo !== RSA && !params.consumerSecret) ||
            (signatureAlgo === RSA && !params.privateKey)) {
            return done(); // Nothing to do if required parameters are not present.
        }

        // before this: urlencodedBody = request.body
        // after this: urlencodedBody = request.body.urlencoded or undefined
        urlencodedBody = (urlencodedBody &&
            urlencodedBody.mode === RequestBody.MODES.urlencoded
        ) ? urlencodedBody.urlencoded : undefined;

        // Remove existing headers and params (if any)
        request.removeHeader('Authorization');
        request.removeQueryParams(_.values(OAUTH1_PARAMS));
        urlencodedBody && urlencodedBody.remove(function (param) {
            return _.includes(_.values(OAUTH1_PARAMS), param.key);
        });

        // Generate a new nonce and timestamp
        params.nonce = params.nonce || oAuth1.nonce(11).toString();
        params.timestamp = params.timestamp || oAuth1.timestamp().toString();

        // Ensure that empty parameters are not added to the signature
        if (!params.addEmptyParamsToSign) {
            params = _.reduce(params, function (accumulator, value, key) {
                if (_.isString(value) && (value.trim() === EMPTY)) {
                    return accumulator;
                }
                accumulator[key] = value;

                return accumulator;
            }, {});
        }

        // Don't include body hash as defined in specification
        // @see: https://tools.ietf.org/id/draft-eaton-oauth-bodyhash-00.html#when_to_include
        if (urlencodedBody || !(params.includeBodyHash && hashAlgo)) {
            return self.addAuthDataToRequest(request, params, protocolProfileBehavior, done);
        }

        computeBodyHash(request.body, hashAlgo, 'base64', function (bodyHash) {
            params.bodyHash = bodyHash;

            return self.addAuthDataToRequest(request, params, protocolProfileBehavior, done);
        });
    }
};
