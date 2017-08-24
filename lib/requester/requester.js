var _ = require('lodash'),
    util = require('./util'),
    Emitter = require('events'),
    inherits = require('inherits'),
    sdk = require('postman-collection'),
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
 *
 * @extends {EventEmitter}
 * @constructor
 */
inherits(Requester = function (trace, options) {
    this.options = options || {};

    // protect the timeout value from being non-numeric or infinite
    if (!_.isFinite(this.options.timeout)) {
        this.options.timeout = undefined;
    }

    this.trace = trace;
    Requester.super_.call(this);
}, Emitter);

_.extend(Requester.prototype, /** @lends Requester.prototype */ {

    /**
     * Perform an HTTP request.
     *
     * @param {String} id
     * @param {Request} request
     * @param {Function} callback
     */
    request: function (id, request, callback) {
        var error,
            self = this,
            cookieJar,
            requestOptions,
            startTime;

        // at this point the request could have come from collection, auth or sandbox
        // we can't trust the integrity of this request
        // bail out if request url is empty
        if (!(request && request.url && request.url.toString && request.url.toString())) {
            error = new Error('runtime:extenstions~request: request url is empty');
            this.emit(id, error, this.trace.cursor, this.trace, undefined, request);
            return callback(error, undefined, request);
        }

        cookieJar = self.options.cookieJar;
        requestOptions = util.getRequestOptions(request, self.options);
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
    },

    /**
     * Removes all current event listeners on the requester, and makes it ready for garbage collection :).
     *
     * @param {Function=} cb - Optional callback to be called on disposal
     *
     * @todo - In the future, when the requester manages its own connections etc, close them all here.
     */
    dispose: function (cb) {
        // This is safe for us, because we do not use wait on events. (i.e, no part of Runtime ever waits on
        // any event to occur). We rely on callbacks for that, only choosing to use events as a way of streaming
        // information outside runtime.
        this.removeAllListeners();

        _.isFunction(cb) && cb();
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
