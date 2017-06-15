var _ = require('lodash'),
    util = require('./util'),
    Emitter = require('events'),
    inherits = require('inherits'),
    sdk = require('postman-collection'),
    RequestCookieJar = require('postman-request').jar,
    requests = require('./request-wrapper'),

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

    Requester;

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
inherits(Requester = function (trace, options) {
    this.options = {
        keepAlive: _.get(options, 'keepAlive', true),

        // Create a cookie jar if one is not provided
        cookieJar: options && options.cookieJar || RequestCookieJar(),

        timeout: _.get(options, 'timeout'),
        strictSSL: _.get(options, 'strictSSL'),
        sendBodyWithGetRequests: _.get(options, 'sendBodyWithGetRequests', false),
        followRedirects: _.get(options, 'followRedirects', true)
    };
    this.trace = trace;
    Requester.super_.call(this);
}, Emitter);

_.extend(Requester.prototype, /** @lends Requester.prototype */ {

    /**
     * Perform an HTTP request.
     *
     * @param {String} id
     * @param {Item} item
     * @param {Function} callback
     */
    request: function (id, item, callback) {
        var self = this,
            request = item.request,
            cookieJar = self.options.cookieJar,
            requestOptions = util.getRequestOptions(request, self.options),
            startTime = Date.now();

        return requests(request, requestOptions, function (err, res, resBody) {
            if (err) {
                // bubble up http errors
                // @todo - Should we send an empty sdk Response here?
                self.emit(id, err, self.trace.cursor, self.trace, undefined, request);
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

            self.emit(id, null, self.trace.cursor, self.trace, response, request, cookies);

            callback(null, response, request, cookies);
        });
    }
});

_.extend(Requester, /** @lends Requester */ {
    /**
     * Asyncronously create a new requester.
     *
     * @param trace
     * @param trace.type - type of requester to return (for now, just http)
     * @param trace.source - information about who needs this requester, e.g Auth, etc.
     * @param trace.cursor - the cursor
     * @param options
     * @param callback
     * @returns {*}
     */
    create: function (trace, options, callback) {
        return callback(null, new Requester(trace, options));
    }
});

module.exports.Requester = Requester;
