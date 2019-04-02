const fs = require('fs'),
    net = require('net'),
    path = require('path'),
    http = require('http'),
    https = require('https'),
    GraphQL = require('graphql'),
    enableServerDestroy = require('server-destroy');

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
        certDataPath = path.join(__dirname, 'certificates'),
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
        var urlTokens,
            numberOfRedirects,
            responseCode,
            redirectURL;

        server.emit('hit', req, res);

        // /<urlPath>/<numberOfRedirects>/<responseCode>
        if ((/\/\d+\/\d{3}$/).test(req.url)) {
            urlTokens = req.url.split('/');
            numberOfRedirects = parseInt(urlTokens[urlTokens.length - 2], 10);
            responseCode = parseInt(urlTokens[urlTokens.length - 1], 10);

            // redirect until all hops are covered
            if (numberOfRedirects > 1) {
                redirectURL = urlTokens.slice(0, -2).join('/') + `/${(numberOfRedirects - 1)}/${responseCode}`;
            }
            else {
                redirectURL = urlTokens.slice(0, -2).join('/') + '/';
            }

            res.writeHead(responseCode, {location: redirectURL});

            return res.end();
        }

        // emit event if this is not a redirect request
        server.emit(req.url, req, res);
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
        server.emit(req.url, req, res);
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
        var fwd = agent.request({
            host: req.headers.host,
            path: req.url,
            method: req.method.toLowerCase(),
            headers: req.headers
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

module.exports = {
    createSSLServer,
    createHTTPServer,
    createProxyServer,
    createRawEchoServer,
    createGraphQLServer,
    createRedirectServer
};
