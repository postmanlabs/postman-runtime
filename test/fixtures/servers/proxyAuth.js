const server = require('./_servers'),
    options = {
        headers: {
            'x-postman-proxy': 'true'
        },
        auth: {
            username: 'postman-user',
            password: 'password'
        }
    };

module.exports = server.createProxyServer(options);
