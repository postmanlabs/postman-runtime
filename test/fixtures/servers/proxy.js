const server = require('./_servers'),
    options = {
        headers: {
            'x-postman-proxy': 'true'
        }
    };

module.exports = server.createProxyServer(options);
