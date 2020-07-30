const fs = require('fs'),
    net = require('net'),
    url = require('url'),
    dns = require('dns'),
    _ = require('lodash'),
    path = require('path'),
    http = require('http'),
    https = require('https'),
    crypto = require('crypto'),
    GraphQL = require('graphql'),
    express = require('express'),
    passport = require('passport'),
    ntlmUtils = require('httpntlm').ntlm,
    enableServerDestroy = require('server-destroy'),
    DigestStrategy = require('passport-http').DigestStrategy;

/**
 * Echo raw request message to test
 *  - Body for HTTP methods like GET, HEAD
 *  - Custom HTTP methods
 *
 * @example
 * var s = createRawEchoServer();
 *
 * s.listen(3000, function() {
 *   console.log(s.port);
 *   s.close();
 * });
 *
 * @note For HEAD request, read body from `raw-request` response header
 */
function createRawEchoServer () {
    var server;

    // Reasons behiend creating custom echo server:
    //     - Node's `http` server won't support custom methods
    //       referenc: https://github.com/nodejs/http-parser/blob/master/http_parser.h#L163
    //     - Node's `http` server won't parse body for GET method.

    server = net.createServer(function (socket) {
        socket.on('data', function (chunk) {
            if (this.data === undefined) {
                this.data = '';

                setTimeout(() => {
                    // write the raw packet as it is received in the /raw-echo request body
                    if (this.data.includes('/raw-echo HTTP/1.1')) {
                        return socket.end(this.data.substring(this.data.indexOf('\r\n\r\n')));
                    }

                    // Status Line
                    socket.write('HTTP/1.1 200 ok\r\n');

                    // Response Headers
                    socket.write('connection: close\r\n');
                    socket.write('content-type: text/plain\r\n');
                    socket.write('raw-request: ' + JSON.stringify(this.data) + '\r\n');

                    // CRLF
                    socket.write('\r\n');

                    // Respond with raw request message.
                    //
                    // @note http-parser will blow up if body is sent for HEAD request.
                    // RFC-7231: The HEAD method is identical to GET except that the
                    //           server MUST NOT send a message body in the response.
                    if (!this.data.startsWith('HEAD / HTTP/1.1')) {
                        socket.write(this.data);
                    }

                    socket.end();
                }, 1000);
            }

            this.data += chunk.toString();
        });
    });

    server.on('listening', function () {
        server.port = this.address().port;
        server.url = 'http://localhost:' + server.port;
    });

    enableServerDestroy(server);

    return server;
}

/**
 * Simple SSL server for tests that emit events with the name of request url path.
 *
 * @param {Object} [opts] - Options for https.createServer()
 *
 * @example
 * var s = createSSLServer();
 * s.on('/foo', function (req, res) {
 *     res.writeHead(200, {'Content-Type': 'text/plain'});
 *     res.end('Hello World');
 * });
 * s.listen(3000, 'localhost');
 */
function createSSLServer (opts) {
    var server,
        certDataPath = path.join(__dirname, '../certificates'),
        options = {
            'key': path.join(certDataPath, 'server-key.pem'),
            'cert': path.join(certDataPath, 'server-crt.pem'),
            'ca': path.join(certDataPath, 'ca.pem')
        },
        optionsWithFilePath = ['key', 'cert', 'ca', 'pfx'];

    if (opts) {
        options = Object.assign(options, opts);
    }

    optionsWithFilePath.forEach(function (option) {
        if (!options[option]) { return; }

        options[option] = fs.readFileSync(options[option]);
    });

    server = https.createServer(options, function (req, res) {
        server.emit(req.url, req, res);
    });

    server.on('listening', function () {
        server.port = this.address().port;
        server.url = 'https://localhost:' + server.port;
    });

    enableServerDestroy(server);

    return server;
}

/**
 * Simple redirect server for tests that emit hit events on each request captured.
 * Use the URL format: /<urlPath>/<numberOfRedirects>/<responseCode>
 * The final redirect in redirect chain will happen at /<urlPath>
 *
 * @example
 * var s = createRedirectServer();
 * s.on('hit', function (req, res) {
 *     console.log(req.location);
 * });
 * s.on('/foo', function (req, res)) {
 *     // this is called when there is no redirect.
 * }
 * s.listen(3000, callback);
 */
function createRedirectServer () {
    var server = http.createServer(function (req, res) {
        var redirectURL,
            urlTokens,
            responseCode,
            numberOfRedirects;

        // rest on first request, redirects with `?`
        if (!this.hits || !req.url.includes('?')) {
            this.hits = [];
        }

        // keep track of all the requests made during redirects.
        this.hits.push({
            url: req.url,
            method: req.method,
            headers: req.headers
        });

        // /<numberOfRedirects>/<responseCode>?<hits>
        if ((urlTokens = req.url.match(/^\/(\d+)\/(\d+)/))) {
            numberOfRedirects = parseInt(urlTokens[1], 10);
            responseCode = parseInt(urlTokens[2], 10);

            // redirect until all hops are covered
            if (numberOfRedirects > 1) {
                redirectURL = `/${(numberOfRedirects - 1)}/${responseCode}`;
            }
            else {
                redirectURL = '/';
            }

            res.writeHead(responseCode, {
                location: redirectURL + '?',
                hits: JSON.stringify(this.hits)
            });

            return res.end();
        }

        // emit event if this is not a redirect request
        server.emit('finally', req, res);
    });

    server.on('listening', function () {
        server.port = this.address().port;
        server.url = 'http://localhost:' + server.port;
    });

    enableServerDestroy(server);

    return server;
}

/**
 * Wrapper for HTTP server that emit events with the name of request url path.
 *
 * @example
 * var s = createHTTPServer();
 * s.on('/foo', function (req, res)) {
 *     res.writeHead(200, {'content-type': 'text/plain'});
 *     res.end('Hello world!');
 * }
 * s.listen(3000, callback);
 */
function createHTTPServer () {
    var server = http.createServer(function (req, res) {
        server.emit(req.url.replace(/(\?.*)/, ''), req, res);
    });

    server.on('listening', function () {
        server.port = this.address().port;
        server.url = 'http://localhost:' + server.port;
    });

    enableServerDestroy(server);

    return server;
}

/**
 * Simple HTTP proxy server
 *
 * @param {Object} [options] - Additional options to configure proxy server
 * @param {Object} [options.auth] - Proxy authentication, Basic auth
 * @param {String} [options.agent] - Agent used for http(s).request
 * @param {Boolean} [options.useIPv6] - If true, force using IPv6 address while forwarding request.
 *
 * @example
 * var s = createProxyServer({
 *      headers: { proxy: 'true' },
 *      auth: { username: 'user', password: 'pass' }
 * });
 * s.listen(3000, callback);
 */
function createProxyServer (options) {
    !options && (options = {});

    var agent = options.agent === 'https' ? https : http,
        server = createHTTPServer(),
        proxyAuthHeader;

    // pre calculate proxy-authorization header value
    if (options.auth) {
        proxyAuthHeader = 'Basic ' + Buffer.from(
            `${options.auth.username}:${options.auth.password}`
        ).toString('base64');
    }

    // listen on every incoming request
    server.on('request', function (req, res) {
        // verify proxy authentication if auth is set
        if (options.auth && req.headers['proxy-authorization'] !== proxyAuthHeader) {
            res.writeHead(407);

            return res.end('Proxy Authentication Required');
        }

        // avoid compressed response, ease to respond
        delete req.headers['accept-encoding'];

        // merge headers set in options
        req.headers = Object.assign(req.headers, options.headers || {});

        // forward request to the origin and pipe the response
        var requestUrl = url.parse(req.url),
            fwd = agent.request({
                host: requestUrl.hostname,
                path: requestUrl.path,
                port: requestUrl.port,
                method: req.method.toLowerCase(),
                headers: req.headers,
                lookup: options.useIPv6 && function (hostname, options, callback) {
                    !options && (options = {});
                    options.family = 6;

                    return dns.lookup(hostname, options, callback);
                }
            }, function (resp) {
                resp.pipe(res);
            });

        req.pipe(fwd);
    });

    return server;
}

function createGraphQLServer (options) {
    !options && (options = {});

    if (options.schema) {
        options.schema = GraphQL.buildSchema(options.schema);
    }

    var server = createHTTPServer();

    function badRequest (res, request, error) {
        res.writeHead(400, {
            'content-type': 'application/json'
        });
        res.end(JSON.stringify({
            request: request,
            error: error
        }));
    }

    function responseHandler (req, res, body) {
        var stringBody = body && body.toString && body.toString(),
            request = {
                headers: req.headers,
                body: stringBody
            },
            jsonBody;

        try {
            jsonBody = JSON.parse(body.toString());
        }
        catch (e) {
            return badRequest(res, request, 'Invalid JSON body');
        }

        GraphQL.graphql(
            options.schema,
            jsonBody.query,
            options.root,
            options.context,
            jsonBody.variables,
            jsonBody.operationName)
            .then(function (data) {
                if (data.errors) {
                    return badRequest(res, request, data.errors);
                }

                res.writeHead(200, {
                    'content-type': 'application/json'
                });
                res.end(JSON.stringify({
                    request: request,
                    result: data
                }));
            })
            .catch(function (err) {
                badRequest(res, request, err);
            });
    }

    server.on('request', function (req, res) {
        req.on('data', function (chunk) {
            !this.chunks && (this.chunks = []);

            this.chunks.push(chunk);
        });

        req.on('end', function () {
            responseHandler(req, res, this.chunks && Buffer.concat(this.chunks));
        });
    });

    return server;
}

/**
 * Server with EdgeGrid authentication.
 *
 * @param {Object} [options]
 * @param {String} [options.accessToken] Access token to use for authentication
 * @param {String} [options.clientToken] Client token to use for authentication
 * @param {String} [options.clientSecret] Client secret to use for authentication
 * @param {String[]} [options.headersToSign] Ordered list of headers to include in signature
 */
function createEdgeGridAuthServer (options) {
    !options && (options = {});

    _.defaults(options, {
        accessToken: 'postman_access_token',
        clientToken: 'postman_client_token',
        clientSecret: 'postman_client_secret',
        headersToSign: []
    });

    var server = createHTTPServer();

    function authSuccess (res) {
        res.writeHead(200, {
            'content-type': 'text/plain'
        });
        res.end('authorized');
    }

    function authFail (res) {
        res.writeHead(401, {
            'content-type': 'text/plain'
        });
        res.end('unauthorized');
    }

    // if this function throws error, it means that the authorization header is malformed
    function parseAuthHeader (authHeader) {
        var params = {};

        authHeader = authHeader.split(' ')[1].split(';');

        params.clientToken = authHeader[0].replace('client_token=', '');
        params.accessToken = authHeader[1].replace('access_token=', '');
        params.timestamp = authHeader[2].replace('timestamp=', '');
        params.nonce = authHeader[3].replace('nonce=', '');
        params.signature = authHeader[4].replace('signature=', '');

        return params;
    }

    function base64HmacSha256 (data, key) {
        var encrypt = crypto.createHmac('sha256', key);

        encrypt.update(data);

        return encrypt.digest('base64');
    }

    function base64Sha256 (data) {
        var shasum = crypto.createHash('sha256').update(data);

        return shasum.digest('base64');
    }

    function canonicalizeHeaders (headers) {
        var formattedHeaders = [],
            headerValue;

        if (!_.isArray(options.headersToSign)) {
            return '';
        }

        options.headersToSign.forEach(function (headerName) {
            if (typeof headerName !== 'string') { return; }

            // trim the header name to remove extra spaces
            headerName = headerName.trim().toLowerCase();
            headerValue = headers[headerName];

            // should not include empty headers as per the specification
            if (typeof headerValue !== 'string' || headerValue === '') { return; }

            formattedHeaders.push(`${headerName}:${headerValue.trim().replace(/\s+/g, ' ')}`);
        });

        return formattedHeaders.join('\t');
    }

    function calculateSignature (params) {
        var authHeader = 'EG1-HMAC-SHA256 ',
            signingKey = base64HmacSha256(params.timestamp, options.clientSecret),
            dataToSign;

        authHeader += `client_token=${params.clientToken};`;
        authHeader += `access_token=${params.accessToken};`;
        authHeader += `timestamp=${params.timestamp};`;
        authHeader += `nonce=${params.nonce};`;

        dataToSign = [
            params.method,
            'http',
            `localhost:${server.port}`,
            params.path,
            canonicalizeHeaders(params.headers),
            params.body && params.method === 'POST' ? base64Sha256(params.body) : '',
            authHeader
        ].join('\t');

        return base64HmacSha256(dataToSign, signingKey);
    }

    function authHandler (req, res, body) {
        var authHeader = req.headers.authorization,
            authParams,
            requestSignature;

        if (!authHeader) { return authFail(res); }

        try {
            authParams = parseAuthHeader(authHeader);
        }
        catch (err) {
            // auth is failed if the authHeader is malformed
            return authFail(res);
        }

        // validate the params from authHeader
        if (!(
            authParams.clientToken === options.clientToken &&
            authParams.accessToken === options.accessToken &&
            (/[0-9]{8}T[0-9]{2}:[0-9]{2}:[0-9]{2}\+0000/).test(authParams.timestamp)
        )) {
            return authFail(res);
        }

        authParams.method = req.method;
        authParams.path = req.url;
        authParams.headers = req.headers;
        authParams.body = body && body.toString && body.toString();

        requestSignature = calculateSignature(authParams);

        if (requestSignature !== authParams.signature) {
            return authFail(res);
        }

        return authSuccess(res);
    }

    server.on('request', function (req, res) {
        req.on('data', function (chunk) {
            !this.chunks && (this.chunks = []);

            this.chunks.push(chunk);
        });

        req.on('end', function () {
            authHandler(req, res, this.chunks && Buffer.concat(this.chunks));
        });
    });

    return server;
}

/**
 * Creates an NTLM server.
 *
 * @param {Object} options - The options for the server
 * @param {String} options.username - Username for authentication
 * @param {String} options.password - Password for authentication
 * @param {String} options.domain - Domain name for authentication
 * @param {String} options.workstation - Workstation for authentication
 * @param {Boolean} options.debug - Enable logging of requests
 *
 * @return {Object} - http server
 */
function createNTLMServer (options) {
    options = options || {};

    var type2Message = 'NTLM ' +
            'TlRMTVNTUAACAAAAHgAeADgAAAAFgoqiBevywvJykjAAAAAAAAAAAJgAmABWAAAA' +
            'CgC6RwAAAA9EAEUAUwBLAFQATwBQAC0ASgBTADQAVQBKAFQARAACAB4ARABFAFMA' +
            'SwBUAE8AUAAtAEoAUwA0AFUASgBUAEQAAQAeAEQARQBTAEsAVABPAFAALQBKAFMA' +
            'NABVAEoAVABEAAQAHgBEAEUAUwBLAFQATwBQAC0ASgBTADQAVQBKAFQARAADAB4A' +
            'RABFAFMASwBUAE8AUAAtAEoAUwA0AFUASgBUAEQABwAIADmguzCHn9UBAAAAAA==',
        parsedType2Message = ntlmUtils.parseType2Message(type2Message, _.noop),

        username = options.username || 'username',
        password = options.password || 'password',
        domain = options.domain || '',
        workstation = options.workstation || '',

        type1Message = ntlmUtils.createType1Message({
            domain,
            workstation
        }),
        type3Message = ntlmUtils.createType3Message(parsedType2Message, {
            domain,
            workstation,
            username,
            password
        }),

        handler = function (req, res) {
            var authHeaders = req.headers.authorization;

            // send type2 message and ask for type3 message
            if (authHeaders && authHeaders.startsWith(type1Message.slice(0, 20))) {
                res.writeHead(401, {

                    // @note we're sending a 'Negotiate' header here to make
                    // sure that runtime can handle it.
                    'www-authenticate': [type2Message, 'Negotiate']
                });

                options.debug && console.info('401: got type1 message');
            }

            // successful auth
            // @note we don't check if the username and password are correct
            // because I don't know how.
            else if (authHeaders && authHeaders.startsWith(type3Message.slice(0, 100))) {
                res.writeHead(200);

                options.debug && console.info('200: got type3 message');
            }

            // no valid auth headers, ask for type1 message
            else {
                res.writeHead(401, {
                    'www-authenticate': ['NTLM', 'Negotiate']
                });

                options.debug && console.info('401: got no authorization header');
            }

            res.end();
        },
        server = http.createServer(handler);

    server.on('listening', function () {
        server.port = this.address().port;
        server.url = 'http://localhost:' + server.port;
    });

    enableServerDestroy(server);

    return server;
}

/**
 * Custom junk bytes response server.
 *
 * `/${bytes}` returns binary response of given bytes size.
 */
function createBytesServer () {
    var server = http.createServer(function (req, res) {
        var bytes = Number(req.url.substr(1)) || 0; // remove leading /

        res.writeHead(200);
        res.write(Buffer.alloc(bytes));
        res.end();
    });

    server.on('listening', function () {
        server.port = this.address().port;
        server.url = 'http://localhost:' + server.port;
    });

    enableServerDestroy(server);

    return server;
}

/**
 * Creates an Digest server
 *
 * @param {Object} options - The options for the server
 * @param {String} options.username - Username for authentication
 * @param {String} options.password - Password for authentication
 * @return {Object} - http server
 */
function createDigestServer (options) {
    options = options || {};

    var app = express(),
        expectedUsername = options.username || 'username',
        expectedPassword = options.password || 'password';

    passport.use(new DigestStrategy({qop: 'auth'},
        function (username, done) {
            if (username !== expectedUsername) {
                return done(null, false);
            }

            return done(null, username, expectedPassword);
        }
    ));

    app.all('*',
        passport.authenticate('digest', {session: false}),
        function (req, res) {
            res.send(req.users);
        }
    );

    return app;
}

module.exports = {
    createSSLServer,
    createHTTPServer,
    createProxyServer,
    createRawEchoServer,
    createGraphQLServer,
    createRedirectServer,
    createEdgeGridAuthServer,
    createNTLMServer,
    createBytesServer,
    createDigestServer
};
