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
 * Simple SSL server for tests. Send
 *  - 'authorized' to authorized clients.
 *  - 'unauthorized' to unauthorized clients.
 *
 * @param {Boolean} [requestCert=true] - If true, request a certificate from clients that connect
 *
 * @example
 * var s = createSslServer();
 * s.listen(3000, 'localhost');
 */
function createSslServer (requestCert) {
    (requestCert === undefined) && (requestCert = true);

    var certDataPath = path.join(__dirname, '..', 'integration-legacy', 'data'),
        serverKeyPath = path.join(certDataPath, 'server-key.pem'),
        serverCertPath = path.join(certDataPath, 'server-crt.pem'),
        serverCaPath = path.join(certDataPath, 'ca-crt.pem'),

        server = https.createServer({
            key: fs.readFileSync(serverKeyPath),
            cert: fs.readFileSync(serverCertPath),
            ca: fs.readFileSync(serverCaPath),
            requestCert: requestCert
        });

    server.on('request', function (req, res) {
        if (req.client.authorized) {
            res.writeHead(200, {'Content-Type': 'text/plain'});
            res.end('authorized\n');
        }
        else {
            res.writeHead(401, {'Content-Type': 'text/plain'});
            res.end('unauthorized\n');
        }
    });

    enableServerDestroy(server);

    return server;
}

module.exports = {
    createRawEchoServer,
    createSslServer
};
