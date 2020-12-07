/**
 * @fileOverview
 *
 * Implements the Oracle Cloud Infrastructure Signature v1 authentication method.
 * Specification document: https://docs.cloud.oracle.com/en-us/iaas/Content/API/Concepts/signingrequests.htm
 */

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


// ------------------------------------------------------------

var sshpk = require('sshpk'),
    UrlParser = require('url'),
    httpSignature = require('http-signature'),
    convertToDomHeadersObject = function (postmanHeaders) {
        let rawHeaders = {};

        postmanHeaders.all().forEach(function (each) {
            rawHeaders[each.key] = each.value;
        });

        return new Headers(rawHeaders);
    },
    convertPostmanRequestToOCIRequest = function (request) {
        // need to convert request from `module:postman-collection.Request`
        // to oci-common/lib/http-request.d.ts.HttpRequest
        console.log('converting object request.url=', request.url.path);

        return {
            uri: request.url.getRaw(),
            headers: convertToDomHeadersObject(request.headers),
            method: request.method.toUpperCase()
            // body: getRequestBodyStream(request.body)
        };
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

const processRequestForOci = function (ociRequest, auth) {
    // Host header
    if (!ociRequest.headers.has('host')) {
        const url = UrlParser.parse(ociRequest.uri);

        if (url.host) {
            ociRequest.headers.set('host', url.host);
        }
        else {
            throw new Error('Cannot parse host from url');
        }
    }

    // Date header
    if (!ociRequest.headers.has('x-date')) {
        ociRequest.headers.set('x-date', new Date().toUTCString());
    }

    var headersToSign = ['x-date', '(request-target)', 'host'],
        keyId = auth.get('tenancy') + '/' + auth.get('user') + '/' + auth.get('fingerprint'),
        privateKeyBuffer = sshpk.parsePrivateKey(auth.get('private_key'), 'auto').toBuffer('pem', {});

    httpSignature.sign(new SignerRequest(ociRequest.method, ociRequest.uri, ociRequest.headers), {
        key: privateKeyBuffer,
        keyId: keyId,
        headers: headersToSign
    });
    const authorizationHeader = ociRequest.headers.get('Authorization');

    ociRequest.headers.set('authorization', authorizationHeader.replace('Signature ', 'Signature version="1",'));
    console.log('result: ', authorizationHeader);

    return ociRequest;
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
                property: 'authorization',
                type: 'header'
            },
            {
                property: 'host',
                type: 'header'
            },
            {
                property: 'x-date',
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
        console.log('OCI SIGN CALLED');
        console.log('request headers 1: ', request.headers);
        // TODO: Remove restrictions on body and method
        if (request.body && !request.body.isEmpty()) {
            return done(new Error('Request body not supported'));
        }
        if (request.method.toUpperCase() !== 'GET') {
            return done(new Error('Only GET methods are supported at the moment'));
        }

        const ociRequest = convertPostmanRequestToOCIRequest(request),
            signedOciRequest = processRequestForOci(ociRequest, auth);

        request.addHeader({
            key: 'authorization',
            value: signedOciRequest.headers.get('authorization'),
            system: true
        });
        request.addHeader({
            key: 'x-date',
            value: signedOciRequest.headers.get('x-date'),
            system: true
        });
        request.addHeader({
            key: 'host',
            value: signedOciRequest.headers.get('host'),
            system: true
        });

        return done();
    }
};
