const server = require('./_servers'),
    sslServer = server.createSSLServer();


sslServer.on('/', function (req, res) {
    res.writeHead(200, {'Content-Type': 'text/plain'});
    res.end('Okay!');
});

sslServer.on('/verify', function (req, res) {
    if (req.client.authorized) {
        res.writeHead(200, {
            'Content-Type': 'text/plain'
        });
        res.end('authorized');
    }
    else {
        res.writeHead(401, {
            'Content-Type': 'text/plain'
        });
        res.end('unauthorized');
    }
});

module.exports = sslServer;
