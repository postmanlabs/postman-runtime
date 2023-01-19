const expect = require('chai').expect,
    fs = require('fs'),
    path = require('path'),
    jose = require('jose'),
    // jwt key constants
    HEADER = 'header',
    QUERY_PARAM = 'queryParam',

    // load private key
    getKey = (filepath) => {
        return fs.readFileSync(path.join(__dirname, filepath), 'utf8');
    },

    // private & public key for RS, PS, ES Algorithms
    // RS & PS
    privatekeyRSA = getKey('../../fixtures/jwt-keys/rsa.private.pem'),
    publicKeyRSA = getKey('../../fixtures/jwt-keys/rsa.public.pem'),
    invalidPublicKeyRSA = getKey('../../fixtures/jwt-keys/rsa-invalid.public.pem'),
    // ES - ECDSA
    privateKeyECDSA256 = getKey('../../fixtures/jwt-keys/ecdsa256.private.pem'),
    publicKeyECDSA256 = getKey('../../fixtures/jwt-keys/ecdsa256.public.pem'),
    privateKeyECDSA384 = getKey('../../fixtures/jwt-keys/ecdsa384.private.pem'),
    publicKeyECDSA384 = getKey('../../fixtures/jwt-keys/ecdsa384.public.pem'),
    privateKeyECDSA512 = getKey('../../fixtures/jwt-keys/ecdsa512.private.pem'),
    publicKeyECDSA512 = getKey('../../fixtures/jwt-keys/ecdsa512.public.pem'),
    // algorithms
    // HS algorithms
    isHsAlgorithm = (alg) => { return ['HS256', 'HS384', 'HS512'].includes(alg); },

    HSAlgorithms = {
        HS256: {
            alg: 'HS256',
            signKey: 'this-is-a-secret-for-hs-algorithms-with-random-text-aa-bb-cc' + // 60 chars
            'this-is-a-secret-for-hs-algorithms-with-random-text-aa-bb-cc' +
            'this-is-a-secret-for-hs-algorithms-with-random-text-aa-bb-cc' +
            'this-is-a-secret-for-hs-algorithms-with-random-text-aa-bb-cc' // 240 chars (can be upto 256 chars)
        },
        HS384: {
            alg: 'HS384',
            signKey: 'this-is-a-secret-for-hs-algorithms-with-random-text-aa-bb-cc' + // 60 chars
            'this-is-a-secret-for-hs-algorithms-with-random-text-aa-bb-cc' +
            'this-is-a-secret-for-hs-algorithms-with-random-text-aa-bb-cc' +
            'this-is-a-secret-for-hs-algorithms-with-random-text-aa-bb-cc' +
            'this-is-a-secret-for-hs-algorithms-with-random-text-aa-bb-cc' +
            'this-is-a-secret-for-hs-algorithms-with-random-text-aa-bb-cc' // 360 chars (can be upto 384 chars)
        },
        HS512: {
            alg: 'HS512',
            signKey: 'this-is-a-secret-for-hs-algorithms-with-random-text-aa-bb-cc' + // 60 chars
            'this-is-a-secret-for-hs-algorithms-with-random-text-aa-bb-cc' +
            'this-is-a-secret-for-hs-algorithms-with-random-text-aa-bb-cc' +
            'this-is-a-secret-for-hs-algorithms-with-random-text-aa-bb-cc' +
            'this-is-a-secret-for-hs-algorithms-with-random-text-aa-bb-cc' +
            'this-is-a-secret-for-hs-algorithms-with-random-text-aa-bb-cc' +
            'this-is-a-secret-for-hs-algorithms-with-random-text-aa-bb-cc' +
            'this-is-a-secret-for-hs-algorithms-with-random-text-aa-bb-cc' // 480 chars (can be up 512 chars)
        }
    },

    HSBase64SecretEncodedToken = {
        HS256: 'eyJhbGciOiJIUzI1NiJ9.eyJhIjoiMSJ9.t5tKMAD6QRlODKmo-JM3UHWUcZ9M_zqZJtHTDfKU7Uo',
        HS384: 'eyJhbGciOiJIUzM4NCJ9.eyJhIjoiMSJ9.dAqLlk9X1BkAgVbj62CxXpXU3zKPJQzhbh3AOi8-E8J7KL-I-ibzqD1j3FBrr9sQ',
        // eslint-disable-next-line
        HS512: 'eyJhbGciOiJIUzUxMiJ9.eyJhIjoiMSJ9.Yx0W2Wo6T0RdRXgqwvh7Ko6uHT6MnaYsU_N_4Nl1wRfRPdY_OB5awsDwddraC-JkyB9DZthViuuUpGzvO5bedg'
    },

    // RS algorithms
    RSAlgorithms = {
        RS256: {
            alg: 'RS256',
            signKey: privatekeyRSA,
            publicKey: publicKeyRSA
        },
        RS384: {
            alg: 'RS384',
            signKey: privatekeyRSA,
            publicKey: publicKeyRSA
        },
        RS512: {
            alg: 'RS512',
            signKey: privatekeyRSA,
            publicKey: publicKeyRSA
        }
    },

    // PS algorithms
    PSAlgorithms = {
        PS256: {
            alg: 'PS256',
            signKey: privatekeyRSA,
            publicKey: publicKeyRSA
        },
        PS384: {
            alg: 'PS384',
            signKey: privatekeyRSA,
            publicKey: publicKeyRSA
        },
        PS512: {
            alg: 'PS512',
            signKey: privatekeyRSA,
            publicKey: publicKeyRSA
        }
    },

    // ES algorithms
    ESAlgorithms = {
        ES256: {
            alg: 'ES256',
            signKey: privateKeyECDSA256,
            publicKey: publicKeyECDSA256
        },
        ES384: {
            alg: 'ES384',
            signKey: privateKeyECDSA384,
            publicKey: publicKeyECDSA384
        },
        ES512: {
            alg: 'ES512',
            signKey: privateKeyECDSA512,
            publicKey: publicKeyECDSA512
        }
    },

    // all Algorithms
    algorithmsSupported = {
        ...HSAlgorithms,
        ...RSAlgorithms,
        ...PSAlgorithms,
        ...ESAlgorithms
    },

    algorithms = Object.entries(algorithmsSupported);

describe('jwt auth', function () {
    let testrun;

    // with invalid algorithm - root level
    describe('with invalid root level algorithm', function () {
        before(function (done) {
            const runOptions = {
                collection: {
                    item: {
                        request: {
                            url: 'https://postman-echo.com/headers',
                            auth: {
                                type: 'jwt',
                                jwt: {
                                    algorithm: '', // invalid root level algo
                                    header: { alg: 'HS256' },
                                    payload: { test: 123 },
                                    secret: '112345',
                                    addTokenTo: HEADER
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

    // with invalid header
    algorithms.forEach(([key]) => {
        const { alg, signKey } = algorithmsSupported[key];

        describe(`with invalid header for ${alg} algorithm`, function () {
            before(function (done) {
                const runOptions = {
                    collection: {
                        item: {
                            request: {
                                url: 'https://postman-echo.com/headers',
                                auth: {
                                    type: 'jwt',
                                    jwt: {
                                        algorithm: alg,
                                        header: 'non-json',
                                        payload: { test: 123 },
                                        secret: signKey,
                                        privateKey: signKey,
                                        addTokenTo: HEADER
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

    // with empty header
    algorithms.forEach(([key]) => {
        const { alg, signKey } = algorithmsSupported[key];

        describe(`with empty header for ${alg} algorithm`, function () {
            before(function (done) {
                const runOptions = {
                    collection: {
                        item: {
                            request: {
                                url: 'https://postman-echo.com/headers',
                                auth: {
                                    type: 'jwt',
                                    jwt: {
                                        algorithm: alg,
                                        header: '',
                                        payload: { test: 123 },
                                        secret: signKey,
                                        privateKey: signKey,
                                        addTokenTo: HEADER
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
        });
    });

    // with empty payload
    algorithms.forEach(([key]) => {
        const { alg, signKey } = algorithmsSupported[key];

        describe(`with empty payload for ${alg} algorithm`, function () {
            before(function (done) {
                const runOptions = {
                    collection: {
                        item: {
                            request: {
                                url: 'https://postman-echo.com/headers',
                                auth: {
                                    type: 'jwt',
                                    jwt: {
                                        algorithm: alg,
                                        header: '',
                                        payload: '',
                                        secret: signKey,
                                        privateKey: signKey,
                                        addTokenTo: HEADER
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
        });
    });

    // with `null` header
    algorithms.forEach(([key]) => {
        const { alg, signKey } = algorithmsSupported[key];

        describe(`with "null" header for ${alg} algorithm`, function () {
            before(function (done) {
                const runOptions = {
                    collection: {
                        item: {
                            request: {
                                url: 'https://postman-echo.com/headers',
                                auth: {
                                    type: 'jwt',
                                    jwt: {
                                        algorithm: alg,
                                        header: null,
                                        payload: { test: 123 },
                                        secret: signKey,
                                        privateKey: signKey,
                                        addTokenTo: HEADER
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
        });
    });

    // with invalid secret
    algorithms.forEach(([key]) => {
        const { alg } = algorithmsSupported[key];

        describe(`with invalid secret for ${alg} algorithm`, function () {
            before(function (done) {
                const runOptions = {
                    collection: {
                        item: {
                            request: {
                                url: 'https://postman-echo.com/headers',
                                auth: {
                                    type: 'jwt',
                                    jwt: {
                                        algorithm: alg,
                                        header: { alg },
                                        payload: { test: 123 },
                                        secret: null,
                                        privateKey: null,
                                        addTokenTo: HEADER
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

    // with invalid signature - HS algorithms
    Object.entries(HSAlgorithms).forEach(([key]) => {
        const { alg, signKey } = algorithmsSupported[key];

        describe(`with invalid signature for ${alg} algorithm`, function () {
            const issuedAt = Math.floor(Date.now() / 1000),
                expiresIn = Math.floor(Date.now() / 1000) + (60 * 60);

            before(function (done) {
                const runOptions = {
                    collection: {
                        item: {
                            request: {
                                url: 'https://postman-echo.com/get',
                                auth: {
                                    type: 'jwt',
                                    jwt: {
                                        algorithm: alg,
                                        header: { typ: 'JWT' },
                                        payload: {
                                            iat: issuedAt,
                                            exp: expiresIn
                                        },
                                        secret: signKey,
                                        privateKey: signKey,
                                        addTokenTo: HEADER
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

            it('should throw invalid signature error', async function () {
                const headers = [],
                    request = testrun.request.firstCall.args[3],
                    response = testrun.request.firstCall.args[2];

                let jwtToken;

                request.headers.members.forEach(function (header) {
                    if (header.key === 'Authorization') {
                        jwtToken = header.value.split('Bearer ')[1];
                    }
                    headers.push(header.key);
                });

                expect(response.json()).to.nested.include({
                    'headers.authorization': `Bearer ${jwtToken}`
                });

                try {
                    await jose.jwtVerify(jwtToken, '123');
                }
                catch (e) {
                    expect(e.message)
                        .to.be.equal(`Key for the ${alg} algorithm must be one of type KeyObject or Uint8Array.`);
                }
            });
        });
    });

    // with invalid signature - RS,PS algorithms
    Object.entries({ ...RSAlgorithms, ...PSAlgorithms }).forEach(([key]) => {
        const { alg, signKey } = algorithmsSupported[key];

        describe(`with invalid signature for ${alg} algorithm`, function () {
            const issuedAt = Math.floor(Date.now() / 1000),
                expiresIn = Math.floor(Date.now() / 1000) + (60 * 60);

            before(function (done) {
                const runOptions = {
                    collection: {
                        item: {
                            request: {
                                url: 'https://postman-echo.com/get',
                                auth: {
                                    type: 'jwt',
                                    jwt: {
                                        algorithm: alg,
                                        header: { typ: 'JWT' },
                                        payload: {
                                            iat: issuedAt,
                                            exp: expiresIn
                                        },
                                        secret: signKey,
                                        privateKey: signKey,
                                        addTokenTo: HEADER
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

            it('should throw invalid signature error', async function () {
                const headers = [],
                    request = testrun.request.firstCall.args[3],
                    response = testrun.request.firstCall.args[2];

                let jwtToken;

                request.headers.members.forEach(function (header) {
                    if (header.key === 'Authorization') {
                        jwtToken = header.value.split('Bearer ')[1];
                    }
                    headers.push(header.key);
                });

                expect(response.json()).to.nested.include({
                    'headers.authorization': `Bearer ${jwtToken}`
                });

                try {
                    await jose.jwtVerify(jwtToken, invalidPublicKeyRSA);
                }
                catch (e) {
                    expect(e.message).to.be.equal(`Key for the ${alg} algorithm must be of type KeyObject.`);
                }
            });
        });
    });

    // with valid header object & custom fields
    algorithms.forEach(([key]) => {
        const { alg, signKey, publicKey } = algorithmsSupported[key];

        describe(`with valid header object for ${alg} algorithm`, function () {
            before(function (done) {
                const runOptions = {
                    collection: {
                        item: {
                            request: {
                                url: 'https://postman-echo.com/headers',
                                auth: {
                                    type: 'jwt',
                                    jwt: {
                                        algorithm: alg,
                                        header: {
                                            alg: alg,
                                            typ: 'JWT',
                                            cty: 'JWT',
                                            kid: '12345',
                                            jku: '{{jku}}'
                                        },
                                        payload: { test: 123 },
                                        secret: signKey,
                                        privateKey: signKey,
                                        tokenAddTo: HEADER
                                    }
                                }
                            }
                        }
                    },
                    environment: {
                        values: [
                            {
                                key: 'jku',
                                value: 'test-jku'
                            }
                        ]
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

            it('should add Authorization header', async function () {
                const headers = [],
                    request = testrun.request.firstCall.args[3],
                    response = testrun.request.firstCall.args[2];

                let jwtToken;

                request.headers.members.forEach(function (header) {
                    if (header.key === 'Authorization') {
                        jwtToken = header.value.split('Bearer ')[1];
                    }
                    headers.push(header.key);
                });

                expect(response.json()).to.nested.include({
                    'headers.authorization': `Bearer ${jwtToken}`
                });

                // eslint-disable-next-line one-var
                const secret = isHsAlgorithm(alg) ? new TextEncoder().encode(signKey) :
                    await jose.importSPKI(publicKey, alg);

                // eslint-disable-next-line one-var
                const { payload, protectedHeader } = await jose.jwtVerify(jwtToken, secret);

                expect(payload).to.be.deep.equal({ test: 123 });

                expect(protectedHeader).to.be.deep.equal({
                    alg: alg,
                    typ: 'JWT',
                    kid: '12345',
                    cty: 'JWT',
                    jku: 'test-jku'
                });
            });
        });
    });

    // with valid JSON header string
    algorithms.forEach(([key]) => {
        const { alg, signKey, publicKey } = algorithmsSupported[key];

        describe(`with valid header JSON string for ${alg} algorithm`, function () {
            before(function (done) {
                const runOptions = {
                    collection: {
                        item: {
                            request: {
                                url: 'https://postman-echo.com/headers',
                                auth: {
                                    type: 'jwt',
                                    jwt: {
                                        algorithm: alg,
                                        header: '{\n "typ": "JWT",\n "jku": "{{jku}}",\n "test12": "demo"}',
                                        payload: '{\n "test": "{{jku}}" }',
                                        secret: '{{signKey}}',
                                        privateKey: '{{signKey}}',
                                        addTokenTo: HEADER
                                    }
                                }
                            }
                        }
                    },
                    environment: {
                        values: [
                            {
                                key: 'signKey',
                                value: signKey
                            },
                            {
                                key: 'jku',
                                value: 'abc-123'
                            }
                        ]
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

            it('should add Authorization header', async function () {
                const headers = [],
                    request = testrun.request.firstCall.args[3],
                    response = testrun.request.firstCall.args[2];

                let jwtToken;

                request.headers.members.forEach(function (header) {
                    if (header.key === 'Authorization') {
                        jwtToken = header.value.split('Bearer ')[1];
                    }
                    headers.push(header.key);
                });

                expect(response.json()).to.nested.include({
                    'headers.authorization': `Bearer ${jwtToken}`
                });

                // eslint-disable-next-line one-var
                const secret = isHsAlgorithm(alg) ? new TextEncoder().encode(signKey) :
                    await jose.importSPKI(publicKey, alg);

                // eslint-disable-next-line one-var
                const { payload, protectedHeader } = await jose.jwtVerify(jwtToken, secret);

                expect(payload).to.be.deep.equal({ test: 'abc-123' });

                expect(protectedHeader).to.be.deep.equal({
                    alg: alg,
                    typ: 'JWT',
                    test12: 'demo',
                    jku: 'abc-123'
                });
            });
        });
    });

    // with invalid header & payload for JSON string
    algorithms.forEach(([key]) => {
        const { alg, signKey } = algorithmsSupported[key];

        describe(`with invalid header & payload JSON string for ${alg} algorithm`, function () {
            before(function (done) {
                const runOptions = {
                    collection: {
                        item: {
                            request: {
                                url: 'https://postman-echo.com/headers',
                                auth: {
                                    type: 'jwt',
                                    jwt: {
                                        algorithm: alg,
                                        header: '{\n "typ": "JWS",\n "jku": {{jku}},\n "test12": "demo"}',
                                        payload: '{\n "test": {{jku}} }', // invalid using string without quotes {{jku}}
                                        secret: '{{signKey}}',
                                        privateKey: '{{signKey}}',
                                        addTokenTo: HEADER
                                    }
                                }
                            }
                        }
                    },
                    environment: {
                        values: [
                            {
                                key: 'signKey',
                                value: signKey
                            },
                            {
                                key: 'jku',
                                value: 'test-123'
                            }
                        ]
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

    // with header algorithm is different from root level alg
    describe('with header algorithm & root level algorithm', function () {
        before(function (done) {
            const runOptions = {
                collection: {
                    item: {
                        request: {
                            url: 'https://postman-echo.com/headers',
                            auth: {
                                type: 'jwt',
                                jwt: {
                                    algorithm: 'HS256',
                                    header: { alg: 'HS512', typ: 'JWT' }, // alg is different from root algorithm
                                    payload: '{\n "test": "{{jku}}" }',
                                    secret: '{{signKey}}',
                                    addTokenTo: HEADER
                                }
                            }
                        }
                    }
                },
                environment: {
                    values: [
                        {
                            key: 'signKey',
                            value: '123'
                        },
                        {
                            key: 'jku',
                            value: 'test-123'
                        }
                    ]
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

        it('should add Authorization header with jwt token for HS256 algorithm', async function () {
            const headers = [],
                request = testrun.request.firstCall.args[3],
                response = testrun.request.firstCall.args[2];

            let jwtToken;

            request.headers.members.forEach(function (header) {
                if (header.key === 'Authorization') {
                    jwtToken = header.value.split('Bearer ')[1];
                }
                headers.push(header.key);
            });

            expect(response.json()).to.nested.include({
                'headers.authorization': `Bearer ${jwtToken}`
            });

            // eslint-disable-next-line one-var
            const secret = new TextEncoder().encode('123');

            // eslint-disable-next-line one-var
            const { payload, protectedHeader } = await jose.jwtVerify(jwtToken, secret);

            expect(payload).to.be.deep.equal({ test: 'test-123' });

            expect(protectedHeader).to.be.deep.equal({
                alg: 'HS256',
                typ: 'JWT'
            });
        });
    });

    // with valid payload and add to Authorization as Bearer
    algorithms.forEach(([key]) => {
        const { alg, signKey, publicKey } = algorithmsSupported[key];

        describe(`with valid payload for ${alg} algorithm`, function () {
            before(function (done) {
                const runOptions = {
                    collection: {
                        item: {
                            request: {
                                url: 'https://postman-echo.com/headers',
                                auth: {
                                    type: 'jwt',
                                    jwt: {
                                        algorithm: alg,
                                        header: { typ: 'JWT' },
                                        payload: { test: 123, name: 'demo-name' },
                                        secret: '{{signKey}}',
                                        privateKey: '{{signKey}}',
                                        addTokenTo: HEADER
                                    }
                                }
                            }
                        }
                    },
                    environment: {
                        values: [
                            {
                                key: 'signKey',
                                value: signKey
                            }
                        ]
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

            it('should add Authorization header with bearer as jwt token', async function () {
                const headers = [],
                    request = testrun.request.firstCall.args[3],
                    response = testrun.request.firstCall.args[2];

                let jwtToken;

                request.headers.members.forEach(function (header) {
                    if (header.key === 'Authorization') {
                        jwtToken = header.value.split('Bearer ')[1];
                    }
                    headers.push(header.key);
                });

                expect(response.json()).to.nested.include({
                    'headers.authorization': `Bearer ${jwtToken}`
                });


                // eslint-disable-next-line one-var
                const secret = isHsAlgorithm(alg) ? new TextEncoder().encode(signKey) :
                    await jose.importSPKI(publicKey, alg);

                // eslint-disable-next-line one-var
                const { payload, protectedHeader } = await jose.jwtVerify(jwtToken, secret);

                expect(payload).to.be.deep.equal({ test: 123, name: 'demo-name' });

                expect(protectedHeader).to.be.deep.equal({
                    alg: alg,
                    typ: 'JWT'
                });
            });
        });
    });

    // with valid payload and add to Authorization as user prefix
    algorithms.forEach(([key]) => {
        const { alg, signKey, publicKey } = algorithmsSupported[key];

        describe(`with valid payload for ${alg} algorithm and custom token prefix`, function () {
            before(function (done) {
                const runOptions = {
                    collection: {
                        item: {
                            request: {
                                url: 'https://postman-echo.com/headers',
                                auth: {
                                    type: 'jwt',
                                    jwt: {
                                        algorithm: alg,
                                        header: { typ: 'JWT' },
                                        payload: { test: 123, name: 'demo-name' },
                                        secret: '{{signKey}}',
                                        privateKey: '{{signKey}}',
                                        addTokenTo: HEADER,
                                        headerPrefix: 'jwt-prefix'
                                    }
                                }
                            }
                        }
                    },
                    environment: {
                        values: [
                            {
                                key: 'signKey',
                                value: signKey
                            }
                        ]
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

            it('should add Authorization header with bearer as jwt token', async function () {
                const headers = [],
                    request = testrun.request.firstCall.args[3],
                    response = testrun.request.firstCall.args[2];

                let jwtToken;

                request.headers.members.forEach(function (header) {
                    if (header.key === 'Authorization') {
                        jwtToken = header.value.split('jwt-prefix ')[1];
                    }
                    headers.push(header.key);
                });

                expect(response.json()).to.nested.include({
                    'headers.authorization': `jwt-prefix ${jwtToken}`
                });

                // eslint-disable-next-line one-var
                const secret = isHsAlgorithm(alg) ? new TextEncoder().encode(signKey) :
                    await jose.importSPKI(publicKey, alg);

                // eslint-disable-next-line one-var
                const { payload, protectedHeader } = await jose.jwtVerify(jwtToken, secret);

                expect(payload).to.be.deep.equal({ test: 123, name: 'demo-name' });

                expect(protectedHeader).to.be.deep.equal({
                    alg: alg,
                    typ: 'JWT'
                });
            });
        });
    });

    // with payload as JSON String
    algorithms.forEach(([key]) => {
        const { alg, signKey, publicKey } = algorithmsSupported[key];

        describe(`with payload as JSON String for ${alg} algorithm`, function () {
            before(function (done) {
                const runOptions = {
                    collection: {
                        item: {
                            request: {
                                url: 'https://postman-echo.com/headers',
                                auth: {
                                    type: 'jwt',
                                    jwt: {
                                        algorithm: alg,
                                        header: { typ: 'JWT' },
                                        payload: '{\n "uno": 1,\n "dos": 2\n}',
                                        secret: '{{signKey}}',
                                        privateKey: '{{signKey}}',
                                        addTokenTo: HEADER,
                                        headerPrefix: 'Bearer'
                                    }
                                }
                            }
                        }
                    },
                    environment: {
                        values: [
                            {
                                key: 'signKey',
                                value: signKey
                            }
                        ]
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

            it('should add Authorization header with bearer as jwt token', async function () {
                const headers = [],
                    request = testrun.request.firstCall.args[3],
                    response = testrun.request.firstCall.args[2];

                let jwtToken;

                request.headers.members.forEach(function (header) {
                    if (header.key === 'Authorization') {
                        jwtToken = header.value.split('Bearer ')[1];
                    }
                    headers.push(header.key);
                });

                expect(response.json()).to.nested.include({
                    'headers.authorization': `Bearer ${jwtToken}`
                });

                // eslint-disable-next-line one-var
                const secret = isHsAlgorithm(alg) ? new TextEncoder().encode(signKey) :
                    await jose.importSPKI(publicKey, alg);

                // eslint-disable-next-line one-var
                const { payload, protectedHeader } = await jose.jwtVerify(jwtToken, secret);

                expect(payload).to.be.deep.equal({ uno: 1, dos: 2 });

                expect(protectedHeader).to.be.deep.equal({
                    alg: alg,
                    typ: 'JWT'
                });
            });
        });
    });

    // with payload as JSON String with variables
    algorithms.forEach(([key]) => {
        const { alg, signKey, publicKey } = algorithmsSupported[key];

        describe(`with payload as JSON String and env variable for ${alg} algorithm`, function () {
            before(function (done) {
                const runOptions = {
                    collection: {
                        item: {
                            request: {
                                url: 'https://postman-echo.com/headers',
                                auth: {
                                    type: 'jwt',
                                    jwt: {
                                        algorithm: alg,
                                        header: { typ: 'JWT' },
                                        payload: '{\n "uno": 1,\n "dos": 2\n,\n "number": {{number}}}',
                                        secret: '{{signKey}}',
                                        privateKey: '{{signKey}}',
                                        addTokenTo: HEADER
                                    }
                                }
                            }
                        }
                    },
                    environment: {
                        values: [
                            {
                                key: 'signKey',
                                value: signKey
                            },
                            {
                                key: 'number',
                                value: 12345
                            }
                        ]
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

            it('should add Authorization header with bearer as jwt token', async function () {
                const headers = [],
                    request = testrun.request.firstCall.args[3],
                    response = testrun.request.firstCall.args[2];

                let jwtToken;

                request.headers.members.forEach(function (header) {
                    if (header.key === 'Authorization') {
                        jwtToken = header.value.split('Bearer ')[1];
                    }
                    headers.push(header.key);
                });

                expect(response.json()).to.nested.include({
                    'headers.authorization': `Bearer ${jwtToken}`
                });

                // eslint-disable-next-line one-var
                const secret = isHsAlgorithm(alg) ? new TextEncoder().encode(signKey) :
                    await jose.importSPKI(publicKey, alg);

                // eslint-disable-next-line one-var
                const { payload, protectedHeader } = await jose.jwtVerify(jwtToken, secret);

                expect(payload).to.be.deep.equal({ uno: 1, dos: 2 , number : 12345});

                expect(protectedHeader).to.be.deep.equal({
                    alg: alg,
                    typ: 'JWT'
                });
            });
        });
    });

    // with valid payload for registered claim and add to query param
    algorithms.forEach(([key]) => {
        const { alg, signKey, publicKey } = algorithmsSupported[key];

        describe(`with registered claim payload for ${alg} algorithm`, function () {
            const issuedAt = Math.floor(Date.now() / 1000),
                notBefore = Math.floor(Date.now() / 1000) - (60 * 60),
                expiresIn = Math.floor(Date.now() / 1000) + (60 * 60), // 1hr expiry
                issuer = 'https://dev-0yc9dnt0.us.auth0.com/',
                subject = 'auth0|6062e94f20d55800692b4dad',
                audience = 'lasEkslasjnn2324nxskskosdk',
                jwtId = 'sjh3h46bsdh37ybasjha237612723';


            before(function (done) {
                const runOptions = {
                    collection: {
                        item: {
                            request: {
                                url: 'https://postman-echo.com/get',
                                auth: {
                                    type: 'jwt',
                                    jwt: {
                                        algorithm: alg,
                                        header: { typ: 'JWT' },
                                        payload: {
                                            iat: issuedAt,
                                            exp: expiresIn,
                                            aud: audience,
                                            iss: '{{issuer}}',
                                            sub: '{{subject}}',
                                            jti: jwtId,
                                            nbf: notBefore
                                        },
                                        secret: '{{signKey}}',
                                        privateKey: '{{signKey}}',
                                        addTokenTo: QUERY_PARAM,
                                        queryParamKey: 'jwt'
                                    }
                                }
                            }
                        }
                    },
                    environment: {
                        values: [
                            {
                                key: 'signKey',
                                value: signKey
                            },
                            {
                                key: 'issuer',
                                value: issuer
                            },
                            {
                                key: 'subject',
                                value: subject
                            },
                            {
                                key: 'issuedAt',
                                value: issuedAt
                            }
                        ]
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

            it('should generate a valid jwt token & add to query param', async function () {
                const queries = [],
                    request = testrun.request.firstCall.args[3],
                    response = testrun.request.firstCall.args[2];

                let jwtToken;

                request.url.query.members.forEach(function (query) {
                    if (query.key === 'jwt') {
                        jwtToken = query.value;
                    }
                    queries.push(query.value);
                });

                // eslint-disable-next-line one-var
                const secret = isHsAlgorithm(alg) ? new TextEncoder().encode(signKey) :
                    await jose.importSPKI(publicKey, alg);

                // eslint-disable-next-line one-var
                const { payload, protectedHeader } = await jose.jwtVerify(jwtToken, secret);

                expect(response.json()).to.nested.include({
                    'args.jwt': jwtToken
                });

                expect(payload).to.be.deep.equal({
                    aud: 'lasEkslasjnn2324nxskskosdk',
                    exp: expiresIn,
                    iat: issuedAt,
                    iss: 'https://dev-0yc9dnt0.us.auth0.com/',
                    jti: 'sjh3h46bsdh37ybasjha237612723',
                    nbf: notBefore,
                    sub: 'auth0|6062e94f20d55800692b4dad'
                });

                expect(protectedHeader).to.be.deep.equal({
                    alg: alg,
                    typ: 'JWT'
                });
            });
        });
    });

    // with private and public claim payload
    algorithms.forEach(([key]) => {
        const { alg, signKey, publicKey } = algorithmsSupported[key];

        describe(`with private and public claim payload for ${alg} algorithm`, function () {
            before(function (done) {
                const runOptions = {
                    collection: {
                        item: {
                            request: {
                                url: 'https://postman-echo.com/get',
                                auth: {
                                    type: 'jwt',
                                    jwt: {
                                        algorithm: alg,
                                        header: { typ: 'JWT' },
                                        payload: {
                                            customField: 'test', // private claim
                                            isAdmin: true, // private claim
                                            email: 'test@gmail.com', // public claim openId
                                            sid: 12345 // public claim IESG
                                        },
                                        secret: '{{signKey}}',
                                        privateKey: '{{signKey}}',
                                        addTokenTo: QUERY_PARAM,
                                        queryParamKey: 'jwtToken'
                                    }
                                }
                            }
                        }
                    },
                    environment: {
                        values: [
                            {
                                key: 'signKey',
                                value: signKey
                            }
                        ]
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

            it('should generate a valid jwt token & add to query param correctly', async function () {
                const queries = [],
                    request = testrun.request.firstCall.args[3],
                    response = testrun.request.firstCall.args[2];

                let jwtToken;

                request.url.query.members.forEach(function (query) {
                    if (query.key === 'jwtToken') {
                        jwtToken = query.value;
                    }
                    queries.push(query.value);
                });

                // eslint-disable-next-line one-var
                const secret = isHsAlgorithm(alg) ? new TextEncoder().encode(signKey) :
                    await jose.importSPKI(publicKey, alg);

                // eslint-disable-next-line one-var
                const { payload, protectedHeader } = await jose.jwtVerify(jwtToken, secret);

                expect(response.json()).to.nested.include({
                    'args.jwtToken': jwtToken
                });

                expect(payload).to.be.deep.equal({
                    customField: 'test', // private claim
                    isAdmin: true, // private claim
                    email: 'test@gmail.com', // public claim openId
                    sid: 12345 // public claim IESG
                });

                expect(protectedHeader).to.be.deep.equal({ alg: alg, typ: 'JWT' });
            });
        });
    });

    // with iat claim as env variable
    algorithms.forEach(([key]) => {
        const { alg, signKey, publicKey } = algorithmsSupported[key];

        describe(`with iat claim payload as env variable for ${alg} algorithm`, function () {
            const issuedAt = Math.floor(Date.now() / 1000);

            before(function (done) {
                const runOptions = {
                    collection: {
                        item: {
                            request: {
                                url: 'https://postman-echo.com/get',
                                auth: {
                                    type: 'jwt',
                                    jwt: {
                                        algorithm: alg,
                                        header: { typ: 'JWT' },
                                        // eslint-disable-next-line
                                        payload: '{\n    \"iat\":{{issuedAt}}\n}',
                                        secret: '{{signKey}}',
                                        privateKey: '{{signKey}}',
                                        addTokenTo: QUERY_PARAM,
                                        queryParamKey: 'jwt'
                                    }
                                }
                            }
                        }
                    },
                    environment: {
                        values: [
                            {
                                key: 'signKey',
                                value: signKey
                            },
                            {
                                key: 'issuedAt',
                                value: issuedAt
                            }
                        ]
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

            it('should generate a valid jwt token & add to query param correctly', async function () {
                const queries = [],
                    request = testrun.request.firstCall.args[3],
                    response = testrun.request.firstCall.args[2];

                let jwtToken;

                request.url.query.members.forEach(function (query) {
                    if (query.key === 'jwt') {
                        jwtToken = query.value;
                    }
                    queries.push(query.value);
                });

                // eslint-disable-next-line one-var
                const secret = isHsAlgorithm(alg) ? new TextEncoder().encode(signKey) :
                    await jose.importSPKI(publicKey, alg);

                // eslint-disable-next-line one-var
                const { payload, protectedHeader } = await jose.jwtVerify(jwtToken, secret);

                expect(response.json()).to.nested.include({
                    'args.jwt': jwtToken
                });

                expect(payload).to.be.deep.equal({
                    iat: issuedAt
                });

                expect(protectedHeader).to.be.deep.equal({ alg: alg, typ: 'JWT' });
            });
        });
    });

    // with nbf greater than iat should not verify token
    algorithms.forEach(([key]) => {
        const { alg, signKey, publicKey } = algorithmsSupported[key];

        describe(`with nbf is greater than iat for ${alg} algorithm`, function () {
            const issuedAt = Math.floor(Date.now() / 1000),
                notBefore = Math.floor(Date.now() / 1000) + (60 * 60 * 60),
                expiresIn = Math.floor(Date.now() / 1000) + (60 * 60 * 60),
                issuer = 'https://dev-0yc9dnt0.us.auth0.com/',
                subject = 'auth0|6062e94f20d55800692b4dad',
                audience = 'lasEkslasjnn2324nxskskosdk',
                jwtId = 'sjh3h46bsdh37ybasjha237612723';


            before(function (done) {
                const runOptions = {
                    collection: {
                        item: {
                            request: {
                                url: 'https://postman-echo.com/get',
                                auth: {
                                    type: 'jwt',
                                    jwt: {
                                        algorithm: alg,
                                        header: { typ: 'JWT' },
                                        payload: {
                                            iat: issuedAt,
                                            exp: expiresIn,
                                            aud: audience,
                                            iss: '{{issuer}}',
                                            sub: '{{subject}}',
                                            jwtId: jwtId,
                                            nbf: notBefore
                                        },
                                        secret: '{{signKey}}',
                                        privateKey: '{{signKey}}',
                                        addTokenTo: HEADER
                                    }
                                }
                            }
                        }
                    },
                    environment: {
                        values: [
                            {
                                key: 'signKey',
                                value: signKey
                            },
                            {
                                key: 'issuer',
                                value: issuer
                            },
                            {
                                key: 'subject',
                                value: subject
                            }
                        ]
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

            it('should not verify token when nbf is greater than iat', async function () {
                const headers = [],
                    request = testrun.request.firstCall.args[3],
                    response = testrun.request.firstCall.args[2];

                let jwtToken;

                request.headers.members.forEach(function (header) {
                    if (header.key === 'Authorization') {
                        jwtToken = header.value.split('Bearer ')[1];
                    }
                    headers.push(header.key);
                });

                expect(response.json()).to.nested.include({
                    'headers.authorization': `Bearer ${jwtToken}`
                });

                try {
                    // eslint-disable-next-line one-var
                    const secret = isHsAlgorithm(alg) ? new TextEncoder().encode(signKey) :
                        await jose.importSPKI(publicKey, alg);

                    await jose.jwtVerify(jwtToken, secret);
                }
                catch (e) {
                    expect(e.message).to.be.equal('"nbf" claim timestamp check failed');
                }
            });
        });
    });


    // secret base64 encoded for HS algorithms
    Object.entries(HSAlgorithms).forEach(([key]) => {
        const secretKey = '1111111111111111111111111111111a',
            { alg } = HSAlgorithms[key];

        describe(`with secret as base64 for - ${alg} algorithm`, function () {
            // secret used without base64 encoding - abc
            const originalToken = HSBase64SecretEncodedToken[alg],
                base64EncodedSecret = Buffer.from(secretKey).toString('base64'),
                decodedSecret = Buffer.from(base64EncodedSecret, 'base64').toString('ascii');

            before(function (done) {
                const runOptions = {
                    collection: {
                        item: {
                            request: {
                                url: 'https://postman-echo.com/headers',
                                auth: {
                                    type: 'jwt',
                                    jwt: {
                                        algorithm: alg,
                                        header: { alg },
                                        payload: { a: '1' },
                                        secret: base64EncodedSecret,
                                        addTokenTo: HEADER,
                                        // denotes that secret must be decoded before signing
                                        isSecretBase64Encoded: true
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

            it('should add Authorization header with bearer as jwt token', async function () {
                const headers = [],
                    request = testrun.request.firstCall.args[3],
                    response = testrun.request.firstCall.args[2];

                let jwtToken;

                request.headers.members.forEach(function (header) {
                    if (header.key === 'Authorization') {
                        jwtToken = header.value.split('Bearer ')[1];
                    }
                    headers.push(header.key);
                });

                expect(response.json()).to.nested.include({
                    'headers.authorization': `Bearer ${jwtToken}`
                });

                expect(originalToken).to.be.equal(jwtToken);

                // eslint-disable-next-line one-var
                const secret = new TextEncoder().encode(decodedSecret);

                // eslint-disable-next-line one-var
                const { payload, protectedHeader } = await jose.jwtVerify(jwtToken, secret);

                expect(payload)
                    .to.be.deep.equal({ a: '1' });

                expect(protectedHeader)
                    .to.be.deep.equal({ alg });
            });
        });
    });

    // secret base64 not enabled for HS algorithms
    Object.entries(HSAlgorithms).forEach(([key]) => {
        const secretKey = '1111111111111111111111111111111a',
            { alg } = HSAlgorithms[key];

        describe(`with secret not base64 for - ${alg} algorithm`, function () {
            // secret used without base64 encoding - abc
            const originalToken = HSBase64SecretEncodedToken[alg];

            before(function (done) {
                const runOptions = {
                    collection: {
                        item: {
                            request: {
                                url: 'https://postman-echo.com/headers',
                                auth: {
                                    type: 'jwt',
                                    jwt: {
                                        algorithm: alg,
                                        header: { alg },
                                        payload: { a: '1' },
                                        secret: secretKey,
                                        privateKey: secretKey,
                                        addTokenTo: HEADER,
                                        isSecretBase64Encoded: false
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

            it('should add Authorization header with bearer as jwt token', async function () {
                const headers = [],
                    request = testrun.request.firstCall.args[3],
                    response = testrun.request.firstCall.args[2];

                let jwtToken;

                request.headers.members.forEach(function (header) {
                    if (header.key === 'Authorization') {
                        jwtToken = header.value.split('Bearer ')[1];
                    }
                    headers.push(header.key);
                });

                expect(response.json()).to.nested.include({
                    'headers.authorization': `Bearer ${jwtToken}`
                });

                expect(originalToken).to.be.equal(jwtToken);

                // eslint-disable-next-line one-var
                const secret = new TextEncoder().encode(secretKey);

                // eslint-disable-next-line one-var
                const { payload, protectedHeader } = await jose.jwtVerify(jwtToken, secret);

                expect(payload)
                    .to.be.deep.equal({ a: '1' });

                expect(protectedHeader)
                    .to.be.deep.equal({ alg });
            });
        });
    });
});
