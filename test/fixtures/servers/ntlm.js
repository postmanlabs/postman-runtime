const server = require('./_servers'),
    USERNAME = 'postman',
    PASSWORD = 'NTLM@123',
    DOMAIN = 'domain',
    WORKSTATION = 'workstation';

module.exports = server.createNTLMServer({
    // debug: true,
    username: USERNAME,
    password: PASSWORD,
    domain: DOMAIN,
    workstation: WORKSTATION
});

