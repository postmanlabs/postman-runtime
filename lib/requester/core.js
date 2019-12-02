var dns = require('dns'),
    constants = require('constants'),

    _ = require('lodash'),
    uuid = require('uuid/v4'),
    sdk = require('postman-collection'),
    urlEncoder = require('postman-url-encoder'),

    Socket = require('net').Socket,

    requestBodyBuilders = require('./core-body-builder'),
    version = require('../../package.json').version,

    LOCAL_IPV6 = '::1',
    LOCAL_IPV4 = '127.0.0.1',
    LOCALHOST = 'localhost',
    SOCKET_TIMEOUT = 500,

    COLON = ':',
    HOSTS_TYPE = {
        HOST_IP_MAP: 'hostIpMap'
    },
    HTTPS = 'https',
    HTTPS_DEFAULT_PORT = 443,
    HTTP_DEFAULT_PORT = 80,

    S_CONNECT = 'connect',
    S_ERROR = 'error',
    S_TIMEOUT = 'timeout',

    SSL_OP_NO = 'SSL_OP_NO_',

    ERROR_ADDRESS_RESOLVE = 'NETERR: getaddrinfo ENOTFOUND ',

    /**
     * List of request methods without body.
     *
     * @private
     * @type {Object}
     *
     * @note hash is used to reduce the lookup cost
     *       these methods are picked from the app, which don't support body.
     * @todo move this list to SDK for parity.
     */
    METHODS_WITHOUT_BODY = {
        get: true,
        copy: true,
        head: true,
        purge: true,
        unlock: true
    },

    /**
     * List of request options with their corresponding protocol profile behavior property name;
     *
     * @private
     * @type {Object}
     */
    PPB_OPTS = {
        // enable or disable certificate verification
        strictSSL: 'strictSSL',

        // maximum number of redirects to follow (default: 10)
        maxRedirects: 'maxRedirects',

        // controls redirect behavior
        // keeping the same convention as Newman
        followRedirect: 'followRedirects',
        followAllRedirects: 'followRedirects',

        // retain `authorization` header when a redirect happens to a different hostname
        followAuthorizationHeader: 'followAuthorizationHeader',

        // redirect with the original HTTP method (default: redirects with GET)
        followOriginalHttpMethod: 'followOriginalHttpMethod',

        // removes the `referer` header when a redirect happens (default: false)
        // @note `referer` header set in the initial request will be preserved during redirect chain
        removeRefererHeader: 'removeRefererHeaderOnRedirect'
    },

    /**
     * Helper function to extract top level domain for the given hostname
     *
     * @private
     *
     * @param {String} hostname
     * @returns {String}
     */
    getTLD = function (hostname) {
        if (!hostname) {
            return '';
        }

        hostname = String(hostname);

        return hostname.substring(hostname.lastIndexOf('.') + 1);
    },

    /**
     * Abstracts out the logic for domain resolution
     *
     * @param options
     * @param hostLookup
     * @param hostLookup.type
     * @param hostLookup.hostIpMap
     * @param hostname
     * @param callback
     */
    _lookup = function (options, hostLookup, hostname, callback) {
        var hostIpMap,
            resolvedFamily = 4,
            resolvedAddr;

        // first we try to resolve the hostname using hosts file configuration
        hostLookup && hostLookup.type === HOSTS_TYPE.HOST_IP_MAP &&
            (hostIpMap = hostLookup[HOSTS_TYPE.HOST_IP_MAP]) && (resolvedAddr = hostIpMap[hostname]);

        if (resolvedAddr) {
            // since we only get an string for the resolved ip address, we manually find it's family (4 or 6)
            // there will be at-least one `:` in an IPv6 (https://en.wikipedia.org/wiki/IPv6_address#Representation)
            resolvedAddr.indexOf(COLON) !== -1 && (resolvedFamily = 6); // eslint-disable-line lodash/prefer-includes

            // returning error synchronously causes uncaught error because listeners are not attached to error events
            // on socket yet
            return setImmediate(function () {
                callback(null, resolvedAddr, resolvedFamily);
            });
        }

        // no hosts file configuration provided or no match found. Falling back to normal dns lookup
        return dns.lookup(hostname, options, callback);
    },

    /**
     * Tries to make a TCP connection to the given host and port. If successful, the connection is immediately
     * destroyed.
     *
     * @param host
     * @param port
     * @param callback
     */
    connect = function (host, port, callback) {
        var socket = new Socket(),
            called,

            done = function (type) {
                if (!called) {
                    callback(type === S_CONNECT ? null : true); // eslint-disable-line callback-return
                    called = true;
                    this.destroy();
                }
            };

        socket.setTimeout(SOCKET_TIMEOUT, done.bind(socket, S_TIMEOUT));
        socket.once('connect', done.bind(socket, S_CONNECT));
        socket.once('error', done.bind(socket, S_ERROR));
        socket.connect(port, host);
        socket = null;
    },

    /**
     * Override DNS lookups in Node, to handle localhost as a special case.
     * Chrome tries connecting to IPv6 by default, so we try the same thing.
     *
     * @param lookupOptions
     * @param lookupOptions.port
     * @param lookupOptions.network
     * @param lookupOptions.network.restrictedAddresses
     * @param lookupOptions.network.hostLookup
     * @param lookupOptions.network.hostLookup.type
     * @param lookupOptions.network.hostLookup.hostIpMap
     * @param hostname
     * @param options
     * @param callback
     */
    lookup = function (lookupOptions, hostname, options, callback) {
        var self = this,
            lowercaseHost = hostname && hostname.toLowerCase(),
            networkOpts = lookupOptions.network || {},
            hostLookup = networkOpts.hostLookup;

        // do dns.lookup if hostname is not one of:
        // - localhost
        // - *.localhost
        if (getTLD(lowercaseHost) !== LOCALHOST) {
            return _lookup(options, hostLookup, lowercaseHost, function (err, addr, family) {
                if (err) { return callback(err); }

                return callback(self.isAddressRestricted(addr, networkOpts) ?
                    new Error(ERROR_ADDRESS_RESOLVE + hostname) : null, addr, family);
            });
        }

        // Try checking if we can connect to IPv6 localhost ('::1')
        connect(LOCAL_IPV6, lookupOptions.port, function (err) {
            // use IPv4 if we cannot connect to IPv6
            if (err) { return callback(null, LOCAL_IPV4, 4); }

            callback(null, LOCAL_IPV6, 6);
        });
    },

    /**
     * Resolves given property with protocol profile behavior.
     * Returns protocolProfileBehavior value if the given property is present.
     * Else, returns value defined in default options.
     *
     * @param {String} property - Property name to look for
     * @param {Object} defaultOpts - Default request options
     * @param {Object} protocolProfileBehavior - Protocol profile behaviors
     * @returns {*} - Resolved request option value
     */
    resolveWithProtocolProfileBehavior = function (property, defaultOpts, protocolProfileBehavior) {
        // bail out if property or defaultOpts is not defined
        if (!(property && defaultOpts)) { return; }

        if (protocolProfileBehavior && protocolProfileBehavior.hasOwnProperty(property)) {
            return protocolProfileBehavior[property];
        }

        return defaultOpts[property];
    };

module.exports = {

    /**
     * Creates a node request compatible options object from a request.
     *
     * @param request
     * @param defaultOpts
     * @param defaultOpts.network
     * @param defaultOpts.keepAlive
     * @param defaultOpts.timeout
     * @param defaultOpts.strictSSL
     * @param defaultOpts.cookieJar The cookie jar to use (if any).
     * @param defaultOpts.followRedirects
     * @param defaultOpts.followOriginalHttpMethod
     * @param defaultOpts.maxRedirects
     * @param defaultOpts.maxResponseSize
     * @param defaultOpts.implicitCacheControl
     * @param defaultOpts.implicitTraceHeader
     * @param defaultOpts.removeRefererHeaderOnRedirect
     * @param defaultOpts.timings
     * @param protocolProfileBehavior
     * @returns {{}}
     */
    getRequestOptions: function (request, defaultOpts, protocolProfileBehavior) {
        var options = {},
            networkOptions = defaultOpts.network || {},
            self = this,
            bodyParams,
            url = request.url && urlEncoder.toNodeUrl(request.url.toString(true)),
            isSSL = _.startsWith(url.protocol, HTTPS),
            isTunnelingProxy = request.proxy && (request.proxy.tunnel || isSSL),
            reqOption,
            portNumber,
            behaviorName,
            port = url && url.port,
            hostname = url && url.hostname && url.hostname.toLowerCase(),
            proxyHostname = request.proxy && request.proxy.host;

        !defaultOpts && (defaultOpts = {});
        !protocolProfileBehavior && (protocolProfileBehavior = {});

        // resolve all *.localhost to localhost itself
        // RFC: 6761 section 6.3 (https://tools.ietf.org/html/rfc6761#section-6.3)
        if (getTLD(hostname) === LOCALHOST) {
            // @note setting hostname to localhost ensures that we override lookup function
            hostname = LOCALHOST;
        }

        if (getTLD(proxyHostname) === LOCALHOST) {
            proxyHostname = LOCALHOST;
        }

        options.url = url;
        options.method = request.method;
        options.jar = defaultOpts.cookieJar || true;
        options.timeout = defaultOpts.timeout;
        options.gzip = true;
        options.time = defaultOpts.timings;
        options.verbose = defaultOpts.verbose;
        options.extraCA = defaultOpts.extendedRootCA;
        options.ignoreProxyEnvironmentVariables = defaultOpts.ignoreProxyEnvironmentVariables;

        // Disable encoding of URL in postman-request in order to use pre-encoded URL object returned from
        // toNodeUrl() function of postman-url-encoder
        options.disableUrlEncoding = true;

        // Ensures that "request" creates URL encoded formdata or querystring as
        // foo=bar&foo=baz instead of foo[0]=bar&foo[1]=baz
        options.useQuerystring = true;

        // set encoding to null so that the response is a stream
        options.encoding = null;

        // eslint-disable-next-line guard-for-in
        for (reqOption in PPB_OPTS) {
            behaviorName = PPB_OPTS[reqOption];
            options[reqOption] = resolveWithProtocolProfileBehavior(behaviorName, defaultOpts, protocolProfileBehavior);
        }

        // use the server's cipher suite order instead of the client's during negotiation
        if (protocolProfileBehavior.tlsPreferServerCiphers) {
            options.honorCipherOrder = true;
        }

        // the SSL and TLS protocol versions to disabled during negotiation
        if (Array.isArray(protocolProfileBehavior.tlsDisabledProtocols)) {
            protocolProfileBehavior.tlsDisabledProtocols.forEach(function (protocol) {
                options.secureOptions |= constants[SSL_OP_NO + protocol];
            });
        }

        // order of cipher suites that the SSL server profile uses to establish a secure connection
        if (Array.isArray(protocolProfileBehavior.tlsCipherSelection)) {
            options.ciphers = protocolProfileBehavior.tlsCipherSelection.join(':');
        }

        if (typeof defaultOpts.maxResponseSize === 'number') {
            options.maxResponseSize = defaultOpts.maxResponseSize;
        }

        // Request body may return different options depending on the type of the body.
        bodyParams = self.getRequestBody(request, protocolProfileBehavior);

        // @note getRequestBody may add system headers based on intent
        options.headers = request.getHeaders({enabled: true, sanitizeKeys: true});

        self.ensureHeaderExists(options.headers, 'User-Agent', 'PostmanRuntime/' + version);
        self.ensureHeaderExists(options.headers, 'Accept', '*/*');

        defaultOpts.implicitCacheControl && self.ensureHeaderExists(options.headers, 'Cache-Control', 'no-cache');
        // @todo avoid invoking uuid() if header exists
        defaultOpts.implicitTraceHeader && self.ensureHeaderExists(options.headers, 'Postman-Token', uuid());

        // The underlying Node client does add the host header by itself, but we add it anyway, so that
        // it is bubbled up to us after the request is made. If left to the underlying core, it's not :/
        self.ensureHeaderExists(options.headers, 'Host', url.host);

        // override DNS lookup
        if (networkOptions.restrictedAddresses || hostname === LOCALHOST ||
            (!isTunnelingProxy && proxyHostname === LOCALHOST) || networkOptions.hostLookup) {
            // Use proxy port for localhost resolution in case of non-tunneling proxy
            // because the request will be sent to proxy server by postman-request
            if (request.proxy && !isTunnelingProxy) {
                portNumber = Number(request.proxy.port);
            }
            // Otherwise, use request's port
            else {
                portNumber = Number(port) || (isSSL ? HTTPS_DEFAULT_PORT : HTTP_DEFAULT_PORT);
            }

            _.isFinite(portNumber) && (options.lookup = lookup.bind(this, {
                port: portNumber,
                network: networkOptions
            }));
        }

        _.assign(options, bodyParams, {
            agentOptions: {
                keepAlive: defaultOpts.keepAlive
            }
        });

        return options;
    },

    /**
     * Checks if a header already exists. If it does not, sets the value to whatever is passed as
     * `defaultValue`
     *
     * @param {object} headers
     * @param {String} headerKey
     * @param {String} defaultValue
     */
    ensureHeaderExists: function (headers, headerKey, defaultValue) {
        var headerName = _.findKey(headers, function (value, key) {
            return key.toLowerCase() === headerKey.toLowerCase();
        });

        if (!headerName) {
            headers[headerKey] = defaultValue;
        }
    },

    /**
     * Processes a request body and puts it in a format compatible with
     * the "request" library.
     *
     * @todo: Move this to the SDK.
     * @param request - Request object
     * @param protocolProfileBehavior - Protocol profile behaviors
     *
     * @returns {Object}
     */
    getRequestBody: function (request, protocolProfileBehavior) {
        if (!(request && request.body)) {
            return;
        }

        var requestBody = request.body,
            requestBodyType = requestBody.mode,
            requestMethod = (typeof request.method === 'string') ? request.method.toLowerCase() : undefined,
            bodyIsEmpty = requestBody.isEmpty(),
            bodyIsDisabled = requestBody.disabled,
            bodyContent = requestBody[requestBodyType],

            // flag to decide body pruning for METHODS_WITHOUT_BODY
            // @note this will be `true` even if protocolProfileBehavior is undefined
            pruneBody = protocolProfileBehavior ? !protocolProfileBehavior.disableBodyPruning : true;

        // early bailout for empty or disabled body (this area has some legacy shenanigans)
        if (bodyIsEmpty || bodyIsDisabled) {
            return;
        }

        // bail out if request method doesn't support body and pruneBody is true.
        if (METHODS_WITHOUT_BODY[requestMethod] && pruneBody) {
            return;
        }

        // even if body is not empty, but the body type is not known, we do not know how to parse the same
        //
        // @note if you'd like to support additional body types beyond formdata, url-encoding, etc, add the same to
        //       the builder module
        if (!requestBodyBuilders.hasOwnProperty(requestBodyType)) {
            return;
        }

        return requestBodyBuilders[requestBodyType](bodyContent, request);
    },

    /**
     * Returns a JSON compatible with the Node's request library. (Also contains the original request)
     *
     * @param rawResponse Can be an XHR response or a Node request compatible response.
     *              about the actual request that was sent.
     * @param requestOptions Options that were used to send the request.
     * @param responseBody Body as a string.
     */
    jsonifyResponse: function (rawResponse, requestOptions, responseBody) {
        if (!rawResponse) {
            return;
        }

        var responseJSON;

        if (rawResponse.toJSON) {
            responseJSON = rawResponse.toJSON();
            responseJSON.request && _.assign(responseJSON.request, {
                data: requestOptions.form || requestOptions.formData || requestOptions.body || {},
                uri: { // @todo remove this
                    href: requestOptions.url && requestOptions.url.href || requestOptions.url
                },
                url: requestOptions.url && requestOptions.url.href || requestOptions.url
            });

            rawResponse.rawHeaders &&
                (responseJSON.headers = this.arrayPairsToObject(rawResponse.rawHeaders) || responseJSON.headers);

            return responseJSON;
        }

        responseBody = responseBody || '';

        // @todo drop support or isolate XHR requester in v8
        // XHR :/
        return {
            statusCode: rawResponse.status,
            body: responseBody,
            headers: _.transform(sdk.Header.parse(rawResponse.getAllResponseHeaders()), function (acc, header) {
                acc[header.key] = header.value;
            }, {}),
            request: {
                method: requestOptions.method || 'GET',
                headers: requestOptions.headers,
                uri: { // @todo remove this
                    href: requestOptions.url && requestOptions.url.href || requestOptions.url
                },
                url: requestOptions.url && requestOptions.url.href || requestOptions.url,
                data: requestOptions.form || requestOptions.formData || requestOptions.body || {}
            }
        };
    },

    /**
     * ArrayBuffer to String
     *
     * @param {ArrayBuffer} buffer
     * @returns {String}
     */
    arrayBufferToString: function (buffer) {
        var str = '',
            uArrayVal = new Uint8Array(buffer),

            i,
            ii;

        for (i = 0, ii = uArrayVal.length; i < ii; i++) {
            str += String.fromCharCode(uArrayVal[i]);
        }

        return str;
    },

    /**
     * Converts an array of sequential pairs to an object.
     *
     * @param arr
     * @returns {{}}
     *
     * @example
     * ['a', 'b', 'c', 'd'] ====> {a: 'b', c: 'd' }
     */
    arrayPairsToObject: function (arr) {
        if (!_.isArray(arr)) {
            return;
        }

        var obj = {},
            key,
            val,
            i,
            ii;

        for (i = 0, ii = arr.length; i < ii; i += 2) {
            key = arr[i];
            val = arr[i + 1];

            if (_.has(obj, key)) {
                !_.isArray(obj[key]) && (obj[key] = [obj[key]]);
                obj[key].push(val);
            }
            else {
                obj[key] = val;
            }
        }

        return obj;
    },

    /**
     * Checks if a given host or IP is has been restricted in the options.
     *
     * @param {String} host
     * @param {Object} networkOptions
     * @param {Array<String>} networkOptions.restrictedAddresses
     *
     * @returns {Boolean}
     */
    isAddressRestricted: function (host, networkOptions) {
        return networkOptions.restrictedAddresses &&
            networkOptions.restrictedAddresses[(host && host.toLowerCase())];
    }
};
