// Browser Request
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/* eslint-disable */
var _ = require('lodash');
var parseHeadersString = require('postman-collection').Header.parse;
request.log = {
    'trace': noop, 'debug': noop, 'info': noop, 'warn': noop, 'error': noop
}

var CORS_ERROR_CODE = 'ERR_PM_CORS'; // Custom error code for CORS errors
var MIXED_CONTENT_ERROR_CODE = 'ERR_PM_MIXED_CONTENT'; // Custom error code for mixed content error
var DEFAULT_TIMEOUT = 3 * 60 * 1000 // 3 minutes

// The body is ignored if the request method is GET or HEAD.
// Refer: https://xhr.spec.whatwg.org/#the-send()-method
var METHODS_WITHOUT_BODY = {
    'GET': true,
    'HEAD': true
};

// Refer: https://developer.mozilla.org/en-US/docs/Glossary/Forbidden_header_name
var FORBIDDEN_HEADERS = {
    'accept-charset': true,
    'accept-encoding': true,
    'access-control-request-headers': true,
    'access-control-request-method': true,
    connection: true,
    'content-length': true,
    cookie: true,
    cookie2: true,
    date: true,
    dnt: true,
    expect: true,
    'feature-policy': true,
    host: true,
    'keep-alive': true,
    origin: true,
    referer: true,
    te: true,
    trailer: true,
    'transfer-encoding': true,
    upgrade: true,
    via: true
};

var IS_LOCALHOST = {
    'localhost': true,
    '127.0.0.1': true,
    '127.1': true,
    '[::1]': true
};

function forEachAsync (items, fn, cb) {
    !cb && (cb = function () { /* (ಠ_ಠ) */ })

    if (!(Array.isArray(items) && fn)) { return cb() }

    var index = 0
    var totalItems = items.length
    function next (err) {
      if (err || index >= totalItems) {
        return cb(err)
      }

      try {
        fn.call(items, items[index++], next)
      } catch (error) {
        return cb(error)
      }
    }

    if (!totalItems) { return cb() }

    next()
}

//
// request
//

function request(originalRequest, options, onStart, callback) {
    var options_onResponse = options.onResponse; // Save this for later.
    var XHR = _.get(options, ['agents', options.url && options.url.protocol.slice(0, -1), 'agentClass']) || XMLHttpRequest;

    if(typeof options === 'string')
        options = {'uri':options};
    else
        options = _.clone(options); // Use a duplicate for mutating.

    options.onResponse = options_onResponse // And put it back.

    if (options.verbose) request.log = getLogger();

    if(options.url) {
        options.uri = options.url && options.url.href || options.url;
        delete options.url;
    }

    if(!options.uri && options.uri !== "")
        return callback(new Error("options.uri is a required argument"));

    if(typeof options.uri != "string")
        return callback(new Error("options.uri must be a string"));

    options.onStart = onStart
    options.callback = callback
    options.method = options.method || 'GET';
    options.headers = _.reduce(options.headers || {}, function (accumulator, value, key) {
        if (!XHR._allowForbiddenHeaders && isForbiddenHeader(key)) {
            // mutate original request and options as these will be passed in the
            // request and response callbacks.
            originalRequest.headers.remove(key);
            delete options.headers[key];

            return accumulator;
        }

        accumulator[key] = value;
        return accumulator;
    }, {});
    options.body    = options.body || null
    options.timeout = options.timeout || request.DEFAULT_TIMEOUT

    if(options.headers.host)
        console.warn("Request: Options.headers.host is not supported");

    if(options.json) {
        options.headers.accept = options.headers.accept || 'application/json'
        if(options.method !== 'GET')
            options.headers['content-type'] = 'application/json'

        if(typeof options.json !== 'boolean')
            options.body = JSON.stringify(options.json)
        else if(typeof options.body !== 'string')
            options.body = JSON.stringify(options.body)
    }

    //BEGIN QS Hack
    var serialize = function(obj) {
        var str = [];
        for(var p in obj)
            if (obj.hasOwnProperty(p)) {
                if (_.isArray(obj[p])) {
                    _.forEach(obj[p], function (value) {
                        str.push(encodeURIComponent(p) + "=" + encodeURIComponent(value));
                    });
                }
                else {
                    str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
                }
            }
        return str.join("&");
    }

    if(options.qs){
        var qs = (typeof options.qs == 'string')? options.qs : serialize(options.qs);
        if(options.uri.indexOf('?') !== -1){ //no get params
            options.uri = options.uri+'&'+qs;
        }else{ //existing get params
            options.uri = options.uri+'?'+qs;
        }
    }
    //END QS Hack

    //BEGIN FORM Hack
    var multipart = function (data) {
        if (!Array.isArray(data)) { return; }

        var i,
            ii,
            formParam,
            formData = new FormData();

        for (i = 0, ii = data.length; i < ii; i++) {
            if (!(formParam = data[i])) { continue; }

            if (Array.isArray(formParam.value)) {
                formParam.value.forEach(function (value) {
                    formData.append(formParam.key, value);
                });
            }
            else {
                formData.append(formParam.key, formParam.value);
            }
        }

        return {
            body: formData
        };
    };

    if(options.form){
        if(typeof options.form == 'string') {
            console.warn('form name unsupported');
        }
        if(XHR._allowBodyInGET || !METHODS_WITHOUT_BODY[options.method]) {
            var encoding = (options.encoding || 'application/x-www-form-urlencoded').toLowerCase();

            if (!options.headers['content-type'] && !options.headers['Content-Type']) {
                options.headers['content-type'] = encoding;
            }

            switch(encoding){
                case 'application/x-www-form-urlencoded':
                    options.body = serialize(options.form).replace(/%20/g, "+");
                    break;
                case 'multipart/form-data':
                    var multi = multipart(options.form);
                    //options.headers['content-length'] = multi.length;
                    options.body = multi.body;
                    options.headers['content-type'] = multi.type;
                    break;
                default : console.warn('unsupported encoding:'+encoding);
            }
        }
    }
    if (options.formData && (XHR._allowBodyInGET || !METHODS_WITHOUT_BODY[options.method])) {
        var multipartBody = multipart(options.formData);
        //options.headers['content-length'] = multipartBody.length;
        options.body = multipartBody.body;
        multipartBody.type && (options.headers['content-type'] = multipartBody.type);
    }
    //END FORM Hack

    // If onResponse is boolean true, call back immediately when the response is known,
    // not when the full request is complete.
    options.onResponse = options.onResponse || noop
    if(options.onResponse === true) {
        options.onResponse = callback
        options.callback = noop
    }

    // XXX Browsers do not like this.
    //if(options.body)
    //  options.headers['content-length'] = options.body.length;

    // HTTP basic authentication
    if(!options.headers.authorization && options.auth)
        options.headers.authorization = 'Basic ' + b64_enc(options.auth.username + ':' + options.auth.password);


    // Query cookie jar if available
    if ((typeof (options.jar && options.jar.getCookieString) === 'function')) {
        options.jar.getCookieString(options.uri, function (_, cookies) {
            if (cookies && cookies.length) {
                options.cookiesFromJar = cookies;
            }

            run_xhr(XHR, originalRequest, options)
        })
    }
    else {
        return run_xhr(XHR, originalRequest, options)
    }
}

var req_seq = 0
function run_xhr(XHR, originalRequest, options) {
    var xhr = new XHR(options)
        , timed_out = false
        , is_cors = is_crossDomain(options.uri)
        , supports_cors = ('withCredentials' in xhr)

    req_seq += 1
    xhr.seq_id = req_seq
    xhr.id = req_seq + ': ' + options.method + ' ' + options.uri
    xhr._id = xhr.id // I know I will type "_id" from habit all the time.

    if(is_cors && !supports_cors) {
        // This should never happen in our app
        var cors_err = new Error('Browser does not support cross-origin request: ' + options.uri);
        cors_err.code = CORS_ERROR_CODE;
        cors_err.cors = 'unsupported';
        options.callback(cors_err, xhr);
        return xhr;
    }

    xhr.timeoutTimer = setTimeout(too_late, options.timeout)
    function too_late() {
        timed_out = true
        var er = new Error('ETIMEDOUT')
        er.code = 'ETIMEDOUT'
        er.duration = options.timeout

        request.log.error('Timeout', { 'id':xhr._id, 'milliseconds':options.timeout })
        return options.callback(er, xhr)
    }

    // Some states can be skipped over, so remember what is still incomplete.
    var did = {'response':false, 'loading':false, 'end':false, 'onStart': false}

    xhr.onreadystatechange = on_state_change
    xhr.open(options.method, options.uri, true) // asynchronous
    if (is_cors) {
        xhr.withCredentials = !! options.withCredentials
    }
    (options.encoding === null) && (xhr.responseType = "arraybuffer");
    xhr.send(options.body)
    return xhr

    function on_state_change(event) {
        if(timed_out)
            return request.log.debug('Ignoring timed out state change', {'state':xhr.readyState, 'id':xhr.id})

        request.log.debug('State change', {'state':xhr.readyState, 'id':xhr.id, 'timed_out':timed_out})

        if(xhr.readyState === XHR.OPENED) {
            request.log.debug('Request started', { 'id': xhr.id });

            var cookies = [],
                onInvalidHeader = function (key, error) {
                    error = new Error(`Header "${key}" contains invalid characters`);

                    // Do not process this request further.
                    did.response = true
                    did.loading = true
                    did.end = true

                    options.callback(error, xhr)
                };

            for (var key in options.headers) {
                if (!options.headers.hasOwnProperty(key)) {
                    continue;
                }

                // Save all the cookies and add at the end because
                if (String(key).toLowerCase() === 'cookie') {
                    cookies.push(options.headers[key]);
                    continue;
                }

                try {
                    if (Array.isArray(options.headers[key])) {
                        _.forEach(options.headers[key], function (eachValue) {
                            xhr.setRequestHeader(key, eachValue);
                        });
                    }
                    else {
                        xhr.setRequestHeader(key, options.headers[key]);
                    }
                } catch (error) {
                    onInvalidHeader(key, error)
                }
            }

            // Add `Cookie` header if cookies are present
            if (cookies.length || options.cookiesFromJar) {
                try {
                    var cookieString = cookies.join('; ') + (options.cookiesFromJar || '');

                    xhr.setRequestHeader('Cookie', cookieString);
                    // Also add update the original request header for console logs
                    originalRequest.headers.upsert({
                        key: 'Cookie',
                        value: cookieString
                    });
                } catch (error) {
                    onInvalidHeader('Cookie', error)
                }
            }
        }

        else if(xhr.readyState === XHR.HEADERS_RECEIVED)
            on_response()

        else if(xhr.readyState === XHR.LOADING) {
            on_response()
            on_loading()
        }

        else if(xhr.readyState === XHR.DONE) {
            on_response()
            on_loading()
            on_end()
        }
    }

    function on_response() {
        if(did.response)
            return

        did.response = true
        request.log.debug('Got response', {'id':xhr.id, 'status':xhr.status})
        clearTimeout(xhr.timeoutTimer)
        xhr.statusCode = xhr.status // Node request compatibility

        // Construct postman-request compatible debug object
        !xhr.request && (xhr.request = {});

        xhr.request._debug = xhr._debugData || [{
            request: {
                method: options.method,
                href: options.uri,
                headers: originalRequest.headers.toJSON(),
                httpVersion: '1.1'
            },
            response: {
                statusCode: xhr.statusCode,
                headers: parseHeadersString(xhr.getAllResponseHeaders()),
                httpVersion: '1.1'
            }
        }];

        if (xhr.statusCode === 0 && xhr._error) {
            // Do not process this request further.
            did.loading = true
            did.end = true

            return options.callback(xhr._error, xhr);
        }

        // Detect mixed content failure
        if (xhr.statusCode === 0 && is_mixedContent(options.uri)) {
            var mixedContent_err = new Error('Mixed Content request rejected: ' + options.uri);
            mixedContent_err.code = MIXED_CONTENT_ERROR_CODE;

            // Do not process this request further.
            did.loading = true
            did.end = true

            return options.callback(mixedContent_err, xhr)
        }

        // Detect failed CORS requests.
        if(is_cors && xhr.statusCode == 0) {
            var cors_err = new Error('CORS request rejected: ' + options.uri);
            cors_err.code = CORS_ERROR_CODE;
            cors_err.cors = 'rejected';

            // Do not process this request further.
            did.loading = true
            did.end = true

            return options.callback(cors_err, xhr)
        }

        function done () {
            // Trigger onStart before callback
            did.onStart = true
            options.onStart(xhr)

            options.onResponse(null, xhr)

            // Due to the weird dependency of `onStart` and `callback` order,
            // we ensure that callback is not called before onStart.
            // This happens only if we are waiting for cookies to be added into the cookie jar.
            typeof did.callback === 'function' && did.callback();
        }

        // We are all done here if the cookie jar is not available
        if (!(typeof (options.jar && options.jar.setCookie) === 'function')) {
            return done();
        }

        // Add cookies into the jar

        var addCookie = function (cookie, cb) {
                options.jar.setCookie(cookie, options.uri, {ignoreError: true}, function () {
                  cb()
                })
            },
            getSetCookieHeaders = function (headersString) {
                var cookies = [];

                (parseHeadersString(headersString) || []).filter(function (header) {
                    if (String(header && header.key).toLowerCase() === 'set-cookie') {
                        cookies.push(header.value);
                    }
                });

                return cookies;
            },
            cookies = getSetCookieHeaders(xhr.getAllResponseHeaders());

        if (!(cookies && cookies.length)) {
            return done();
        }

        forEachAsync(cookies, addCookie, function () {
            done()
        })
    }

    function on_loading() {
        if(did.loading)
            return

        did.loading = true
        request.log.debug('Response body loading', {'id':xhr.id})
        // TODO: Maybe simulate "data" events by watching xhr.responseText
    }

    function on_end() {
        if(did.end)
            return

        did.end = true
        request.log.debug('Request done', {'id':xhr.id})

        xhr.body = (options.encoding === null) ? xhr.response : xhr.responseText;
        if(options.json) {
            try {
                xhr.body = (xhr.responseText) ? JSON.parse(xhr.responseText) : xhr.responseText;
            }
            catch (er) {
                return options.callback(er, xhr)
            }
        }

        // Call the final callback if `onStart` is already called
        if (did.onStart) {
            options.callback(null, xhr, xhr.body, xhr.request && xhr.request._debug)
        }
        // otherwise, save the callback which will be triggered later in the `done` function
        else {
            did.callback = options.callback.bind(this, null, xhr, xhr.body, xhr.request && xhr.request._debug)
        }
    }

} // request

request.withCredentials = false;
request.DEFAULT_TIMEOUT = DEFAULT_TIMEOUT;

var shortcuts = [
    'get',
    'post',
    'put',
    'head',
    'del',
    'options',
    'trace',
    'copy',
    'lock',
    'mkcol',
    'move',
    'purge',
    'propfind',
    'proppatch',
    'unlock',
    'report',
    'mkactivity',
    'checkout',
    'merge',
    'm-search',
    'notify',
    'subscribe',
    'unsubscribe',
    'patch',
    'search'
];
var shortcutsToMethods = {
    'del': 'delete'
};

//
// defaults
//

request.defaults = function(options, requester) {
    var def = function (method) {
        var d = function (params, callback) {
            if(typeof params === 'string')
                params = {'uri': params};
            else {
                params = JSON.parse(JSON.stringify(params));
            }
            for (var i in options) {
                if (params[i] === undefined) params[i] = options[i]
            }
            return method(params, callback)
        }
        return d
    }
    var de = def(request)
    shortcuts.forEach(function (method) {
        de[method] = def(request[method])
    })
    return de
}

//
// HTTP method shortcuts
//

shortcuts.forEach(function(shortcut) {
    var method = shortcutsToMethods[shortcut] || shortcut;
    method     = method.toUpperCase();
    var func   = shortcut.toLowerCase();

    request[func] = function(opts) {
        if(typeof opts === 'string')
            opts = {'method':method, 'uri':opts};
        else {
            opts = JSON.parse(JSON.stringify(opts));
            opts.method = method;
        }

        var args = [opts].concat(Array.prototype.slice.apply(arguments, [1]));
        return request.apply(this, args);
    }
})

//
// CouchDB shortcut
//

request.couch = function(options, callback) {
    if(typeof options === 'string')
        options = {'uri':options}

    // Just use the request API to do JSON.
    options.json = true
    if(options.body)
        options.json = options.body
    delete options.body

    callback = callback || noop

    var xhr = request(options, couch_handler)
    return xhr

    function couch_handler(er, resp, body) {
        if(er)
            return callback(er, resp, body)

        if((resp.statusCode < 200 || resp.statusCode > 299) && body.error) {
            // The body is a Couch JSON object indicating the error.
            er = new Error('CouchDB error: ' + (body.error.reason || body.error.error))
            for (var key in body)
                er[key] = body[key]
            return callback(er, resp, body);
        }

        return callback(er, resp, body);
    }
}

//
// Utility
//

function noop() {}

function getLogger() {
    var logger = {}
        , levels = ['trace', 'debug', 'info', 'warn', 'error']
        , level, i

    for(i = 0; i < levels.length; i++) {
        level = levels[i]

        logger[level] = noop
        if(typeof console !== 'undefined' && console && console[level])
            logger[level] = formatted(console, level)
    }

    return logger
}

function formatted(obj, method) {
    return formatted_logger

    function formatted_logger(str, context) {
        if(typeof context === 'object')
            str += ' ' + JSON.stringify(context)

        return obj[method].call(obj, str)
    }
}

function window_location () {
    // jQuery #8138, IE may throw an exception when accessing
    // a field from window.location if document.domain has been set
    var ajaxLocation
    try { ajaxLocation = location.href }
    catch (e) {
        // Use the href attribute of an A element since IE will modify it given document.location
        ajaxLocation = document.createElement( "a" );
        ajaxLocation.href = "";
        ajaxLocation = ajaxLocation.href;
    }

    return ajaxLocation
}

// Return whether a URL is a cross-domain request.
function is_crossDomain(url) {
    var rurl = /^([\w\+\.\-]+:)(?:\/\/([^\/?#:]*)(?::(\d+))?)?/
        , ajaxLocation = window_location()
        , ajaxLocParts = rurl.exec(ajaxLocation.toLowerCase()) || []
        , parts = rurl.exec(url.toLowerCase() )

    var result = !!(
        parts &&
        (  parts[1] != ajaxLocParts[1]
            || parts[2] != ajaxLocParts[2]
            || (parts[3] || (parts[1] === "http:" ? 80 : 443)) != (ajaxLocParts[3] || (ajaxLocParts[1] === "http:" ? 80 : 443))
        )
    )

    //console.debug('is_crossDomain('+url+') -> ' + result)
    return result
}

function is_mixedContent (url) {
    var rurl = /^([\w\+\.\-]+:)(?:\/\/([^\/?#:]*)(?::(\d+))?)?/
        , ajaxLocation = window_location()
        , ajaxLocParts = rurl.exec(ajaxLocation.toLowerCase()) || []
        , parts = rurl.exec(url.toLowerCase() )

    return parts[1] != ajaxLocParts[1] && !IS_LOCALHOST[parts[2]]
}

// MIT License from http://phpjs.org/functions/base64_encode:358
function b64_enc (data) {
    // Encodes string using MIME base64 algorithm
    var b64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
    var o1, o2, o3, h1, h2, h3, h4, bits, i = 0, ac = 0, enc="", tmp_arr = [];

    if (!data) {
        return data;
    }

    // assume utf8 data
    // data = this.utf8_encode(data+'');

    do { // pack three octets into four hexets
        o1 = data.charCodeAt(i++);
        o2 = data.charCodeAt(i++);
        o3 = data.charCodeAt(i++);

        bits = o1<<16 | o2<<8 | o3;

        h1 = bits>>18 & 0x3f;
        h2 = bits>>12 & 0x3f;
        h3 = bits>>6 & 0x3f;
        h4 = bits & 0x3f;

        // use hexets to index into b64, and append result to encoded string
        tmp_arr[ac++] = b64.charAt(h1) + b64.charAt(h2) + b64.charAt(h3) + b64.charAt(h4);
    } while (i < data.length);

    enc = tmp_arr.join('');

    switch (data.length % 3) {
        case 1:
            enc = enc.slice(0, -2) + '==';
            break;
        case 2:
            enc = enc.slice(0, -1) + '=';
            break;
    }

    return enc;
}

// Check if given header name is forbidden i.e, cannot be modified programmatically.
// Refer: https://developer.mozilla.org/en-US/docs/Glossary/Forbidden_header_name
// @note The User-Agent header is no longer forbidden. However,
// Chrome will silently drop the header: https://bugs.chromium.org/p/chromium/issues/detail?id=571722
function isForbiddenHeader (headerName) {
    headerName = String(headerName).toLowerCase();

    return FORBIDDEN_HEADERS[headerName] ||
        headerName.startsWith('proxy-') ||
        headerName.startsWith('sec-');
}

// ensure that the .jar() function is available
request.jar = _.noop;

module.exports = request;
