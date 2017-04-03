var requests = require('./request-wrapper'),
    util = require('./util'),
    _ = require('lodash'),
    httpReasons = require('http-reasons'),

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
     * @param {Boolean} [options.strictSSL]
     * @param {Boolean} [options.followRedirects=true] If false, returns a 301/302 as the response code instead of following the redirect
     * @note `options.keepAlive` is only supported in Node.
     * @note `options.cookieJar` is only supported in Node.
     * @constructor
     */
    Requester = function (options) {
        this.keepAlive = _.get(options, 'keepAlive', true);
        this.cookieJar = _.get(options, 'cookieJar');
        this.timeout = _.get(options, 'timeout');
        this.strictSSL = _.get(options, 'strictSSL');
        this.sendBodyWithGetRequests = _.get(options, 'sendBodyWithGetRequests', false);
        this.followRedirects = _.get(options, 'followRedirects', true);
    };

/**
 * Perform an HTTP request.
 *
 * @param {Item} item
 * @param triggers
 * @param {Function} cb
 * @param {Object} scope
 */
Requester.prototype.request = function (item, triggers, cb, scope) {
    var request = item.request,
        cursor = item._cursor,
        cookieJar = this.cookieJar,
        requestOptions = util.getRequestOptions(request, {
            keepAlive: this.keepAlive,
            cookieJar: cookieJar,
            timeout: this.timeout,
            strictSSL: this.strictSSL,
            sendBodyWithGetRequests: this.sendBodyWithGetRequests,
            followRedirects: this.followRedirects
        }),
        startTime = Date.now();

    return requests(request, requestOptions, function (err, res, resBody) {
        if (err) {
            triggers.http(err, cursor); // bubble up http errors
            return cb.call(scope || this, err);
        }

        var responseString,
            responseTime,
            responseJSON,
            legacyRequest,
            legacyResponse,
            cookies,
            codeReason,
            response;

        // holds the response as a string
        responseString = (resBody != null && resBody.toString) ? resBody.toString() : resBody;
        if (responseString === '[object ArrayBuffer]') {
            responseString = util.arrayBufferToString(resBody);
        }

        // Calculate the time taken for us to get the response.
        responseTime = Date.now() - startTime;

        // This helps us to unify the information from XHR or Node calls.
        responseJSON = util.jsonifyResponse(res, requestOptions, responseString);

        // An object that is used in the app for certain things. Should be removed.
        legacyRequest = _.assign(responseJSON.request, {
            id: item.id,
            name: item.name,
            description: item.request.description ? item.request.description.toString() : undefined
        });

        // Pull out cookies from the cookie jar, and make them chrome compatible.
        cookies = (cookieJar && _.isFunction(cookieJar.getCookies)) ?
            _.transform(cookieJar.getCookies(requestOptions.url), function (acc, cookie) {
                acc.push(toChromeCookie(cookie));
            }, []) : [];

        // get the reason phrase
        codeReason = httpReasons.lookup(responseJSON.statusCode);
        if (res && res.statusMessage) {
            codeReason.name = res && res.statusMessage;
            codeReason.fromServer = true;
        }

        // An object that is used in the app for certain things (such as response code details). Should be removed.
        legacyResponse = {
            responseBody: responseString,
            responseHeaders: responseJSON.headers,
            responseTime: responseTime,
            responseCode: {
                code: responseJSON.statusCode,
                name: codeReason.name || '',
                detail: codeReason.detail || '',
                fromServer: codeReason.fromServer
            },
            responseCookies: cookies
        };

        // Response in the SDK format
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
            request.upsertHeader({ key: key, value: value });
        });

        triggers.http(null, cursor, response, request);

        cb.call(scope || this, null, response, request, legacyResponse, legacyRequest);
    });
};

module.exports.Requester = Requester;
