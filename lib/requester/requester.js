var requests = require('./request-wrapper'),
    util = require('./util'),
    _ = require('lodash'),
    httpCodes = require('./http-codes'),

    /**
     * Creates a Chrome-compatible cookie from a tough-cookie compatible cookie.
     *
     * @param cookie
     * @returns {Object}
     */
    toChromeCookie = function (cookie) {
        cookie.toJSON && (cookie = cookie.toJSON());

        return {
            domain: cookie.domain,
            hostOnly: cookie.hostOnly,
            httpOnly: cookie.httpOnly,
            name: cookie.key,
            path: cookie.path,
            secure: cookie.secure,
            storeId: 'PostmanCookieStore',
            value: cookie.value
        }
    },

    /**
     * Creates a new Requester, which is used to make HTTP(s) requests.
     *
     * @param options
     * @param {Boolean} [options.keepAlive=true] Optimizes HTTP connections by keeping them alive, so that new requests
     * to the same host are made over the same underlying TCP connection.
     * @param {CookieJar} [options.cookieJar] A cookie jar to use with Node requests.
     * @param {CertificateManager} [options.certificateManager] Something to get certificates from
     * @param {FileResolver} {options.fileResolver} *Deprecated* An object that provides a function called
     * `createReadStream` which is called when uploading files.
     * @param {Boolean} [options.strictSSL]
     * @param {Boolean} [options.followRedirects=true] If false, returns a 301/302 as the response code instead of following the redirect
     * @note `options.keepAlive` is only supported in Node.
     * @note `options.cookieJar` is only supported in Node.
     * @constructor
     */
    Requester = function (options) {
        this.keepAlive = _.get(options, 'keepAlive') === undefined ? true : options.keepAlive;
        this.cookieJar = _.get(options, 'cookieJar');
        this.timeout = _.has(options, 'timeout') ? options.timeout : undefined;
        this.fileResolver = _.get(options, 'fileResolver');
        this.strictSSL = _.get(options, 'strictSSL');
        this.certificateManager = _.get(options, 'certificateManager');
        this.proxyManager = _.get(options, 'proxyManager');
        this.followRedirects = _.has(options, 'followRedirects') ? options.followRedirects : true;
    };

/**
 * Perform an HTTP request.
 *
 * @param item
 * @param cb
 * @param scope
 */
Requester.prototype.request = function (item, cb, scope) {
    var request = item.request,
        cookieJar = this.cookieJar,
        requestOptions = util.getRequestOptions(request, {
            keepAlive: this.keepAlive,
            cookieJar: cookieJar,
            timeout: this.timeout,
            strictSSL: this.strictSSL,
            followRedirects: this.followRedirects,
        }),
        startTime = Date.now();

    requestOptions.request = request;
    requestOptions.certificateManager = this.certificateManager;
    requestOptions.proxyManager = this.proxyManager;

    return requests(requestOptions, function (err, res, resBody) {
        if (err) {
            return cb.call(scope || this, err);
        }

        var responseString = (resBody != null && resBody.toString) ? resBody.toString() : resBody;
        if (responseString === '[object ArrayBuffer]') {
            responseString = util.arrayBufferToString(resBody);
        }

        var responseTime = Date.now() - startTime,
            responseJSON = util.jsonifyResponse(res, requestOptions, responseString),
            legacyRequest = _.extend(responseJSON.request, {
                id: item.id,
                name: item.name,
                description: item.request.description ? item.request.description.toString() : undefined
            }),
            cookies = (cookieJar && _.isFunction(cookieJar.getCookies)) ?
                _.transform(cookieJar.getCookies(requestOptions.url), function (acc, cookie) {
                    acc.push(toChromeCookie(cookie));
                }, []) : [],
            legacyResponse = {
                responseBody: responseString,
                responseHeaders: responseJSON.headers,
                responseTime: responseTime,
                responseCode: {
                    code: responseJSON.statusCode,
                    name: httpCodes[responseJSON.statusCode] ? httpCodes[responseJSON.statusCode].name : '',
                    detail: httpCodes[responseJSON.statusCode] ? httpCodes[responseJSON.statusCode].detail: ''
                },
                responseCookies: cookies
            },
            response = { // @todo get rid of jsonifyResponse
                code: legacyResponse.responseCode.code,
                header: legacyResponse.responseHeaders,
                body: responseString,
                stream: resBody,
                cookie: undefined, // @todo get from cookieJar and implement loading/unloading in SDK
                responseTime: responseTime
            };

        // Insert the missing sent headers in the request object, so that they get bubbled up into the UI
        _.forOwn(legacyRequest.headers, function (value, key) {
            // todo: this should also be done in the request utils, so that it's appropriately updated there,
            // and there's a clear separation between what we added vs what Node added.
            if (!request.headers.one(key)) {
                request.addHeader({ key: key, value: value });
            }
        });

        cb.call(scope || this, null, legacyResponse, legacyRequest, response, request);
    });
};

module.exports.Requester = Requester;
