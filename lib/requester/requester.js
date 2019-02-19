var _ = require('lodash'),
    core = require('./core'),
    Emitter = require('events'),
    inherits = require('inherits'),
    sdk = require('postman-collection'),
    requests = require('./request-wrapper'),

    ERROR_RESTRICTED_ADDRESS = 'NETERR: getaddrinfo ENOTFOUND ',

    /**
     * Headers which gets overwritten by the requester.
     *
     * @private
     * @const
     * @type {Object}
     */
    OVERWRITTEN_HEADERS = {
        cookie: true, // cookies get appended with `;`
        referer: true // referer gets updated on redirects
    },

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
     *
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
 * @param trace
 * @param options
 * @param {Boolean} [options.keepAlive=true] Optimizes HTTP connections by keeping them alive, so that new requests
 * to the same host are made over the same underlying TCP connection.
 * @param {CookieJar} [options.cookieJar] A cookie jar to use with Node requests.
 * @param {Boolean} [options.strictSSL]
 * @param {Boolean} [options.followRedirects=true] If false, returns a 301/302 as the response code
 * instead of following the redirect
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

_.assign(Requester.prototype, /** @lends Requester.prototype */ {

    /**
     * Perform an HTTP request.
     *
     * @param {String} id
     * @param {Request} request
     * @param {Object} protocolProfileBehavior
     * @param {Function} callback
     */
    request: function (id, request, protocolProfileBehavior, callback) {
        var self = this,
            cookieJar,
            requestOptions,
            networkOptions = self.options.network || {},
            startTime = Date.now(),
            hostname,

            complete = function (error, response, cookies) {
                self.emit(id, error, self.trace.cursor, self.trace, response, request, cookies);

                return callback(error, response, request, cookies);
            };

        // at this point the request could have come from collection, auth or sandbox
        // we can't trust the integrity of this request
        // bail out if request url is empty
        if (!(request && request.url && request.url.toString && request.url.toString())) {
            return complete(new Error('runtime:extenstions~request: request url is empty'));
        }

        cookieJar = self.options.cookieJar;
        requestOptions = core.getRequestOptions(request, self.options, protocolProfileBehavior);
        hostname = request.url.getHost();

        // check if host is on the `restrictedAddresses`
        if (networkOptions.restrictedAddresses && core.isAddressRestricted(hostname, networkOptions)) {
            return complete(new Error(ERROR_RESTRICTED_ADDRESS + hostname));
        }

        return requests(request, requestOptions, function (err, res, resBody) {
            if (err) {
                // bubble up http errors
                // @todo - Should we send an empty sdk Response here?
                return complete(err);
            }

            var responseString,
                responseTime,
                responseJSON,
                response,
                requestStart,
                cookies,
                timings,
                header;

            // holds the response as a string
            // eslint-disable-next-line lodash/prefer-is-nil
            responseString = ((resBody !== null && resBody !== undefined) && resBody.toString) ?
                resBody.toString() : resBody;
            if (responseString === '[object ArrayBuffer]') {
                responseString = core.arrayBufferToString(resBody);
            }

            // This helps us to unify the information from XHR or Node calls.
            responseJSON = core.jsonifyResponse(res, requestOptions, responseString);

            // Pull out cookies from the cookie jar, and make them chrome compatible.
            cookies = (cookieJar && _.isFunction(cookieJar.getCookies)) ?
                _.transform(cookieJar.getCookies(requestOptions.url), function (acc, cookie) {
                    acc.push(toChromeCookie(cookie));
                }, []) : [];

            // Calculate the time taken for us to get the response.
            responseTime = Date.now() - startTime;

            if (res && res.timingStart) {
                // runtime + postman-request initialization time
                requestStart = res.timingStart - startTime;

                timings = {
                    start: startTime,
                    offset: {
                        request: requestStart
                    }
                };

                // add initialization overhead to request offsets
                _.forOwn(res.timings, function (value, key) {
                    timings.offset[key] = value + requestStart;
                });

                timings.offset.done = responseTime;

                // update response time to actual response end time
                responseTime = Math.ceil(res.timings.end);
            }

            // Response in the SDK format
            response = new sdk.Response({ // @todo get rid of jsonifyResponse
                code: responseJSON.statusCode,
                status: res && res.statusMessage,
                header: _.transform(responseJSON.headers, transformMultiValueHeaders, []),
                stream: resBody,
                responseTime: responseTime,
                timings: timings
            });

            // Insert the missing sent headers in the request object, so that they get bubbled up into the UI
            _.forOwn(responseJSON.request && responseJSON.request.headers, function (value, key) {
                header = request.headers.one(key);

                // neither request nor runtime overwrites user-defined headers
                // so instead of upsert, just add missing headers to the list
                // with system: true flag.
                // @note headers added by Node e.g. `Connection: keep-alive` are
                // missing from this list.
                // @todo maybe parse raw HTTP header payload to catch em all.
                if (!header) {
                    request.headers.add({key: key, value: value, system: true});

                    return;
                }

                // update headers which gets overwritten by the requester
                if (OVERWRITTEN_HEADERS[key.toLowerCase()] && value !== header.value) {
                    header.update({key: key, value: value, system: true});
                }
            });

            complete(null, response, cookies);
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

_.assign(Requester, /** @lends Requester */ {
    /**
     * Asynchronously create a new requester.
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
