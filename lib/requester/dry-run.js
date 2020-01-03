const _ = require('lodash'),
    Request = require('postman-collection').Request,
    authorizeRequest = require('../authorizer').authorizeRequest,

    CONTENT_TYPE_LANGUAGE = {
        'html': 'text/html',
        'text': 'text/plain',
        'json': 'application/json',
        'javascript': 'application/javascript',
        'xml': 'application/xml'
    };

function oneNormalizedHeader (headers, headerName) {
    var name = headerName.toLowerCase(),
        indexKey = headers._postman_listIndexKey, // `key` for Header
        header = headers.reference[name],
        i;

    if (!header) {
        return;
    }

    if (!header.disabled) {
        return header;
    }

    // traverse the members list in reverse direction in order to find the last enabled
    for (i = headers.members.length - 1; i >= 0; i--) {
        header = headers.members[i];
        if (header[indexKey].toLowerCase() === name && !header.disabled) {
            return header;
        }
    }
}

function bodyIsEmpty (body) {
    if (!body || body.disabled || body.isEmpty()) {
        return true;
    }

    var mode = body.mode,
        i,
        param;

    if (!(mode === 'formdata' || mode === 'urlencoded')) {
        return false;
    }

    for (i = body[mode].members.length - 1; i >= 0; i--) {
        param = body[mode].members[i];
        if (param && !param.disabled) {
            return false;
        }
    }

    return true;
}

function checkAuth (request, callback) {
    authorizeRequest(request, function (err, clonedRequest) {
        if (err) {
            return callback(err);
        }

        !clonedRequest && (clonedRequest = new Request(request.toJSON()));

        callback(null, clonedRequest);
    });
}

function checkContentType (request, callback) {
    if (bodyIsEmpty(request.body)) {
        return callback(null, request);
    }

    var contentType = oneNormalizedHeader(request.headers, 'Content-Type'),
        contentLanguage;

    switch (request.body.mode) {
        case 'raw':
            if (!contentType) {
                contentLanguage = _.get(request, 'body.options.raw.language', 'text');
                request.headers.add({
                    key: 'Content-Type',
                    value: CONTENT_TYPE_LANGUAGE[contentLanguage] || CONTENT_TYPE_LANGUAGE.text,
                    system: true
                });
            }
            break;
        case 'urlencoded':
            if (!(/^application\/x-www-form-urlencoded\b/).test(contentType)) {
                request.removeHeader('Content-Type', {ignoreCase: true});
                request.headers.add({
                    key: 'Content-Type',
                    value: 'application/x-www-form-urlencoded',
                    system: true
                });
            }
            break;
        case 'formdata':
            if (!(/^multipart\/form-data;.*boundary=(?:"([^"]+)"|([^;]+))/).test(contentType)) {
                request.removeHeader('Content-Type', {ignoreCase: true});
                request.headers.add({
                    key: 'Content-Type',
                    value: 'multipart/form-data; boundary=<calculated at runtime>',
                    system: true
                });
            }
            break;
        case 'graphql':
            if (!contentType) {
                request.headers.add({
                    key: 'Content-Type',
                    value: 'application/json',
                    system: true
                });
            }
            break;
        case 'file':
            request.headers.add({
                key: 'Content-Type',
                value: '<file mime calculated at runtime>',
                system: true
            });
            break;
        default: break;
    }

    callback(null, request);
}

function checkCookies (request, cookieJar, callback) {
    if (!(cookieJar && cookieJar.getCookieString)) {
        return callback(null, request);
    }

    cookieJar.getCookieString(request.url.toString(true), function (err, cookies) {
        if (err) {
            return callback(err);
        }

        if (cookies && cookies.length) {
            request.headers.add({
                key: 'Cookie',
                value: cookies,
                system: true
            });
        }

        callback(null, request);
    });
}

function dryRun (request, options, done) {
    if (!done && typeof options === 'function') {
        done = options;
        options = {};
    }

    if (!Request.isRequest(request)) {
        return done();
    }

    var cookieJar = options && options.cookieJar;

    checkAuth(request, function (err, clonedRequest) {
        if (err) {
            return done(err);
        }

        checkContentType(clonedRequest, function (err, clonedRequest) {
            if (err) {
                return done(err);
            }

            checkCookies(clonedRequest, cookieJar, done);
        });
    });
}

module.exports = dryRun;
