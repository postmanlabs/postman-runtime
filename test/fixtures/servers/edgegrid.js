const server = require('./_servers'),
    credentials = {
        accessToken: 'postman_access_token',
        clientToken: 'postman_client_token',
        clientSecret: 'postman_client_secret'
    };

module.exports = server.createEdgeGridAuthServer(credentials);
