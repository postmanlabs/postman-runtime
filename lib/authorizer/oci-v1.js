/**
 * @fileOverview
 *
 * Implements the Oracle Cloud Infrastructure Signature v1 authentication method.
 * Specification document: https://docs.cloud.oracle.com/en-us/iaas/Content/API/Concepts/signingrequests.htm
 */
var sshpk = require('sshpk'),
    UrlParser = require('url'),
    _ = require('lodash'),
    httpSignature = require('http-signature'),
    jssha = require('jssha'),
    RequestBody = require('postman-collection').RequestBody,
    bodyBuilder = require('../requester/core-body-builder');


const HEADER_CONTENT_SHA = 'x-content-sha256',
    HEADER_CONTENT_LEN = 'content-length',
    HEADER_CONTENT_TYPE = 'content-type',
    EMPTY_SHA = '47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU=',
    HEADER_AUTHORIZATION = 'authorization',
    HEADER_DATE = 'x-date',
    EXTRA_HEADER_METHODS = ['POST', 'PUT', 'PATCH'];
// -------------------- HEADERS POLYFILL ---------------------------

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

Headers.prototype.values = function (name, value) {
    const result = [];

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

// ------------------------------------------------------------

// eslint-disable-next-line one-var
var convertToDomHeadersObject = function (postmanHeaders) {
        let rawHeaders = {};

        postmanHeaders.all().forEach(function (each) {
            rawHeaders[each.key.lowercase()] = each.value;
        });

        return new Headers(rawHeaders);
    },
    getBodyString = function (body) {
        if (body.mode === RequestBody.MODES.raw) {
            return bodyBuilder.raw(body.raw).body;
        }
        throw new Error(`Request body mode ${body.mode} is not supported. Please use ${RequestBody.MODES.raw}`);
    },
    processRequestForOci = function (request, auth) {
        const rawRequestUri = request.url.getRaw(),
            domHeadersObject = convertToDomHeadersObject(request.headers),
            uppercaseMethod = request.method.toUpperCase(),
            minimumHeadersToSign = ['x-date', '(request-target)', 'host'];;

        if (!domHeadersObject.has('host')) {
            const url = UrlParser.parse(rawRequestUri);

            if (url.host) {
                domHeadersObject.set('host', url.host);
            }
            else {
                throw new Error('Cannot parse host from url');
            }
        }

        // Date header
        if (!domHeadersObject.has(HEADER_DATE)) {
            domHeadersObject.set(HEADER_DATE, new Date().toUTCString());
        }
        let headersToSign = [...minimumHeadersToSign];

        if (request.body && _.includes(EXTRA_HEADER_METHODS, uppercaseMethod)) {
            if (!domHeadersObject.has(HEADER_CONTENT_TYPE)) {
                domHeadersObject.set(HEADER_CONTENT_TYPE, 'application/json');
            }
            let contentLen = 0;
            const shaObj = new jssha('SHA-256', 'TEXT'),
                requestBodyString = getBodyString(request.body);

            if (requestBodyString) {
                shaObj.update(requestBodyString);
                domHeadersObject.set(HEADER_CONTENT_SHA, shaObj.getHash('B64'));
                contentLen = Buffer.byteLength(requestBodyString, 'utf8');
            }
            if (contentLen === 0) {
                // if buffer is empty, it can only be an empty string payload
                domHeadersObject.set(HEADER_CONTENT_SHA, EMPTY_SHA);
            }
            if (!domHeadersObject.has(HEADER_CONTENT_LEN)) {
                domHeadersObject.set(HEADER_CONTENT_LEN, `${contentLen}`);
            }
            headersToSign = headersToSign.concat(HEADER_CONTENT_TYPE, HEADER_CONTENT_LEN, HEADER_CONTENT_SHA);
        }

        var keyId = auth.get('tenancy') + '/' + auth.get('user') + '/' + auth.get('fingerprint'),
            privateKeyBuffer = sshpk.parsePrivateKey(auth.get('private_key'), 'auto').toBuffer('pem', {});

        httpSignature.sign(new SignerRequest(uppercaseMethod, rawRequestUri, domHeadersObject), {
            key: privateKeyBuffer,
            keyId: keyId,
            headers: headersToSign
        });
        // NOTE: OCI needs 'authorization' but our version of httpSignature puts signature in 'Authorization'
        const AUTH_HEADER_BACKWARD_COMPATIBLE = 'Authorization',
            authorizationHeader = domHeadersObject.get(AUTH_HEADER_BACKWARD_COMPATIBLE);

        domHeadersObject.set(HEADER_AUTHORIZATION,
            authorizationHeader.replace('Signature ', 'Signature version="1",'));
        domHeadersObject.delete(AUTH_HEADER_BACKWARD_COMPATIBLE);
        console.log('allHeaders', domHeadersObject.keys());

        return domHeadersObject;
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
        // TODO: Check the right params
        // config = from_file()
        // auth = Signer(
        //     tenancy=config['tenancy'],
        //     user=config['user'],
        //     fingerprint=config['fingerprint'],
        //     private_key_file_location=config['key_file'],
        // )
        done(null, Boolean(auth.get('tenancy') && auth.get('user') &&
            auth.get('fingerprint') && auth.get('private_key')));
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
        const newHeaders = processRequestForOci(request, auth),
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

        return done();
    }
};
