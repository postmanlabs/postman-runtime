const net = require('net'),
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

module.exports = {
    createRawEchoServer
};
