/* istanbul ignore file */
// @todo
// 1. Return with annotations like (overridden headers, auth headers etc.)
// 2. Utilize requester (core.js) methods for dryRun
// 3. Add tests
const _ = require('lodash'),
    async = require('async'),
    mime = require('mime-types'),
    urlEncoder = require('postman-url-encoder'),
    Request = require('postman-collection').Request,
    authorizeRequest = require('../authorizer').authorizeRequest,
    authHandlers = require('../authorizer').AuthLoader.handlers,
    version = require('../../package.json').version,
    stripJSONComments = require('strip-json-comments'),

    CALCULATED_AT_RUNTIME = '<calculated when request is sent>',
    COOKIE = 'Cookie',
    FUNCTION = 'function',
    CONTENT_TYPE = 'Content-Type',
    DEFAULT_MIME_TYPE = 'application/octet-stream',
    CONTENT_TYPE_URLENCODED = 'application/x-www-form-urlencoded',
    CONTENT_TYPE_FORMDATA = 'multipart/form-data; boundary=' + CALCULATED_AT_RUNTIME,
    STRING = 'string',
    CONTENT_LANGUAGE_JSON = 'json',
    // eslint-disable-next-line security/detect-unsafe-regex
    JSON_CONTENT_TYPE_RE = /^application\/(\S+\+)?json/,

    CONTENT_TYPE_LANGUAGE = {
        html: 'text/html',
        text: 'text/plain',
        json: 'application/json',
        javascript: 'application/javascript',
        xml: 'application/xml'
    },

    BODY_MODE = {
        raw: 'raw',
        file: 'file',
        graphql: 'graphql',
        formdata: 'formdata',
        urlencoded: 'urlencoded'
    };

/**
 * Check if request body is empty and also handles disabled params for urlencoded
 * and formdata bodies.
 *
 * @todo Update Collection SDK isEmpty method to account for this.
 *
 * @private
 * @param {RequestBody} body -
 * @returns {Boolean}
 */
function bodyIsEmpty (body) {
    if (!body || body.disabled || body.isEmpty()) {
        return true;
    }

    var i,
        param,
        mode = body.mode;

    if (!(mode === BODY_MODE.formdata || mode === BODY_MODE.urlencoded)) {
        return false;
    }

    for (i = body[mode].members.length - 1; i >= 0; i--) {
        param = body[mode].members[i];
        // bail out if a single enabled param is present
        if (param && !param.disabled) {
            return false;
        }
    }

    return true;
}

/**
 * Add new System header.
 *
 * @param {object} headers -
 * @param {String} key -
 * @param {String} value -
 */
function addSystemHeader (headers, key, value) {
    headers.add({
        key: key,
        value: value,
        system: true
    });
}

/**
 * Authorize the given request.
 *
 * @private
 * @param {Request} request -
 * @param {Function} callback -
 */
function setAuthorization (request, callback) {
    authorizeRequest(request, function (err, clonedRequest) {
        // @note authorizeRequest returns a cloned request.
        !clonedRequest && (clonedRequest = new Request(request.toJSON()));

        if (err) {
            return callback(null, clonedRequest);
        }

        var auth = request.auth,
            authType = auth && auth.type,
            manifest = _.get(authHandlers, [authType, 'manifest']),
            headers = _.get(clonedRequest, 'headers.reference') || {},
            queryParams = _.get(clonedRequest, 'url.query.reference') || {},
            bodyParams = _.get(clonedRequest, 'body.urlencoded.reference') || {},
            propertyList,
            propertyKey,
            property;

        if (authType === 'apikey' && (auth = auth.apikey)) {
            propertyKey = String(auth.get('key')).toLowerCase();
            propertyList = auth.get('in') === 'query' ? queryParams : headers;

            if ((property = propertyList[propertyKey])) {
                Array.isArray(property) && (property = property[property.length - 1]);
                property.auth = true;
            }

            return callback(null, clonedRequest);
        }

        if (!(manifest && manifest.updates)) {
            return callback(null, clonedRequest);
        }

        manifest.updates.forEach(function (update) {
            propertyKey = update.property;

            switch (update.type) {
                case 'header':
                    propertyKey = propertyKey.toLowerCase();
                    propertyList = headers;
                    break;
                case 'url.param':
                    propertyList = queryParams;
                    break;
                case 'body.urlencoded':
                    propertyList = bodyParams;
                    break;
                default: return;
            }

            if ((property = propertyList[propertyKey])) {
                Array.isArray(property) && (property = property[property.length - 1]);
                property.auth = true;
            }
        });

        callback(null, clonedRequest);
    });
}

/**
 * Adds Content-Type header based on selected request body.
 *
 * @private
 * @param {Request} request -
 * @param {Function} callback -
 */
function setContentType (request, callback) {
    // bail out if body is empty
    if (bodyIsEmpty(request.body)) {
        return callback(null, request);
    }

    var headers = request.headers,
        contentLanguage;

    switch (request.body.mode) {
        case BODY_MODE.raw:
            contentLanguage = _.get(request, 'body.options.raw.language', 'text');
            addSystemHeader(headers, CONTENT_TYPE, CONTENT_TYPE_LANGUAGE[contentLanguage] ||
                CONTENT_TYPE_LANGUAGE.text);
            break;
        case BODY_MODE.urlencoded:
            addSystemHeader(headers, CONTENT_TYPE, CONTENT_TYPE_URLENCODED);
            break;
        case BODY_MODE.formdata:
            addSystemHeader(headers, CONTENT_TYPE, CONTENT_TYPE_FORMDATA);
            break;
        case BODY_MODE.graphql:
            addSystemHeader(headers, CONTENT_TYPE, CONTENT_TYPE_LANGUAGE.json);
            break;
        case BODY_MODE.file:
            addSystemHeader(headers, CONTENT_TYPE,
                mime.lookup(request.body.file && request.body.file.src) || DEFAULT_MIME_TYPE);
            break;
        default: break;
    }

    addSystemHeader(headers, 'Content-Length', CALCULATED_AT_RUNTIME);

    callback(null, request);
}

/**
 * Remove comments if the data mode is raw and content type is application/json
 *
 * @private
 * @param {Request} request -
 * @param {Function} callback -
 */
function sanitizeRawBody (request, callback) {
    const language = _.get(request, 'body.options.raw.language'),
        isContentTypeJson = function (contentType) {
            if (Array.isArray(contentType)) {
                contentType = contentType.find((type) => {
                    return !(type && type.disabled);
                });
            }

            return contentType &&
                typeof contentType.value === STRING &&
                JSON_CONTENT_TYPE_RE.test(contentType.value);
        };

    let contentType = _.get(request, 'headers.reference.content-type'),
        content = _.get(request, 'body.raw');

    if (!language && !contentType) {
        return callback(null, request);
    }

    // bail out when language is present and not json
    if ((language && language !== CONTENT_LANGUAGE_JSON)) {
        return callback(null, request);
    }

    // bail out when language is not present and content type is not json
    if (!language && contentType && !isContentTypeJson(contentType)) {
        return callback(null, request);
    }

    // bail out if no content
    if (!content) {
        return callback(null, request);
    }

    if (typeof content !== STRING) {
        content = JSON.stringify(content);
    }

    // bail out if no comments present in content
    if (!(content.includes('//') || content.includes('/*'))) {
        return callback(null, request);
    }

    // stripJSONComments throws error if the content is not string
    // here were have already converted the content to string in previous step
    // hence we are do not have a safety check here.
    request.body.raw = stripJSONComments(content, { whitespace: false });

    callback(null, request);
}

/**
 * Adds Cookie header for the given request url.
 *
 * @private
 * @param {Request} request -
 * @param {Object} cookieJar -
 * @param {Function} callback -
 */
function setCookie (request, cookieJar, callback) {
    // bail out if not a valid instance of CookieJar
    if (!(cookieJar && cookieJar.getCookieString)) {
        return callback(null, request);
    }

    // @note don't pass request.url instance to force re-parsing of the URL
    cookieJar.getCookieString(urlEncoder.toNodeUrl(request.url.toString()), function (err, cookies) {
        if (err) {
            return callback(null, request);
        }

        if (cookies && cookies.length) {
            addSystemHeader(request.headers, COOKIE, cookies);
        }

        callback(null, request);
    });
}

/**
 * A helper method to dry run the given request instance.
 * It returns the cloned request instance with the system added properties.
 *
 * @param {Request} request -
 * @param {Object} options -
 * @param {Object} options.cookieJar -
 * @param {Object} options.protocolProfileBehavior -
 * @param {Function} done -
 */
function dryRun (request, options, done) {
    if (!done && typeof options === FUNCTION) {
        done = options;
        options = {};
    }

    if (!Request.isRequest(request)) {
        return done(new Error('Invalid Request instance'));
    }

    !options && (options = {});

    var cookieJar = options.cookieJar,
        implicitCacheControl = options.implicitCacheControl,
        implicitTraceHeader = options.implicitTraceHeader,
        disabledSystemHeaders = _.get(options.protocolProfileBehavior, 'disabledSystemHeaders') || {},
        disableCookies = _.get(options.protocolProfileBehavior, 'disableCookies');

    async.waterfall([
        function setContentTypeHeader (next) {
            setContentType(request, next);
        },
        function sanitizeRawBodyContent (request, next) {
            sanitizeRawBody(request, next);
        },
        function setAuthorizationHeaders (request, next) {
            setAuthorization(request, next);
        },
        function setContentLength (request, next) {
            var headers = request.headers,
                header = headers.one('content-length');

            // bail out if header added by body helper
            if (header && header.system) {
                return next(null, request);
            }

            switch (String(request.method).toUpperCase()) {
                case 'GET':
                case 'HEAD':
                case 'TRACE':
                case 'DELETE':
                case 'CONNECT':
                case 'OPTIONS':
                    break;
                default:
                    addSystemHeader(headers, 'Content-Length', '0');
                    break;
            }

            next(null, request);
        },
        function setCookieHeader (request, next) {
            if (disableCookies || !cookieJar) {
                return next(null, request);
            }

            setCookie(request, cookieJar, next);
        },
        function setStaticHeaders (request, next) {
            var headers = request.headers;

            // remove header added by auth helpers
            headers.remove(function (header) {
                return header.system && header.key.toLowerCase() === 'host';
            });

            addSystemHeader(headers, 'User-Agent', 'PostmanRuntime/' + version);
            addSystemHeader(headers, 'Accept', '*/*');
            addSystemHeader(headers, 'Accept-Encoding', 'gzip, deflate, br');
            addSystemHeader(headers, 'Host', CALCULATED_AT_RUNTIME);
            addSystemHeader(headers, 'Connection', 'keep-alive');
            implicitCacheControl && addSystemHeader(headers, 'Cache-Control', 'no-cache');
            implicitTraceHeader && addSystemHeader(headers, 'Postman-Token', CALCULATED_AT_RUNTIME);

            next(null, request);
        },
        function disableSystemHeaders (request, next) {
            var headersReference = request.headers.reference,
                header;

            _.forEach(disabledSystemHeaders, function (disabled, headerKey) {
                if (!disabled) { return; }

                if ((header = headersReference[headerKey.toLowerCase()])) {
                    Array.isArray(header) && (header = header[header.length - 1]);
                    header.system && (header.disabled = true);
                }
            });

            next(null, request);
        }
    ], function (err, request) {
        if (err) { return done(err); }

        done(null, request);
    });
}

module.exports = dryRun;
