function getAsapRequestsForAlg (alg, privateKey) {
    return {
        auth: {
            type: 'asap',
            asap: {
                alg: alg,
                kid: 'test-kid',
                iss: 'postman.com',
                exp: '2h',
                aud: 'test-audience',
                privateKey: privateKey,
                claims: {
                    jti: 'test-jti'
                }
            }
        },
        url: 'httpbin.org/get',
        method: 'GET',
        header: [],
        data: {
            mode: 'formdata',
            content: []
        },
        description: ''
    };
}

module.exports = {
    getAsapRequestsForAlg
};
