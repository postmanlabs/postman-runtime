var _ = require('lodash'),
    oAuth1 = require('node-oauth1'),
    urlEncoder = require('postman-url-encoder'),
    RequestBody = require('postman-collection').RequestBody,

    EMPTY = '',
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
        oauthSignature: 'oauth_signature'
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
        path = url.pathname,

        // trim to convert 'http:' from Node's URL object to 'http'
        protocol = _.trimEnd(url.protocol || PROTOCOL_HTTP, PROTOCOL_SEPARATOR);

    protocol = (_.endsWith(protocol, PROTOCOL_SEPARATOR) ? protocol : protocol + PROTOCOL_SEPARATOR);

    return protocol.toLowerCase() + host.toLowerCase() + path;
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
     * @param {AuthInterface} auth
     * @param {Response} response
     * @param {AuthHandlerInterface~authInitHookCallback} done
     */
    init: function (auth, response, done) {
        done(null);
    },

    /**
     * Verifies whether the request has valid basic auth credentials (which is always).
     * Sanitizes the auth parameters if needed.
     *
     * @param {AuthInterface} auth
     * @param {AuthHandlerInterface~authPreHookCallback} done
     */
    pre: function (auth, done) {
        done(null, true);
    },

    /**
     * Verifies whether the basic auth succeeded.
     *
     * @param {AuthInterface} auth
     * @param {Response} response
     * @param {AuthHandlerInterface~authPostHookCallback} done
     */
    post: function (auth, response, done) {
        done(null, true);
    },

    /**
     * Generates a oAuth1.
     *
     * @param {Object} params
     * @param {String} params.url OAuth 1.0 Base URL
     * @param {String} params.method Request method
     * @param {Object[]} params.helperParams The auth parameters stored with the `Request`
     * @param {Object[]} params.queryParams An array of query parameters
     * @param {Object[]} params.bodyParams An array of request body parameters (in case of url-encoded bodies)
     *
     * @returns {*}
     */
    computeHeader: function (params) {
        var url = params.url,
            method = params.method,
            helperParams = params.helperParams,
            queryParams = params.queryParams,
            bodyParams = params.bodyParams,
            signatureParams,
            message,
            accessor = {},
            allParams,
            signature;

        signatureParams = [
            {system: true, key: OAUTH1_PARAMS.oauthConsumerKey, value: helperParams.consumerKey},
            {system: true, key: OAUTH1_PARAMS.oauthToken, value: helperParams.token},
            {system: true, key: OAUTH1_PARAMS.oauthSignatureMethod, value: helperParams.signatureMethod},
            {system: true, key: OAUTH1_PARAMS.oauthTimestamp, value: helperParams.timestamp},
            {system: true, key: OAUTH1_PARAMS.oauthNonce, value: helperParams.nonce},
            {system: true, key: OAUTH1_PARAMS.oauthVersion, value: helperParams.version}
        ];

        signatureParams = _.filter(signatureParams, function (param) {
            return helperParams.addEmptyParamsToSign || param.value;
        });

        allParams = [].concat(signatureParams, queryParams, bodyParams);
        message = {
            action: url,
            method: method,
            parameters: _.map(allParams, function (param) {
                return [param.key, param.value];
            })
        };

        if (helperParams.consumerSecret) {
            accessor.consumerSecret = helperParams.consumerSecret;
        }
        if (helperParams.tokenSecret) {
            accessor.tokenSecret = helperParams.tokenSecret;
        }
        signature = oAuth1.SignatureMethod.sign(message, accessor);
        signatureParams.push({system: true, key: OAUTH1_PARAMS.oauthSignature, value: signature});

        return signatureParams;
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
                'consumerKey',
                'consumerSecret',
                'token',
                'tokenSecret',
                'signatureMethod',
                'timestamp',
                'nonce',
                'version',
                'realm',
                'addParamsToHeader',
                'addEmptyParamsToSign',
                'disableHeaderEncoding'
            ]),
            url = urlEncoder.toNodeUrl(request.url),
            signatureParams,
            header;

        if (!params.consumerKey || !params.consumerSecret) {
            return done(); // Nothing to do if required parameters are not present.
        }

        // Remove existing headers and params (if any)
        request.removeHeader('Authorization');
        request.removeQueryParams(_.values(OAUTH1_PARAMS));
        request.body && request.body.urlencoded && request.body.urlencoded.remove(function (param) {
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

        // Generate a list of parameters associated with the signature.
        signatureParams = this.computeHeader({
            url: getOAuth1BaseUrl(url),
            method: request.method,
            queryParams: request.url.query && request.url.query.count() ? request.url.query.map(function (qParam) {
                return {
                    key: qParam.key,
                    value: qParam.value
                };
            }) : [],

            // todo: WTF! figure out a better way
            // Body params only need to be included if they are URL encoded.
            // http://oauth.net/core/1.0a/#anchor13
            bodyParams: (request.body &&
                request.body.mode === RequestBody.MODES.urlencoded &&
                request.body.urlencoded &&
                request.body.urlencoded.count &&
                request.body.urlencoded.count()) ? request.body.urlencoded.map(function (formParam) {
                    return {
                        key: formParam.key,
                        value: formParam.value
                    };
                }) : [],
            helperParams: params
        });

        // The OAuth specification says that we should add parameters in the following order of preference:
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
        else if ((/PUT|POST/).test(request.method) &&
                (request.body && request.body.mode === RequestBody.MODES.urlencoded)) {
            _.forEach(signatureParams, function (param) {
                request.body.urlencoded.add(param);
            });
        }
        else {
            request.addQueryParams(signatureParams);
        }

        return done();
    }
};
