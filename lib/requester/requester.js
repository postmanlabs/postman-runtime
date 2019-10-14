var _ = require('lodash'),
    core = require('./core'),
    Emitter = require('events'),
    inherits = require('inherits'),
    now = require('performance-now'),
    sdk = require('postman-collection'),
    requests = require('./request-wrapper'),

    RESPONSE_START_EVENT_BASE = 'response.start.',
    RESPONSE_END_EVENT_BASE = 'response.end.',

    RESPONSE_START = 'responseStart',
    RESPONSE_END = 'response',

    ERROR_RESTRICTED_ADDRESS = 'NETERR: getaddrinfo ENOTFOUND ',

    /**
     * Headers which get overwritten by the requester.
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
     * Connection Header, added based on agentOptions.keepAlive
     *
     * @private
     * @const
     * @type {Object}
     */
    CONNECTION_HEADER = {
        key: 'Connection',
        keepAlive: 'keep-alive',
        close: 'close'
    },

    /**
     * Creates a sdk compatible cookie from a tough-cookie compatible cookie.
     *
     * @param cookie
     * @returns {Object}
     */
    toPostmanCookie = function (cookie) {
        cookie.toJSON && (cookie = cookie.toJSON());

        return new sdk.Cookie({
            name: cookie.key,
            value: cookie.value,
            expires: cookie.expires === 'Infinity' ? null : cookie.expires,
            maxAge: cookie.maxAge,
            domain: cookie.domain,
            path: cookie.path,
            secure: cookie.secure,
            httpOnly: cookie.httpOnly,
            hostOnly: cookie.hostOnly,
            extensions: cookie.extensions
        });
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

    /**
     * Calculate request timings offset by adding runtime overhead which
     * helps to determine request prepare and process time taken.
     *
     * @param {Number} runtimeTimer - Runtime request start HR time
     * @param {Number} requestTimer - Request start HR time
     * @param {Object} timings - Request timings offset
     * @returns {Object}
     */
    calcTimingsOffset = function (runtimeTimer, requestTimer, timings) {
        if (!(runtimeTimer && requestTimer && timings)) { return; }

        // runtime + postman-request initialization time
        var initTime = requestTimer - runtimeTimer,
            offset = {
                request: initTime
            };

        // add initialization overhead to request offsets
        _.forOwn(timings, function (value, key) {
            offset[key] = value + initTime;
        });

        // total time taken by runtime to get the response
        // @note if offset.end is missing, that means request is not complete.
        //       this is used to calculate timings on responseStart.
        if (offset.end) {
            offset.done = now() - runtimeTimer;
        }

        return offset;
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
            hostname,
            cookieJar,
            requestOptions,
            networkOptions = self.options.network || {},
            startTime = Date.now(),
            startTimer = now(), // high-resolution time
            cookies = [],
            responseHeaders = [],
            responseJSON = {},

            // keep track of `responseStart` and `response` triggers
            _responseStarted = false,
            _responseEnded = false,
            _responseData = {},

            // Refer: https://github.com/postmanlabs/postman-runtime/blob/v7.14.0/docs/history.md
            getExecutionHistory = function (debugInfo) {
                var history = {
                        execution: {
                            verbose: Boolean(requestOptions.verbose),
                            sessions: {},
                            data: []
                        }
                    },
                    executionData = [],
                    requestSessions = {};

                if (!Array.isArray(debugInfo)) {
                    return history;
                }

                // prepare history from request debug data
                debugInfo.forEach(function (debugData) {
                    if (!debugData) { return; }

                    // @todo cache connection sessions and fetch reused session
                    // from the requester pool.
                    if (debugData.session && !requestSessions[debugData.session.id]) {
                        requestSessions[debugData.session.id] = debugData.session.data;
                    }

                    executionData.push({
                        request: debugData.request,
                        response: debugData.response,
                        timings: debugData.timings && {
                            // runtime start time
                            start: startTime,
                            // request start time
                            requestStart: debugData.timingStart,
                            // offsets calculated are relative to runtime start time
                            offset: calcTimingsOffset(startTimer, debugData.timingStartTimer, debugData.timings)
                        },
                        session: debugData.session && {
                            id: debugData.session.id,
                            // is connection socket reused
                            reused: debugData.session.reused
                        }
                    });
                });

                // update history object
                history.execution.data = executionData;
                history.execution.sessions = requestSessions;

                return history;
            },

            /**
             * Add the missing/system headers in the request object
             *
             * @param {Object[]} headers
             */
            addMissingRequestHeaders = function (headers) {
                var header,
                    keepAlive,
                    lowerCasedKey;

                _.forOwn(headers, function (value, key) {
                    header = request.headers.one(key);
                    lowerCasedKey = _.lowerCase(key);

                    // neither request nor runtime overwrites user-defined headers
                    // so instead of upsert, just add missing headers to the list
                    // with system: true flag.
                    if (!header || header.disabled) {
                        request.headers.add({
                            key: key,
                            value: value,
                            system: true
                        });

                        return;
                    }

                    // bail out if
                    // 1. header is not one of overwritten headers
                    // 2. overwritten header value is not updated
                    if (!(OVERWRITTEN_HEADERS[lowerCasedKey] && value !== header.value)) {
                        return;
                    }

                    // in case of duplicate headers, remove all the duplicates
                    // just keep the last item in the list.
                    if (Array.isArray(_.get(request.headers, ['reference', lowerCasedKey]))) {
                        request.headers.remove(function (h) {
                            return _.lowerCase(h.key) === lowerCasedKey && h !== header;
                        });
                    }

                    // update headers which gets overwritten by the requester
                    header.update({
                        key: key,
                        value: value,
                        system: true
                    });
                });

                keepAlive = _.get(requestOptions, 'agentOptions.keepAlive');

                // @note Connection header is added by Node based on the agent's
                // keepAlive option. Don't add if custom is defined already.
                if (!request.headers.has(CONNECTION_HEADER.key)) {
                    request.headers.add({
                        key: CONNECTION_HEADER.key,
                        value: keepAlive ? CONNECTION_HEADER.keepAlive : CONNECTION_HEADER.close,
                        system: true
                    });
                }
            },

            /**
             * Helper function to trigger `callback` and complete the request function
             *
             * @param {Error} error - error while requesting
             * @param {Response} response - SDK Response instance
             * @param {Object} history - Request-Response History
             */
            onEnd = function (error, response, history) {
                self.emit(RESPONSE_END_EVENT_BASE + id, error, self.trace.cursor,
                    self.trace, response, request, cookies, history);

                return callback(error, response, request, cookies, history);
            },

            /**
             * Helper function to keep track of `responseStart` and `response`
             * triggers to make they are emitted in correct order.
             *
             * @todo fix requester control flow to remove this hack!
             *  this is required because CookieJar.getCookies is async method
             *  and by that time postman-request ends the request, which affects
             *  request post-send helpers because `response.start` event is not
             *  emitted on time and shared variables `cookies`, `responseJSON`,
             *  and, `responseHeaders` are initialized in onStart function.
             *
             * @param {String} trigger - trigger name
             * @param {Response} response - SDK Response instance
             * @param {Object} history - Request-Response History
             */
            onComplete = function (trigger, response, history) {
                if (trigger === RESPONSE_START) {
                    // set flag for responseStart callback
                    _responseStarted = true;

                    // if response is ended, end the response using cached data
                    if (_responseEnded) {
                        onEnd(null, _responseData.response, _responseData.history);
                    }

                    // bail out and wait for response end if not ended already
                    return;
                }

                // if response started, don't wait and end the response
                if (_responseStarted) {
                    onEnd(null, response, history);

                    return;
                }

                // wait for responseStart and cache response callback data
                _responseEnded = true;
                _responseData = {
                    response: response,
                    history: history
                };
            },

            /**
             * Helper function to trigger `responseStart` callback and
             * - transform postman-request response instance to SDK Response
             * - filter cookies
             * - filter response headers
             * - add missing request headers
             *
             * @param {Object} response - Postman-Request response instance
             */
            onStart = function (response) {
                var responseStartEventName = RESPONSE_START_EVENT_BASE + id,
                    sdkResponse,
                    history,
                    done = function () {
                        // emit the response.start event which eventually
                        // triggers responseStart callback
                        self.emit(responseStartEventName, null, sdkResponse, request, cookies, history);

                        // trigger completion of responseStart
                        onComplete(RESPONSE_START);
                    };

                // @todo get rid of jsonifyResponse
                responseJSON = core.jsonifyResponse(response, requestOptions);

                // transform response headers to SDK compatible HeaderList
                responseHeaders = _.transform(responseJSON.headers, transformMultiValueHeaders, []);

                // initialize SDK Response instance
                sdkResponse = new sdk.Response({
                    status: response && response.statusMessage,
                    code: responseJSON.statusCode,
                    header: responseHeaders
                });

                // add missing request headers so that they get bubbled up into the UI
                addMissingRequestHeaders(responseJSON.request && responseJSON.request.headers);

                // prepare history from request debug data
                history = getExecutionHistory(_.get(response, 'request._debug'));

                // Pull out cookies from the cookie jar, and make them chrome compatible.
                if (cookieJar && _.isFunction(cookieJar.getCookies)) {
                    cookieJar.getCookies(requestOptions.url, function (err, cookiesFromJar) {
                        if (err) {
                            return done();
                        }

                        cookies = _.transform(cookiesFromJar, function (acc, cookie) {
                            acc.push(toPostmanCookie(cookie));
                        }, []);

                        cookies = new sdk.CookieList(null, cookies);

                        done();
                    });
                }
                else {
                    cookies = new sdk.CookieList(null, []);
                    done();
                }
            };

        // at this point the request could have come from collection, auth or sandbox
        // we can't trust the integrity of this request
        // bail out if request url is empty
        if (!(request && request.url && request.url.toString && request.url.toString())) {
            return onEnd(new Error('runtime:extenstions~request: request url is empty'));
        }

        cookieJar = self.options.cookieJar;
        requestOptions = core.getRequestOptions(request, self.options, protocolProfileBehavior);
        hostname = request.url.getHost();

        // check if host is on the `restrictedAddresses`
        if (networkOptions.restrictedAddresses && core.isAddressRestricted(hostname, networkOptions)) {
            return onEnd(new Error(ERROR_RESTRICTED_ADDRESS + hostname));
        }

        return requests(request, requestOptions, onStart, function (err, res, resBody, debug) {
            if (err) {
                // bubble up http errors
                // @todo - Should we send an empty sdk Response here?
                return onEnd(err);
            }

            var responseTime,
                response,
                history;

            // Calculate the time taken for us to get the response.
            responseTime = Date.now() - startTime;

            if (res && res.timings) {
                // update response time to actual response end time
                // of the final request in the redirect chain.
                responseTime = Math.ceil(res.timings.end);
            }

            // prepare history from request debug data
            history = getExecutionHistory(debug);

            // Response in the SDK format
            // @todo reuse same response instance used for responseStart callback
            response = new sdk.Response({
                code: responseJSON.statusCode,
                status: res && res.statusMessage,
                header: responseHeaders,
                stream: resBody,
                responseTime: responseTime
            });

            onComplete(RESPONSE_END, response, history);
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
