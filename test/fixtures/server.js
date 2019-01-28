const net = require('net'),
    fs = require('fs'),
    path = require('path'),
    https = require('https'),
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
 * s.on('/foo', function (req, resp) {
 *     resp.writeHead(200, {'Content-Type': 'text/plain'});
 *     resp.end('Hello World');
 * });
 * s.listen(3000, 'localhost');
 */
function createSSLServer (opts) {
    var i,
        server,
        certDataPath = path.join(__dirname, '..', 'integration-legacy', 'data'),
        options = {
            'key': path.join(certDataPath, 'server-key.pem'),
            'cert': path.join(certDataPath, 'server-crt.pem'),
            'ca': path.join(certDataPath, 'ca-crt.pem')
        };

    options = Object.assign(options, opts);

    for (i in options) {
        if (i !== 'requestCert' && i !== 'rejectUnauthorized' && i !== 'ciphers') {
            options[i] = fs.readFileSync(options[i]);
        }
    }

    server = https.createServer(options, function (req, resp) {
        server.emit(req.url, req, resp);
    });

    enableServerDestroy(server);

    return server;
}

module.exports = {
    createRawEchoServer,
    createSSLServer
};
