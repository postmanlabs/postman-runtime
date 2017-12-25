var _ = require('lodash'),
    dns = require('dns'),
    Socket = require('net').Socket,

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

    sdk = require('postman-collection'),
    version = require('../../package.json').version,

    ERROR_ADDRESS_RESOLVE = 'NETERR: getaddrinfo ENOTFOUND ',

    /**
     * Different modes for a request body.
     *
     * @enum {String}
     */
    REQUEST_MODES = {
        RAW: 'raw',
        URLENCODED: 'urlencoded',
        FORMDATA: 'formdata',
        FILE: 'file'
    },

    GET = 'get',

    /**
     * Abstracts out the logic for domain resolution
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
            lowercaseHost = hostname.toLowerCase(),
            networkOpts = lookupOptions.network || {},
            hostLookup = networkOpts.hostLookup;

        if (lowercaseHost !== LOCALHOST) {
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
    };

module.exports = {

    /**
     * Creates a node request compatible options object from a request.
     *
     * @param request
     * @param defaultOpts
     * @param defaultOpts.keepAlive
     * @param defaultOpts.timeout
     * @param defaultOpts.strictSSL
     * @param defaultOpts.cookieJar The cookie jar to use (if any).
     * @param defaultOpts.followRedirects
     * @returns {{}}
     */
    getRequestOptions: function (request, defaultOpts) {
        var options = {},
            networkOptions = defaultOpts.network || {},
            self = this,
            bodyParams,
            url,
            isSSL,
            portNumber,
            port = request.url && request.url.port,
            hostname = request.url && request.url.getHost();

        !defaultOpts && (defaultOpts = {});

        // @todo replace this with request.header.toObject(true, true, true, true); once the sanitize option has been
        // added to PropertyList~toObject
        options.headers = self.getRequestHeaders(request);
        url = request.url.toString();
        options.url = (/^https?:\/\//).test(url) ? url : 'http://' + url;
        options.method = request.method;
        options.jar = defaultOpts.cookieJar || true;
        options.timeout = defaultOpts.timeout;
        options.gzip = true;

        // Ensures that "request" creates URL encoded formdata or querystring as
        // foo=bar&foo=baz instead of foo[0]=bar&foo[1]=baz
        options.useQuerystring = true;
        options.strictSSL = defaultOpts.strictSSL;

        // keeping the same convention as Newman
        options.followRedirect = defaultOpts.followRedirects;
        options.followAllRedirects = defaultOpts.followRedirects;

        // Request body may return different options depending on the type of the body.
        bodyParams = self.getRequestBody(request, defaultOpts);

        // set encoding to null so that the response is a stream
        options.encoding = null;

        // Insert any headers that XHR inserts, to keep the Node version compatible with the Chrome App
        if (bodyParams && bodyParams.body) {
            self.ensureHeaderExists(options.headers, 'Content-Type', 'text/plain');
        }
        self.ensureHeaderExists(options.headers, 'User-Agent', 'PostmanRuntime/' + version);
        self.ensureHeaderExists(options.headers, 'Accept', '*/*');

        // The underlying Node client does add the host header by itself, but we add it anyway, so that
        // it is bubbled up to us after the request is made. If left to the underlying core, it's not :/
        self.ensureHeaderExists(options.headers, 'Host', request.url.getRemote());

        // override DNS lookup
        if (networkOptions.restrictedAddresses || hostname.toLowerCase() === LOCALHOST || networkOptions.hostLookup) {
            isSSL = _.startsWith(request.url.protocol, HTTPS);
            portNumber = Number(port) || (isSSL ? HTTPS_DEFAULT_PORT : HTTP_DEFAULT_PORT);

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
     * Returns a header object
     *
     * @param request
     * @returns {{}}
     */
    getRequestHeaders: function (request) {
        var headers = {};
        if (request.headers) {
            request.forEachHeader(function (header) {
                if (header && (header.disabled || !header.key)) { return; }

                var key = header.key,
                    value = header.value;

                if (headers[key]) {
                    _.isArray(headers[key]) ? headers[key].push(value) :
                        (headers[key] = [headers[key], value]);
                }
                else {
                    headers[key] = value;
                }
            });
            return headers;
        }
    },

    /**
     * Processes a request body and puts it in a format compatible with
     * the "request" library.
     *
     * @todo: Move this to the SDK.
     * @param request
     * @param options
     */
    getRequestBody: function (request, options) {
        var mode = _.get(request, 'body.mode'),
            body = _.get(request, 'body'),
            method = request && _.isString(request.method) ? request.method.toLowerCase() : undefined,
            empty = body ? body.isEmpty() : true,
            content,
            computedBody;

        if (empty || (method === GET && !options.sendBodyWithGetRequests)) {
            return;
        }

        content = body[mode];

        if (_.isFunction(content.all)) {
            content = content.all();
        }

        if (mode === REQUEST_MODES.RAW) {
            computedBody = {body: content};
        }
        else if (mode === REQUEST_MODES.URLENCODED) {
            computedBody = {
                form: _.reduce(content, function (accumulator, param) {
                    if (param.disabled) { return accumulator; }

                    // This is actually pretty simple,
                    // If the variable already exists in the accumulator, we need to make the value an Array with
                    // all the variable values inside it.
                    if (accumulator[param.key]) {
                        _.isArray(accumulator[param.key]) ? accumulator[param.key].push(param.value) :
                            (accumulator[param.key] = [accumulator[param.key], param.value]);
                    }
                    else {
                        accumulator[param.key] = param.value;
                    }
                    return accumulator;
                }, {})
            };
        }
        else if (request.body.mode === REQUEST_MODES.FORMDATA) {
            computedBody = {
                formData: _.reduce(content, function (accumulator, param) {
                    if (param.disabled) { return accumulator; }

                    // This is actually pretty simple,
                    // If the variable already exists in the accumulator, we need to make the value an Array with
                    // all the variable values inside it.
                    if (accumulator[param.key]) {
                        _.isArray(accumulator[param.key]) ? accumulator[param.key].push(param.value) :
                            (accumulator[param.key] = [accumulator[param.key], param.value]);
                    }
                    else {
                        accumulator[param.key] = param.value;
                    }
                    return accumulator;
                }, {})
            };
        }
        else if (request.body.mode === REQUEST_MODES.FILE) {
            computedBody = {
                body: _.get(request, 'body.file.content')
            };
        }
        return computedBody;
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
                    href: requestOptions.url
                },
                url: requestOptions.url
            });

            rawResponse.rawHeaders &&
                (responseJSON.headers = this.arrayPairsToObject(rawResponse.rawHeaders) || responseJSON.headers);
            return responseJSON;
        }

        responseBody = responseBody || '';

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
                    href: requestOptions.url
                },
                url: requestOptions.url,
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
