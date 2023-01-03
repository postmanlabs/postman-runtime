const expect = require('chai').expect,
    fs = require('fs'),
    path = require('path'),
    jwt = require('jsonwebtoken'),
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
    privatekeyRSAWithPassphrase = getKey('../../fixtures/jwt-keys/rsa-passphrase.private.pem'),
    publicKeyRSAWithPassphrase = getKey('../../fixtures/jwt-keys/rsa-passphrase.public.pem'),
    // ES - ECDSA
    privateKeyECDSA = getKey('../../fixtures/jwt-keys/ecdsa.private.pem'),
    publicKeyECDSA = getKey('../../fixtures/jwt-keys/ecdsa.public.pem'),
    privateKeyECDSAWithPassphrase = getKey('../../fixtures/jwt-keys/ecdsa-passphrase.private.pem'),
    publicKeyECDSAWithPassphrase = getKey('../../fixtures/jwt-keys/ecdsa-passphrase.public.pem'),

    // algorithms
    // HS algorithms
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

    // RS Algorithms with passphrase
    RSAlgorithmsWithPassPhrase = {
        RS256: {
            alg: 'RS256',
            signKey: privatekeyRSAWithPassphrase,
            publicKey: publicKeyRSAWithPassphrase,
            passphrase: 'test1234key'
        },
        RS384: {
            alg: 'RS384',
            signKey: privatekeyRSAWithPassphrase,
            publicKey: publicKeyRSAWithPassphrase,
            passphrase: 'test1234key'
        },
        RS512: {
            alg: 'RS512',
            signKey: privatekeyRSAWithPassphrase,
            publicKey: publicKeyRSAWithPassphrase,
            passphrase: 'test1234key'
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
            signKey: privateKeyECDSA,
            publicKey: publicKeyECDSA
        },
        ES384: {
            alg: 'ES384',
            signKey: privateKeyECDSA,
            publicKey: publicKeyECDSA
        },
        ES512: {
            alg: 'ES512',
            signKey: privateKeyECDSA,
            publicKey: publicKeyECDSA
        }
    },

    // ES Algorithms with passphrase
    ESAlgorithmsWithPassPhrase = {
        ES256: {
            alg: 'ES256',
            signKey: privateKeyECDSAWithPassphrase,
            publicKey: publicKeyECDSAWithPassphrase,
            passphrase: '12345678'
        },
        ES384: {
            alg: 'ES384',
            signKey: privateKeyECDSAWithPassphrase,
            publicKey: publicKeyECDSAWithPassphrase,
            passphrase: '12345678'
        },
        ES512: {
            alg: 'ES512',
            signKey: privateKeyECDSAWithPassphrase,
            publicKey: publicKeyECDSAWithPassphrase,
            passphrase: '12345678'
        }
    },

    // all Algorithms
    algorithmsSupported = {
        ...HSAlgorithms,
        ...RSAlgorithms,
        ...PSAlgorithms,
        ...ESAlgorithms
    },

    // algorithms with passphrase
    algorithmsWithPassphrase = {
        ...RSAlgorithmsWithPassPhrase,
        ...ESAlgorithmsWithPassPhrase
        // verify whether RSASSA-PSS (PS) algorithm is applicable
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

    // with invalid signature
    algorithms.forEach(([key]) => {
        const { alg, signKey, publicKey } = algorithmsSupported[key];

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

            it('should throw invalid signature error', function () {
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
                    jwt.verify(jwtToken, publicKey ? invalidPublicKeyRSA : '123', { algorithms: [alg] })
                        .to.be.deep.equal({});
                }
                catch (e) {
                    expect(e.message).to.be.equal('invalid signature');
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
                                            typ: 'JWS',
                                            cty: 'JWT',
                                            crit: ['JWS'],
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

            it('should add Authorization header', function () {
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

                expect(jwt.verify(jwtToken, publicKey || signKey, { algorithms: [alg] }))
                    .to.be.deep.equal({ test: 123 });

                expect(jwt.decode(jwtToken, { complete: true }).header)
                    .to.be.deep.equal({
                        alg: alg,
                        typ: 'JWS',
                        kid: '12345',
                        cty: 'JWT',
                        crit: ['JWS'],
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
                                        header: '{\n "typ": "JWS",\n "jku": "{{jku}}",\n "test12": "demo"}',
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

            it('should add Authorization header', function () {
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

                expect(jwt.verify(jwtToken, publicKey || signKey, { algorithms: [alg] }))
                    .to.be.deep.equal({ test: 'abc-123' });

                expect(jwt.decode(jwtToken, { complete: true }).header)
                    .to.be.deep.equal({
                        alg: alg,
                        typ: 'JWS',
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

        it('should add Authorization header with jwt token for HS256 algorithm', function () {
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

            expect(jwt.verify(jwtToken, '123'))
                .to.be.deep.equal({ test: 'test-123' });

            expect(jwt.decode(jwtToken, { complete: true }).header)
                .to.be.deep.equal({ alg: 'HS256', typ: 'JWT' });
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

            it('should add Authorization header with bearer as jwt token', function () {
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

                expect(jwt.verify(jwtToken, publicKey || signKey, { algorithms: [alg] }))
                    .to.be.deep.equal({ test: 123, name: 'demo-name' });

                expect(jwt.decode(jwtToken, { complete: true }).header)
                    .to.be.deep.equal({ alg: alg, typ: 'JWT' });
            });
        });
    });

    // with valid payload and add to Authorization as user prefix
    algorithms.forEach(([key]) => {
        const { alg, signKey, publicKey } = algorithmsSupported[key];

        describe(`with valid payload for ${alg} algorithm and custom token prefixs`, function () {
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

            it('should add Authorization header with bearer as jwt token', function () {
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

                expect(jwt.verify(jwtToken, publicKey || signKey, { algorithms: [alg] }))
                    .to.be.deep.equal({ test: 123, name: 'demo-name' });

                expect(jwt.decode(jwtToken, { complete: true }).header)
                    .to.be.deep.equal({ alg: alg, typ: 'JWT' });
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

            it('should add Authorization header with bearer as jwt token', function () {
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

                expect(jwt.verify(jwtToken, publicKey || signKey, { algorithms: [alg] }))
                    .to.be.deep.equal({ uno: 1, dos: 2 });
                expect(jwt.decode(jwtToken, { complete: true }).header)
                    .to.be.deep.equal({ alg: alg, typ: 'JWT' });
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

            it('should add Authorization header with bearer as jwt token', function () {
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

                expect(jwt.verify(jwtToken, publicKey || signKey, { algorithms: [alg] }))
                    .to.be.deep.equal({ uno: 1, dos: 2, number: 12345 });
                expect(jwt.decode(jwtToken, { complete: true }).header)
                    .to.be.deep.equal({ alg: alg, typ: 'JWT' });
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
                                            iat: '{{issuedAt}}',
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

            it('should generate a valid jwt token & add to query param', function () {
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

                expect(jwt.decode(jwtToken, { complete: true }).header)
                    .to.be.deep.equal({ alg: alg, typ: 'JWT' });

                expect(response.json()).to.nested.include({
                    'args.jwt': jwtToken
                });

                expect(jwt.verify(jwtToken, publicKey || signKey, { algorithms: [alg] }))
                    .to.be.deep.equal({
                        aud: 'lasEkslasjnn2324nxskskosdk',
                        exp: expiresIn,
                        iat: `${issuedAt}`,
                        iss: 'https://dev-0yc9dnt0.us.auth0.com/',
                        jti: 'sjh3h46bsdh37ybasjha237612723',
                        nbf: notBefore,
                        sub: 'auth0|6062e94f20d55800692b4dad'
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

            it('should generate a valid jwt token & add to query param correctly', function () {
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

                expect(jwt.decode(jwtToken, { complete: true }).header)
                    .to.be.deep.equal({ alg: alg, typ: 'JWT' });

                expect(response.json()).to.nested.include({
                    'args.jwtToken': jwtToken
                });

                expect(jwt.verify(jwtToken, publicKey || signKey, { algorithms: [alg] }))
                    .to.be.deep.equal({
                        customField: 'test', // private claim
                        isAdmin: true, // private claim
                        email: 'test@gmail.com', // public claim openId
                        sid: 12345 // public claim IESG
                    });
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

            it('should generate a valid jwt token & add to query param correctly', function () {
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

                expect(jwt.decode(jwtToken, { complete: true }).header)
                    .to.be.deep.equal({ alg: alg, typ: 'JWT' });

                expect(response.json()).to.nested.include({
                    'args.jwt': jwtToken
                });

                expect(jwt.verify(jwtToken, publicKey || signKey), { algorithms: [alg] })
                    .to.be.deep.equal({
                        iat: issuedAt
                    });
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

            it('should not verify token when nbf is greater than iat', function () {
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
                    jwt.verify(jwtToken, publicKey || signKey, { algorithms: [alg] })
                        .to.be.deep.equal({ test: '123', name: 'demo-name' });
                }
                catch (e) {
                    expect(e.message).to.be.equal('jwt not active');
                }
            });
        });
    });

    // passphrase check for RS, ES algorithms
    Object.entries(algorithmsWithPassphrase).forEach(([key]) => {
        const { alg, signKey, publicKey, passphrase } = algorithmsWithPassphrase[key];

        describe(`with passphrase for private key - ${alg} algorithm`, function () {
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
                                        passphrase: passphrase
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

            it('should add Authorization header with bearer as jwt token', function () {
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

                expect(jwt.verify(jwtToken, publicKey || signKey, { algorithms: [alg] }))
                    .to.be.deep.equal({ test: 123, name: 'demo-name' });

                expect(jwt.decode(jwtToken, { complete: true }).header)
                    .to.be.deep.equal({ alg: alg, typ: 'JWT' });
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

            it('should add Authorization header with bearer as jwt token', function () {
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

                expect(jwt.verify(jwtToken, decodedSecret))
                    .to.be.deep.equal({ a: '1' });

                expect(jwt.decode(jwtToken, { complete: true }).header)
                    .to.be.deep.equal({ alg });

                expect(originalToken).to.be.equal(jwtToken);
            });
        });
    });

    // // secret base64 not enabled for HS algorithms
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

            it('should add Authorization header with bearer as jwt token', function () {
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

                expect(jwt.verify(jwtToken, secretKey))
                    .to.be.deep.equal({ a: '1' });

                expect(jwt.decode(jwtToken, { complete: true }).header)
                    .to.be.deep.equal({ alg });

                expect(originalToken).to.be.equal(jwtToken);
            });
        });
    });
});
