const expect = require('chai').expect,
    jose = require('jose'),
    postmanRequest = require('postman-request'),

    // identify browser or node env
    IS_NODE = typeof window === 'undefined',

    // private & public key for RS, PS, ES Algorithms
    // on test case before we read the key content with local jwt server and replace filepath with key content
    privateKeyMap = {
        // RS & PS
        privatekeyRSA: '../jwt-keys/rsa.private.pem', // fileName inside - test/fixtures/jwt-keys/
        publicKeyRSA: '../jwt-keys/rsa.public.pem',
        invalidPublicKeyRSA: '../jwt-keys/rsa-invalid.public.pem',
        // ES - ECDSA
        privateKeyECDSA256: '../jwt-keys/ecdsa256.private.pem',
        publicKeyECDSA256: '../jwt-keys/ecdsa256.public.pem',
        privateKeyECDSA384: '../jwt-keys/ecdsa384.private.pem',
        publicKeyECDSA384: '../jwt-keys/ecdsa384.public.pem',
        privateKeyECDSA512: '../jwt-keys/ecdsa512.private.pem',
        publicKeyECDSA512: '../jwt-keys/ecdsa512.public.pem'
    },

    // RS algorithms
    RSAlgorithms = {
        RS256: {
            alg: 'RS256',
            signKey: () => {
                return privateKeyMap.privatekeyRSA;
            },
            publicKey: () => {
                return privateKeyMap.publicKeyRSA;
            }
        },
        RS384: {
            alg: 'RS384',
            signKey: () => {
                return privateKeyMap.privatekeyRSA;
            },
            publicKey: () => {
                return privateKeyMap.publicKeyRSA;
            }
        },
        RS512: {
            alg: 'RS512',
            signKey: () => {
                return privateKeyMap.privatekeyRSA;
            },
            publicKey: () => {
                return privateKeyMap.publicKeyRSA;
            }
        }
    },

    // PS algorithms
    PSAlgorithms = {
        PS256: {
            alg: 'PS256',
            signKey: () => {
                return privateKeyMap.privatekeyRSA;
            },
            publicKey: () => {
                return privateKeyMap.publicKeyRSA;
            }
        },
        PS384: {
            alg: 'PS384',
            signKey: () => {
                return privateKeyMap.privatekeyRSA;
            },
            publicKey: () => {
                return privateKeyMap.publicKeyRSA;
            }
        },
        PS512: {
            alg: 'PS512',
            signKey: () => {
                return privateKeyMap.privatekeyRSA;
            },
            publicKey: () => {
                return privateKeyMap.publicKeyRSA;
            }
        }
    },

    // ES algorithms
    ESAlgorithms = {
        ES256: {
            alg: 'ES256',
            signKey: () => {
                return privateKeyMap.privateKeyECDSA256;
            },
            publicKey: () => {
                return privateKeyMap.publicKeyECDSA256;
            }
        },
        ES384: {
            alg: 'ES384',
            signKey: () => {
                return privateKeyMap.privateKeyECDSA384;
            },
            publicKey: () => {
                return privateKeyMap.publicKeyECDSA384;
            }
        },
        ES512: {
            alg: 'ES512',
            signKey: () => {
                return privateKeyMap.privateKeyECDSA512;
            },
            publicKey: () => {
                return privateKeyMap.publicKeyECDSA512;
            }
        }
    },

    // all Algorithms
    algorithmsSupported = {
        ...RSAlgorithms,
        ...PSAlgorithms,
        ...ESAlgorithms
    },

    RSA_BASE64_DER = `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
`,
    RSA_BASE64_DER_INVALID = `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
+)(_*)&(^*%&*()_*&^&()__*&^**(_)+(*)&()*&(()&)*(&*+7N+vPlVTvsPHv
C287Q+KIzqTgDwUxUS8lfU067gPBor2sO/vjTxi3NDZzBZpVH9WGrYUSp/9KcQ7S
h7Fy0cpDbJNME2V3os1HBAM5rPolBe3ZFLT7JetE5WO/bQsQw49kqx5pgykcA9pK
pjukyodCDPcdm9RrV2JBPoTcyGgzasPRFXLfdgt4sefE1Eh7EqfCKCqVaW4oIJo4
6HQWrrQr8VW96TKJYs7zOKD5z5aFibo0jYit74qMZJ+b9PWQhHb92B2cyORrOexZ
gMhb5Xny+98yFnGXIzaz7Qhzhzx1frbYR8jjj5BtT5Bw+ZKaeyCJuKQYyE8b/p5W
UOD9xW0CggEBANpj9Q5jfXFSlBa2FaTnzoTI5vOXqj5d1lCgRooEy/OryqQXyttI
jDMmLpPEWyYGrk6ws7DkMaWSKqSK2sl/MXuwK95ciTusJKUzmTSBGEu9S6fZd30i
kWBkQ5C8yV1LUMwgRTItKfOmEtM9VnelUh8payRZ/lJfiPeUYEIN7OiaccOhHeMS
ko1pgrlGvo0Rr6Qf6nx030do79+y9XnGTJ8ZuI2aFXB+rVwSAU3nmsea5nqWA2T7
clN097Wkk2qtDcCQXVQfUzHT5ER4WpobzA9ke3A2uYc81RZbqjYqJCHavE+WWbeK
+8aNmedz+oIIXvS2ka0U4aeh0j4KwWSd/eUCggEAYPIMxFAyGoep1dVsfDFhcK/n
HYu10IoHu6fS7DmqLgnIYgWJbDtQ/qUCiXZSttoVmzCrgUfGjtFrbcJhctYyJ8sT
R8c7g6ij/pmFGsGr74yZDqtcBfY7c95ryP3SUnWKBUzNyH/grgsdfgfdfB5g/TdC
vaTNnnYbN1qbm6khcMk0Z9xl2VfC3A1SdK8gKLlgHeM0OGBHzspm1uOTNkbeKCqd
pjOtUqTZKLFumlX2NQcfsSGWIeXd55bQSUSMjzsOkjMYYM2i1V4i+gdgdWDI0u/Y
gTlrMaB+wlyJbWzZllihjn36J0dtwYDFSskhyv62Uzg0w3H8fXfp6+Zd3rdv8A==
`,

    // `exp`, `alg` and `jti` are auto-generated if missing
    compulsoryParams = [
        'kid',
        'iss',
        'aud',
        'privateKey'
    ],

    algorithms = Object.entries(algorithmsSupported);


function getRSADerKeyForKeyId (keyId, base64DerKey) {
    return `data:application/pkcs8;kid=${encodeURIComponent(keyId)};base64,${base64DerKey}`;
}

function fetchWrapper (url, options) {
    return new Promise((resolve, reject) => {
        if (IS_NODE) {
            // eslint-disable-next-line no-promise-executor-return
            return postmanRequest.get(url, options, (err, res) => {
                if (err) {
                    return reject(err);
                }

                resolve(res.toJSON());
            });
        }

        fetch(`${url}?${new URLSearchParams({ ...options.qs })}`, { method: 'GET' })
            .then((resp) => {
                return resp.text();
            })
            .then((certKey) => {
                return resolve({ body: certKey });
            })
            .catch((err) => {
                return reject(err);
            });
    });
}

describe('asap auth', function () {
    let testrun, URL_HEADER;

    before(async function () {
        URL_HEADER = global.servers.http + '/headers';

        for await (const key of Object.keys(privateKeyMap)) {
            const response = await fetchWrapper(`${global.servers.jwt}/cert`, {
                qs: {
                    filepath: privateKeyMap[key]
                }
            });

            privateKeyMap[key] = response.body; // eslint-disable-line require-atomic-updates
        }
    });

    // with invalid algorithm - root level
    describe('with invalid auth configuration', function () {
        before(function (done) {
            const runOptions = {
                collection: {
                    item: {
                        request: {
                            url: URL_HEADER,
                            auth: {
                                type: 'asap',
                                asap: {
                                    alg: 'S256', // Invalid alg
                                    kid: 'test-kid',
                                    iss: 'postman.com',
                                    exp: '1h',
                                    aud: 'test-audience',
                                    jti: 'test-jti',
                                    privateKey: ''
                                }
                            }
                        }
                    }
                }
            };

            this.run(runOptions, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        it('should complete the run', function () {
            expect(testrun).to.be.ok;
            expect(testrun).to.nested.include({
                'done.calledOnce': true,
                'start.calledOnce': true,
                'request.calledOnce': true
            });
        });

        it('should not add Authorization header', function () {
            const headers = [],
                request = testrun.request.firstCall.args[3];

            request.headers.members.forEach(function (header) {
                headers.push(header.key);
            });

            expect(headers).that.does.not.include('Authorization');
        });
    });

    // with missing compulsory params - check RFC: https://s2sauth.bitbucket.io/spec/
    compulsoryParams.forEach((param) => {
        describe(`with ${param} param missing in auth configuration`, function () {
            before(function (done) {
                const runOptions = {
                    collection: {
                        item: {
                            request: {
                                url: URL_HEADER,
                                auth: {
                                    type: 'asap',
                                    asap: {
                                        alg: param === 'alg' ? '' : 'RS256',
                                        kid: param === 'kid' ? '' : 'test-kid',
                                        iss: param === 'iss' ? '' : 'postman.com',
                                        exp: '',
                                        aud: param === 'aud' ? '' : 'test-audience',
                                        jti: '',
                                        privateKey: param === 'privateKey' ? '' : privateKeyMap.privatekeyRSA
                                    }
                                }
                            }
                        }
                    }
                };

                this.run(runOptions, function (err, results) {
                    testrun = results;
                    done(err);
                });
            });

            it('should complete the run', function () {
                expect(testrun).to.be.ok;
                expect(testrun).to.nested.include({
                    'done.calledOnce': true,
                    'start.calledOnce': true,
                    'request.calledOnce': true
                });
            });

            it('should not add Authorization header', function () {
                const headers = [],
                    request = testrun.request.firstCall.args[3];

                request.headers.members.forEach(function (header) {
                    headers.push(header.key);
                });

                expect(headers).that.does.not.include('Authorization');
            });
        });
    });

    describe('with base64 DER keys for RS algorithms with invalid key', function () {
        before(function (done) {
            const runOptions = {
                collection: {
                    item: {
                        request: {
                            url: URL_HEADER,
                            auth: {
                                type: 'asap',
                                asap: {
                                    alg: 'RS256',
                                    kid: 'test-kid',
                                    iss: 'postman.com',
                                    aud: 'test-audience',
                                    privateKey: getRSADerKeyForKeyId('test-kid', RSA_BASE64_DER_INVALID)
                                }
                            }
                        }
                    }
                }
            };

            this.run(runOptions, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        it('should complete the run', function () {
            expect(testrun).to.be.ok;
            expect(testrun).to.nested.include({
                'done.calledOnce': true,
                'start.calledOnce': true,
                'request.calledOnce': true
            });
        });

        it('should not add Authorization header', function () {
            const headers = [],
                request = testrun.request.firstCall.args[3];

            request.headers.members.forEach(function (header) {
                headers.push(header.key);
            });

            expect(headers).that.does.not.include('Authorization');
        });
    });

    // with valid params and keys
    algorithms.forEach(([key]) => {
        let alg, signKey, publicKey;

        describe(`with valid params and keys for ${key} algorithm`, function () {
            before(function (done) {
                alg = algorithmsSupported[key].alg;
                signKey = algorithmsSupported[key].signKey();
                publicKey = algorithmsSupported[key].publicKey();

                const runOptions = {
                    collection: {
                        item: {
                            request: {
                                url: URL_HEADER,
                                auth: {
                                    type: 'asap',
                                    asap: {
                                        alg: alg,
                                        kid: 'test-kid',
                                        iss: 'postman.com',
                                        exp: '2h',
                                        aud: 'test-audience',
                                        privateKey: signKey,
                                        claims: {
                                            jti: 'test-jti'
                                        }
                                    }
                                }
                            }
                        }
                    }
                };

                this.run(runOptions, function (err, results) {
                    testrun = results;
                    done(err);
                });
            });

            it('should complete the run', function () {
                expect(testrun).to.be.ok;
                expect(testrun).to.nested.include({
                    'done.calledOnce': true,
                    'start.calledOnce': true,
                    'request.calledOnce': true
                });
            });

            it('should add Authorization header', function () {
                const headers = [],
                    request = testrun.request.firstCall.args[3];

                request.headers.members.forEach(function (header) {
                    headers.push(header.key);
                });

                expect(headers).to.include('Authorization');
            });

            it('should form the correct JWT', async function () {
                const headers = [],
                    request = testrun.request.firstCall.args[3],
                    response = testrun.request.firstCall.args[2];

                request.headers.members.forEach(function (header) {
                    headers.push(header.key);
                });

                let jwtToken;

                request.headers.members.forEach(function (header) {
                    if (header.key === 'Authorization') {
                        jwtToken = header.value.split('Bearer ')[1];
                    }
                });

                expect(response.json()).to.deep.include({
                    key: 'Authorization',
                    value: `Bearer ${jwtToken}`
                });

                // eslint-disable-next-line one-var
                const secret = await jose.importSPKI(publicKey, alg);

                // eslint-disable-next-line one-var
                const { payload, protectedHeader } = await jose.jwtVerify(jwtToken, secret);

                // validate JWT header
                expect(protectedHeader).to.be.deep.equal({ alg: alg, kid: 'test-kid' });

                // validate JWT payload
                expect(payload.sub).to.be.deep.equal('postman.com');
                expect(payload.iss).to.be.deep.equal('postman.com');
                expect(payload.aud).to.be.deep.equal('test-audience');
                expect(payload.jti).to.be.deep.equal('test-jti');

                // Verify the issued at time and expiry times are right
                expect(payload.iat).to.be.a('number');
                expect(payload.exp).to.be.a('number');
                expect(payload.exp).to.be.greaterThan(payload.iat);
                expect(payload.iat + 7200).to.equal(payload.exp);// Default expiry is 1 hour
            });
        });
    });

    // should work with base64 DER keys for RS algorithms
    describe('with base64 DER keys for RS algorithms', function () {
        before(function (done) {
            const runOptions = {
                collection: {
                    item: {
                        request: {
                            url: URL_HEADER,
                            auth: {
                                type: 'asap',
                                asap: {
                                    alg: 'RS256',
                                    kid: 'test-kid',
                                    iss: 'postman.com',
                                    exp: '2h',
                                    aud: 'test-audience',
                                    privateKey: getRSADerKeyForKeyId('test-kid', RSA_BASE64_DER),
                                    claims: {
                                        jti: 'test-jti'
                                    }
                                }
                            }
                        }
                    }
                }
            };

            this.run(runOptions, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        it('should complete the run', function () {
            expect(testrun).to.be.ok;
            expect(testrun).to.nested.include({
                'done.calledOnce': true,
                'start.calledOnce': true,
                'request.calledOnce': true
            });
        });

        it('should add Authorization header', function () {
            const headers = [],
                request = testrun.request.firstCall.args[3];

            request.headers.members.forEach(function (header) {
                headers.push(header.key);
            });

            expect(headers).to.include('Authorization');
        });

        it('should form the correct JWT', async function () {
            const headers = [],
                request = testrun.request.firstCall.args[3],
                response = testrun.request.firstCall.args[2];

            request.headers.members.forEach(function (header) {
                headers.push(header.key);
            });

            let jwtToken;

            request.headers.members.forEach(function (header) {
                if (header.key === 'Authorization') {
                    jwtToken = header.value.split('Bearer ')[1];
                }
            });

            expect(response.json()).to.deep.include({
                key: 'Authorization',
                value: `Bearer ${jwtToken}`
            });

            // eslint-disable-next-line one-var
            const secret = await jose.importSPKI(privateKeyMap.publicKeyRSA, 'RS256');

            // eslint-disable-next-line one-var
            const { payload, protectedHeader } = await jose.jwtVerify(jwtToken, secret);

            // validate JWT header
            expect(protectedHeader).to.be.deep.equal({ alg: 'RS256', kid: 'test-kid' });

            // validate JWT payload
            expect(payload.sub).to.be.deep.equal('postman.com');
            expect(payload.iss).to.be.deep.equal('postman.com');
            expect(payload.aud).to.be.deep.equal('test-audience');
            expect(payload.jti).to.be.deep.equal('test-jti');

            // Verify the issued at time and expiry times are right
            expect(payload.iat).to.be.a('number');
            expect(payload.exp).to.be.a('number');
            expect(payload.exp).to.be.greaterThan(payload.iat);
            expect(payload.iat + 7200).to.equal(payload.exp);// Default expiry is 1 hour
        });
    });

    // should default exp param to 1h if not provided
    describe('with no exp param', function () {
        before(function (done) {
            const runOptions = {
                collection: {
                    item: {
                        request: {
                            url: URL_HEADER,
                            auth: {
                                type: 'asap',
                                asap: {
                                    alg: 'RS256',
                                    kid: 'test-kid',
                                    iss: 'postman.com',
                                    aud: 'test-audience',
                                    jti: 'test-jti',
                                    privateKey: privateKeyMap.privatekeyRSA
                                }
                            }
                        }
                    }
                }
            };

            this.run(runOptions, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        it('should complete the run', function () {
            expect(testrun).to.be.ok;
            expect(testrun).to.nested.include({
                'done.calledOnce': true,
                'start.calledOnce': true,
                'request.calledOnce': true
            });
        });

        it('should add Authorization header', function () {
            const headers = [],
                request = testrun.request.firstCall.args[3];

            request.headers.members.forEach(function (header) {
                headers.push(header.key);
            });

            expect(headers).to.include('Authorization');
        });

        it('should form the correct JWT', async function () {
            const headers = [],
                request = testrun.request.firstCall.args[3],
                response = testrun.request.firstCall.args[2];

            request.headers.members.forEach(function (header) {
                headers.push(header.key);
            });

            let jwtToken;

            request.headers.members.forEach(function (header) {
                if (header.key === 'Authorization') {
                    jwtToken = header.value.split('Bearer ')[1];
                }
            });

            expect(response.json()).to.deep.include({
                key: 'Authorization',
                value: `Bearer ${jwtToken}`
            });

            // eslint-disable-next-line one-var
            const secret = await jose.importSPKI(privateKeyMap.publicKeyRSA, 'RS256');

            // eslint-disable-next-line one-var
            const { payload } = await jose.jwtVerify(jwtToken, secret);

            // Verify the issued at time and expiry times are right
            expect(payload.iat).to.be.a('number');
            expect(payload.exp).to.be.a('number');
            expect(payload.exp).to.be.greaterThan(payload.iat);

            // Verify that the expiry is default 1 hour
            expect(payload.iat + 3600).to.equal(payload.exp);
        });
    });

    // should default exp param to 1h if not provided
    describe('with no jti param', function () {
        before(function (done) {
            const runOptions = {
                collection: {
                    item: {
                        request: {
                            url: URL_HEADER,
                            auth: {
                                type: 'asap',
                                asap: {
                                    alg: 'RS256',
                                    kid: 'test-kid',
                                    iss: 'postman.com',
                                    aud: 'test-audience',
                                    privateKey: privateKeyMap.privatekeyRSA
                                }
                            }
                        }
                    }
                }
            };

            this.run(runOptions, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        it('should complete the run', function () {
            expect(testrun).to.be.ok;
            expect(testrun).to.nested.include({
                'done.calledOnce': true,
                'start.calledOnce': true,
                'request.calledOnce': true
            });
        });

        it('should add Authorization header', function () {
            const headers = [],
                request = testrun.request.firstCall.args[3];

            request.headers.members.forEach(function (header) {
                headers.push(header.key);
            });

            expect(headers).to.include('Authorization');
        });

        it('should generate a jti', async function () {
            const headers = [],
                request = testrun.request.firstCall.args[3],
                response = testrun.request.firstCall.args[2];

            request.headers.members.forEach(function (header) {
                headers.push(header.key);
            });

            let jwtToken;

            request.headers.members.forEach(function (header) {
                if (header.key === 'Authorization') {
                    jwtToken = header.value.split('Bearer ')[1];
                }
            });

            expect(response.json()).to.deep.include({
                key: 'Authorization',
                value: `Bearer ${jwtToken}`
            });

            // eslint-disable-next-line one-var
            const secret = await jose.importSPKI(privateKeyMap.publicKeyRSA, 'RS256');

            // eslint-disable-next-line one-var
            const { payload } = await jose.jwtVerify(jwtToken, secret);

            // Verify the issued at time and expiry times are right
            expect(payload.jti).to.be.a('string');
        });
    });
});
