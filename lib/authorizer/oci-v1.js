/**
 * @fileOverview
 *
 * Implements the Oracle Cloud Infrastructure Signature v1 authentication method.
 * Specification document: https://docs.cloud.oracle.com/en-us/iaas/Content/API/Concepts/signingrequests.htm
 */
var sshpk = require('sshpk'),
    UrlParser = require('url'),
    crypto = require('crypto'),
    _ = require('lodash'),
    httpSignature = require('http-signature'),
    urlEncoder = require('postman-url-encoder'),
    RequestBody = require('postman-collection').RequestBody,
    bodyBuilder = require('../requester/core-body-builder');


const HEADER_CONTENT_SHA = 'x-content-sha256',
    HEADER_CONTENT_LEN = 'content-length',
    HEADER_CONTENT_TYPE = 'content-type',
    EMPTY_SHA = '47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU=',
    HEADER_AUTHORIZATION = 'authorization',
    HEADER_DATE = 'x-date',
    HEADER_HOST = 'host',
    CONTENT_TYPE_JSON = 'application/json',
    EXTRA_HEADER_METHODS = ['POST', 'PUT', 'PATCH'],
    PSEUDOHEADER_REQUEST_TARGET = '(request-target)';

// --------------------  POLYFILL for input to httpSignature.sign ---------------------------

function Headers (values) {
    this._values = values || {};
}

Headers.prototype.append = function (name, value) {
    this._values[name] = value;
};

Headers.prototype.delete = function (name) {
    delete this._values[name];
};

Headers.prototype.entries = function () {
    const result = [];

    for (let key in this._values) {
        result.push([key, this._values[key]]);
    }

    return result;
};

Headers.prototype.get = function (name) {
    return this._values[name];
};

Headers.prototype.has = function (name) {
    return name in this._values;
};

Headers.prototype.keys = function () {
    const result = [];

    for (let key in this._values) {
        result.push(key);
    }

    return result;
};

Headers.prototype.set = function (name, value) {
    this._values[name] = value;
};

// eslint-disable-next-line no-unused-vars
Headers.prototype.values = function (name, value) {
    const result = [];

    // eslint-disable-next-line guard-for-in
    for (let key in this._values) {
        result.push(this._values[key]);
    }

    return result;
};

class SignerRequest {
    constructor (method, url, headers) {
        this.headers = headers;
        this.method = method;
        this.path = UrlParser.parse(url).path;
    }

    getHeader (name) {
        return this.headers.get(name);
    }

    setHeader (name, value) {
        this.headers.set(name, value);
    }
}

function computeBodyHash (body, algorithm, digestEncoding, callback) {
    if (!(body && algorithm && digestEncoding) || body.isEmpty()) { return callback(); }

    var hash = crypto.createHash(algorithm),
        originalReadStream,
        rawBody,
        urlencodedBody,
        graphqlBody;


    if (body.mode === RequestBody.MODES.raw) {
        rawBody = bodyBuilder.raw(body.raw).body;
        hash.update(rawBody);

        // hash.update('\n');
        return callback(hash.digest(digestEncoding), rawBody.length);
    }

    if (body.mode === RequestBody.MODES.urlencoded) {
        urlencodedBody = bodyBuilder.urlencoded(body.urlencoded).form;
        urlencodedBody = urlEncoder.encodeQueryString(urlencodedBody);
        hash.update(urlencodedBody);
        hash.update('\n');

        return callback(hash.digest(digestEncoding), urlencodedBody.length + 1);
    }

    if (body.mode === RequestBody.MODES.file) {
        originalReadStream = _.get(body, 'file.content');

        if (!originalReadStream) {
            return callback();
        }

        return originalReadStream.cloneReadStream(function (err, clonedStream) {
            if (err) { return callback(); }
            var streamContentLength = 0;

            clonedStream.on('data', function (chunk) {
                hash.update(chunk);
                streamContentLength += chunk.length;
            });

            clonedStream.on('end', function () {
                hash.update('\n');
                callback(hash.digest(digestEncoding), streamContentLength);
            });
        });
    }

    if (body.mode === RequestBody.MODES.graphql) {
        graphqlBody = bodyBuilder.graphql(body.graphql).body;
        hash.update(graphqlBody);
        hash.update('\n');

        return callback(hash.digest(digestEncoding), graphqlBody.length + 1);
    }

    // @todo: Figure out a way to calculate hash for formdata body type.

    // ensure that callback is called if body.mode doesn't match with any of the above modes
    return callback();
}
// ------------------------------------------------------------

// eslint-disable-next-line one-var
var convertToDomHeadersObject = function (postmanHeaders) {
        let rawHeaders = {};

        postmanHeaders.all().forEach(function (each) {
            rawHeaders[each.key.toLowerCase()] = each.value;
        });

        return new Headers(rawHeaders);
    },
    getBodyDetails = function (body, callback) {
        computeBodyHash(body, 'sha256', 'base64', callback);
    },
    processRequestForOci = function (request, auth, callback) {
        getBodyDetails(request.body, function (bodyHash, bodyContentLength) {
            const rawRequestUri = request.url.getRaw(),
                domHeadersObject = convertToDomHeadersObject(request.headers),
                uppercaseMethod = request.method.toUpperCase(),
                minimumHeadersToSign = [HEADER_DATE, PSEUDOHEADER_REQUEST_TARGET, HEADER_HOST],
                keyId = auth.get('tenancy') + '/' + auth.get('user') + '/' + auth.get('fingerprint'),
                privateKeyBuffer = sshpk.parsePrivateKey(auth.get('privatekey'), 'auto').toBuffer('pem', {});

            if (!domHeadersObject.has(HEADER_HOST)) {
                const url = UrlParser.parse(rawRequestUri);

                if (url.host) {
                    domHeadersObject.set(HEADER_HOST, url.host);
                }
                else {
                    return callback(new Error('Cannot parse host from url'));
                }
            }

            if (!domHeadersObject.has(HEADER_DATE)) {
                domHeadersObject.set(HEADER_DATE, new Date().toUTCString());
            }
            let headersToSign = [...minimumHeadersToSign];

            if (!auth.get('forceDisableBodyHashing') && bodyHash && bodyContentLength &&
                _.includes(EXTRA_HEADER_METHODS, uppercaseMethod)) {
                if (!domHeadersObject.has(HEADER_CONTENT_TYPE)) {
                    domHeadersObject.set(HEADER_CONTENT_TYPE, CONTENT_TYPE_JSON);
                }
                else if (domHeadersObject.get(HEADER_CONTENT_TYPE) !== CONTENT_TYPE_JSON) {
                    return callback(new Error(`Only ${CONTENT_TYPE_JSON} is supported by OCI Auth`));
                }

                if (bodyHash) {
                    domHeadersObject.set(HEADER_CONTENT_SHA, bodyHash);
                }
                if (bodyContentLength === 0) {
                    // if buffer is empty, it can only be an empty string payload
                    domHeadersObject.set(HEADER_CONTENT_SHA, EMPTY_SHA);
                }
                if (!domHeadersObject.has(HEADER_CONTENT_LEN)) {
                    domHeadersObject.set(HEADER_CONTENT_LEN, `${bodyContentLength}`);
                }
                headersToSign = headersToSign.concat(HEADER_CONTENT_TYPE, HEADER_CONTENT_LEN, HEADER_CONTENT_SHA);
            }

            httpSignature.sign(new SignerRequest(uppercaseMethod, rawRequestUri, domHeadersObject), {
                key: privateKeyBuffer,
                keyId: keyId,
                headers: headersToSign
            });
            // NOTE: OCI needs 'authorization' but our version of httpSignature (1.3.1)
            // puts signature in 'Authorization'
            // eslint-disable-next-line one-var
            const AUTH_HEADER_BACKWARD_COMPATIBLE = 'Authorization',
                authorizationHeader = domHeadersObject.get(AUTH_HEADER_BACKWARD_COMPATIBLE);

            domHeadersObject.set(HEADER_AUTHORIZATION,
                authorizationHeader.replace('Signature ', 'Signature version="1",'));
            domHeadersObject.delete(AUTH_HEADER_BACKWARD_COMPATIBLE);

            return callback(domHeadersObject);
        });
    };


/**
 * @implements {AuthHandlerInterface}
 */
module.exports = {
    /**
     * @property {AuthHandlerInterface~AuthManifest}
     */
    // TODO: Fix the manifest
    manifest: {
        info: {
            name: 'oci-v1',
            version: '1.0.0'
        },
        updates: [
            {
                property: HEADER_AUTHORIZATION,
                type: 'header'
            },
            {
                property: HEADER_DATE,
                type: 'header'
            },
            {
                property: HEADER_CONTENT_LEN,
                type: 'header'
            },
            {
                property: HEADER_CONTENT_TYPE,
                type: 'header'
            },
            {
                property: HEADER_CONTENT_SHA,
                type: 'header'
            }
        ]
    },

    /**
     * Initializes a item (fetches all required parameters, etc) before the actual authorization step.
     *
     * @param {AuthInterface} auth AuthInterface instance created with request auth
     * @param {Response} response Response of intermediate request (it any)
     * @param {AuthHandlerInterface~authInitHookCallback} done Callback function called with error as first argument
     */
    init: function (auth, response, done) {
        done(null);
    },

    /**
     * Checks the item, and fetches any parameters that are not already provided.
     *
     * @param {AuthInterface} auth AuthInterface instance created with request auth
     * @param {AuthHandlerInterface~authPreHookCallback} done Callback function called with error, success and request
     */
    pre: function (auth, done) {
        done(null, Boolean(auth.get('tenancy') && auth.get('user') &&
            auth.get('fingerprint') && auth.get('privatekey')));
    },

    /**
     * Verifies whether the request was successful after being sent.
     *
     * @param {AuthInterface} auth AuthInterface instance created with request auth
     * @param {Requester} response Response of the request
     * @param {AuthHandlerInterface~authPostHookCallback} done Callback function called with error and success
     */
    post: function (auth, response, done) {
        done(null, true);
    },

    /**
     * Signs a request.
     *
     * @param {AuthInterface} auth AuthInterface instance created with request auth
     * @param {Request} request Request to be sent
     * @param {AuthHandlerInterface~authSignHookCallback} done Callback function
     */
    sign: function (auth, request, done) {
        processRequestForOci(request, auth, function (result) {
            if (!result) { return done(); }
            if (result instanceof Error) { return done(result); }
            const newHeaders = result,
                setHeaderIfAvailable = function (headerName) {
                    const currentHeader = newHeaders.get(headerName);

                    if (currentHeader) {
                        request.addHeader({
                            key: headerName,
                            value: currentHeader,
                            system: true
                        });
                    }
                },
                allPossibleHeaders = [HEADER_AUTHORIZATION, HEADER_DATE, HEADER_CONTENT_LEN,
                    HEADER_CONTENT_SHA, HEADER_CONTENT_TYPE];

            allPossibleHeaders.forEach(setHeaderIfAvailable);
            done();
        });
    }
};
