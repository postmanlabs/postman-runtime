const _ = require('lodash'),
    mime = require('mime-types'),
    Request = require('postman-collection').Request,
    authorizeRequest = require('../authorizer').authorizeRequest,

    COOKIE = 'Cookie',
    FUNCTION = 'function',
    CONTENT_TYPE = 'Content-Type',
    CONTENT_TYPE_URLENCODED = 'application/x-www-form-urlencoded',
    CONTENT_TYPE_FORMDATA = 'multipart/form-data; boundary=--------------------------486920556469742056617375',

    CONTENT_TYPE_LANGUAGE = {
        'html': 'text/html',
        'text': 'text/plain',
        'json': 'application/json',
        'javascript': 'application/javascript',
        'xml': 'application/xml'
    },

    BODY_MODE = {
        raw: 'raw',
        file: 'file',
        graphql: 'graphql',
        formdata: 'formdata',
        urlencoded: 'urlencoded'
    },

    URLENCODED_RE = /^application\/x-www-form-urlencoded\b/,
    FORMDATA_RE = /^multipart\/form-data;.*boundary=(?:"([^"]+)"|([^;]+))/;

/**
 * Find the enabled header with the given name.
 *
 * @todo Add this helper in Collection SDK.
 *
 * @private
 * @param {HeaderList} headers
 * @param {String} name
 * @returns {Header|undefined}
 */
function oneNormalizedHeader (headers, name) {
    var i,
        header;

    // get all headers with `name`
    headers = headers.reference[name.toLowerCase()];

    if (Array.isArray(headers)) {
        // traverse the headers list in reverse direction in order to find the last enabled
        for (i = headers.length - 1; i >= 0; i--) {
            header = headers[i];

            if (header && !header.disabled) {
                return header;
            }
        }

        // bail out if no enabled header was found in the multi-valued content-type
        return;
    }

    // return the single enabled header
    if (headers && !headers.disabled) {
        return headers;
    }
}

/**
 * Check if request body is empty and also handles disabled params for urlencoded
 * and formdata bodies.
 *
 * @todo Update Collection SDK isEmpty method to account for this.
 *
 * @private
 * @param {RequestBody} body
 * @returns {Boolean}
 */
function bodyIsEmpty (body) {
    if (!body || body.disabled || body.isEmpty()) {
        return true;
    }

    var mode = body.mode,
        i,
        param;

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
 * Authorize the given request.
 *
 * @private
 * @param {Request} request
 * @param {Function} callback
 */
function addAuthorization (request, callback) {
    authorizeRequest(request, function (err, clonedRequest) {
        if (err) {
            return callback(err);
        }

        // @note authorizeRequest returns a cloned request.
        !clonedRequest && (clonedRequest = new Request(request.toJSON()));

        callback(null, clonedRequest);
    });
}

/**
 * Adds Content-Type header based on selected request body.
 *
 * @private
 * @param {Request} request
 * @param {Function} callback
 */
function addContentType (request, callback) {
    // bail out if body is empty
    if (bodyIsEmpty(request.body)) {
        return callback(null, request);
    }

    var contentType = oneNormalizedHeader(request.headers, CONTENT_TYPE),
        contentLanguage;

    switch (request.body.mode) {
        case BODY_MODE.raw:
            if (!contentType) {
                contentLanguage = _.get(request, 'body.options.raw.language', 'text');
                request.headers.add({
                    key: CONTENT_TYPE,
                    value: CONTENT_TYPE_LANGUAGE[contentLanguage] || CONTENT_TYPE_LANGUAGE.text,
                    system: true
                });
            }
            break;
        case BODY_MODE.urlencoded:
            if (!URLENCODED_RE.test(contentType && contentType.value)) {
                contentType && request.removeHeader(CONTENT_TYPE, {ignoreCase: true});
                request.headers.add({
                    key: CONTENT_TYPE,
                    value: CONTENT_TYPE_URLENCODED,
                    system: true
                });
            }
            break;
        case BODY_MODE.formdata:
            if (!FORMDATA_RE.test(contentType && contentType.value)) {
                contentType && request.removeHeader(CONTENT_TYPE, {ignoreCase: true});
                request.headers.add({
                    key: CONTENT_TYPE,
                    value: CONTENT_TYPE_FORMDATA,
                    system: true
                });
            }
            break;
        case BODY_MODE.graphql:
            if (!contentType) {
                request.headers.add({
                    key: CONTENT_TYPE,
                    value: CONTENT_TYPE_LANGUAGE.json,
                    system: true
                });
            }
            break;
        case BODY_MODE.file:
            if (!contentType) {
                contentType = mime.lookup(request.body.file && request.body.file.src);
                contentType && request.headers.add({
                    key: CONTENT_TYPE,
                    value: contentType,
                    system: true
                });
            }
            break;
        default: break;
    }

    callback(null, request);
}

/**
 * Adds Cookie header for the given request url.
 *
 * @private
 * @param {Request} request
 * @param {Object} cookieJar
 * @param {Function} callback
 */
function addCookie (request, cookieJar, callback) {
    // bail out if not a valid instance of CookieJar
    if (!(cookieJar && cookieJar.getCookieString)) {
        return callback(null, request);
    }

    cookieJar.getCookieString(request.url.toString(true), function (err, cookies) {
        if (err) {
            return callback(err);
        }

        if (cookies && cookies.length) {
            request.headers.add({
                key: COOKIE,
                value: cookies,
                system: true
            });
        }

        callback(null, request);
    });
}

/**
 * A helper method to dry run the given request instance.
 * It returns the cloned request instance with the system added properties.
 *
 * @param {Request} request
 * @param {Object} options
 * @param {Object} options.cookieJar
 * @param {Object} options.protocolProfileBehavior
 * @param {Function} done
 */
function dryRun (request, options, done) {
    if (!done && typeof options === FUNCTION) {
        done = options;
        options = {};
    }

    if (!Request.isRequest(request)) {
        return done(new Error('Invalid Request instance'));
    }

    var cookieJar = options && options.cookieJar,
        disableCookies = _.get(options, 'protocolProfileBehavior.disableCookies');

    addAuthorization(request, function (err, clonedRequest) {
        if (err) {
            return done(err);
        }

        addContentType(clonedRequest, function (err, clonedRequest) {
            if (err) {
                return done(err);
            }

            if (disableCookies || !cookieJar) {
                return done(null, clonedRequest);
            }

            addCookie(clonedRequest, cookieJar, done);
        });
    });
}

module.exports = dryRun;
