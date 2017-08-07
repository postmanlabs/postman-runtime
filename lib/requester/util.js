var _ = require('lodash'),
    sdk = require('postman-collection'),
    version = require('../../package.json').version,

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

    GET = 'get';

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
            self = this,
            bodyParams,
            url;

        !defaultOpts && (defaultOpts = {});

        // @todo replace this with request.header.toObject(true, true, true, true); once the sanitize option has been
        // added to PropertyList~toObject
        options.headers = self.getRequestHeaders(request);
        url = request.url.toString();
        options.url = /^https?:\/\//.test(url) ? url : 'http://' + url;
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
            return key.toLowerCase() === headerKey.toLowerCase()
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
            computedBody = { body: content };
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

        for (i = 0, ii = arr.length; i < ii; i+=2) {
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
    }
};
