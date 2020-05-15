const server = require('./_servers'),
    options = {
        useIPv6: true,
        headers: {
            'x-postman-proxy': 'true'
        }
    },
    proxyServer = server.createProxyServer(options),
    _listen = proxyServer.listen;

proxyServer.listen = function (cb) {
    // listening on IPv4
    _listen.call(proxyServer, 0, '127.0.0.1', cb);
};

module.exports = proxyServer;
