const server = require('./_servers');

var sslServer = server.createSSLServer({requestCert: true});

sslServer.on('/', function (req, res) {
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
