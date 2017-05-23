var requests = require('./request-wrapper'),
    util = require('./util'),
    _ = require('lodash'),
    sdk = require('postman-collection'),

    HTTP = 'http',

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
        };
    },

    /**
     * This method is used in conjunction with _.transform method to convert multi-value headers to multiple single
     * value headers
     * @param  {Array} acc
     * @param  {Array|String} val
     * @param  {String} key
     * @return {Object}
     */
    transformMultiValueHeaders = function (acc, val, key) {
        var i, ii;

        if (Array.isArray(val)) {
            for (i = 0, ii = val.length; i < ii; i++) {
                acc.push({
                    key: key,
                    value: val[i]
                });
            }
        }
        else {
            acc.push({
                key: key,
                value: val
            });
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
 * @param {Cursor} cursor
 * @param {Function} callback
 */
Requester.prototype.request = function (item, triggers, cursor, callback) {
    var request = item.request,
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
            // bubble up http errors
            // @todo - Should we send an empty sdk Response here?
            triggers.io(err, cursor, HTTP, undefined, request);
            return callback(err, undefined, request);
        }

        var responseString,
            responseTime,
            responseJSON,
            cookies,
            response;

        // holds the response as a string
        responseString = ((resBody !== null && resBody !== undefined) && resBody.toString) ?
            resBody.toString() : resBody;
        if (responseString === '[object ArrayBuffer]') {
            responseString = util.arrayBufferToString(resBody);
        }

        // Calculate the time taken for us to get the response.
        responseTime = Date.now() - startTime;

        // This helps us to unify the information from XHR or Node calls.
        responseJSON = util.jsonifyResponse(res, requestOptions, responseString);

        // Pull out cookies from the cookie jar, and make them chrome compatible.
        cookies = (cookieJar && _.isFunction(cookieJar.getCookies)) ?
            _.transform(cookieJar.getCookies(requestOptions.url), function (acc, cookie) {
                acc.push(toChromeCookie(cookie));
            }, []) : [];

        // Response in the SDK format
        response = new sdk.Response({ // @todo get rid of jsonifyResponse
            code: responseJSON.statusCode,
            status: res && res.statusMessage,
            header: _.transform(responseJSON.headers, transformMultiValueHeaders, []),
            stream: resBody,
            responseTime: responseTime
        });

        // Insert the missing sent headers in the request object, so that they get bubbled up into the UI
        _.forOwn(responseJSON.request && responseJSON.request.headers, function (value, key) {
            // todo: this should also be done in the request utils, so that it's appropriately updated there,
            // and there's a clear separation between what we added vs what Node added.
            request.upsertHeader({ key: key, value: value });
        });

        triggers.io(null, cursor, HTTP, response, request);

        callback(null, response, request, cookies);
    });
};

module.exports.Requester = Requester;
