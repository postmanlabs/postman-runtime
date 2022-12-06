const expect = require('chai').expect,
    jwt = require('jsonwebtoken'),
    Header = require('postman-collection').Header,
    QueryParam = require('postman-collection').QueryParam,
    AUTHORIZATION_HEADER = 'authorizationHeader',
    QUERY_PARAM = 'queryParam';

describe('jwt auth', function () {
    let testrun;

    describe('with invalid algorithm', function () {
        before(function (done) {
            const runOptions = {
                collection: {
                    item: {
                        request: {
                            url: 'https://postman-echo.com/headers',
                            auth: {
                                type: 'jwt',
                                jwt: {
                                    algorithm: '',
                                    header: { alg: 'HS256' },
                                    payload: { test: 123 },
                                    secretOrPrivateKey: '123',
                                    tokenAddTo: AUTHORIZATION_HEADER
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

        it('should completed the run', function () {
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

    describe('with invalid header', function () {
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
                                    header: null,
                                    payload: { test: 123 },
                                    secretOrPrivateKey: '123',
                                    tokenAddTo: AUTHORIZATION_HEADER
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

        it('should completed the run', function () {
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

    describe('with invalid secret', function () {
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
                                    header: { alg: 'HS256' },
                                    payload: { test: 123 },
                                    secretOrPrivateKey: null,
                                    tokenAddTo: AUTHORIZATION_HEADER
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

        it('should completed the run', function () {
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

    // TODO: jwt header test for different algorithms

    describe('Should not add token to Authorization header when payload is null', function () {
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
                                    header: { typ: 'JWT' },
                                    payload: null,
                                    secretOrPrivateKey: '{{secretOrPrivateKey}}',
                                    tokenAddTo: AUTHORIZATION_HEADER
                                }
                            }
                        }
                    }
                },
                environment: {
                    values: [
                        {
                            key: 'secretOrPrivateKey',
                            value: 'cdVGscbTozmMseA6c7YfhimIF8seD02mN0g4x'
                        }
                    ]
                }
            };

            this.run(runOptions, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        it('should completed the run', function () {
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

    describe('Should not add token to Authorization header when payload is undefined', function () {
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
                                    header: { typ: 'JWT' },
                                    payload: undefined,
                                    secretOrPrivateKey: '{{secretOrPrivateKey}}',
                                    tokenAddTo: AUTHORIZATION_HEADER
                                }
                            }
                        }
                    }
                },
                environment: {
                    values: [
                        {
                            key: 'secretOrPrivateKey',
                            value: 'cdVGscbTozmMseA6c7YfhimIF8seD02mN0g4x'
                        }
                    ]
                }
            };

            this.run(runOptions, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        it('should completed the run', function () {
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

    describe('with valid payload for HS256 algorithm and token add to Authorization header', function () {
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
                                    header: { typ: 'JWT' },
                                    payload: { test: 123, name: 'demo-name' },
                                    secretOrPrivateKey: '{{secretOrPrivateKey}}',
                                    tokenAddTo: AUTHORIZATION_HEADER
                                }
                            }
                        }
                    }
                },
                environment: {
                    values: [
                        {
                            key: 'secretOrPrivateKey',
                            value: 'cdVGscbTozmMseA6c7YfhimIF8seD02mN0g4x'
                        }
                    ]
                }
            };

            this.run(runOptions, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        it('should completed the run', function () {
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

            expect(request.headers.members).to.include.deep.members([
                new Header({ key: 'Authorization', value: `Bearer ${jwtToken}`, system: true })
            ]);

            expect(response.json()).to.nested.include({
                'headers.authorization': `Bearer ${jwtToken}`
            });

            expect(jwt.verify(jwtToken, 'cdVGscbTozmMseA6c7YfhimIF8seD02mN0g4x'))
                .to.be.deep.equal({ test: 123, name: 'demo-name' });
            expect(jwt.decode(jwtToken, { complete: true }).header)
                .to.be.deep.equal({ alg: 'HS256', typ: 'JWT' });
        });
    });

    describe('with valid payload for HS384 algorithm and token add to url query param', function () {
        before(function (done) {
            const runOptions = {
                collection: {
                    item: {
                        request: {
                            url: 'https://postman-echo.com/get',
                            auth: {
                                type: 'jwt',
                                jwt: {
                                    algorithm: 'HS384',
                                    header: { typ: 'JWT' },
                                    payload: { name: '{{name}}' },
                                    secretOrPrivateKey: '{{secretOrPrivateKey}}',
                                    tokenAddTo: QUERY_PARAM,
                                    queryParamKey: 'jwt'
                                }
                            }
                        }
                    }
                },
                environment: {
                    values: [
                        {
                            key: 'name',
                            value: 'test-name'
                        },
                        {
                            key: 'secretOrPrivateKey',
                            value: 'cdVGscbTozmMseA6c7YfhimIF8seD02mN0g4x1234567891'
                        }
                    ]
                }
            };

            this.run(runOptions, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        it('should completed the run', function () {
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

            expect(request.url.query.members).to.include.deep.members([
                new QueryParam({ key: 'jwt', value: jwtToken })
            ]);

            expect(jwt.verify(jwtToken, 'cdVGscbTozmMseA6c7YfhimIF8seD02mN0g4x1234567891'))
                .to.be.deep.equal({ name: 'test-name' });
            expect(jwt.decode(jwtToken, { complete: true }).header)
                .to.be.deep.equal({ alg: 'HS384', typ: 'JWT' });

            expect(response.json()).to.nested.include({
                'args.jwt': jwtToken
            });
        });
    });

    describe('with valid payload for HS512 algorithm and token add to Authorization header', function () {
        const secretKey = 'cdVGscbTozmMseA6c7YfhimIF8seD02mN0g4x1212121232323434242352352345252245245245245241212s';

        before(function (done) {
            const runOptions = {
                collection: {
                    item: {
                        request: {
                            url: 'https://postman-echo.com/headers',
                            auth: {
                                type: 'jwt',
                                jwt: {
                                    algorithm: 'HS512',
                                    header: { typ: 'JWT' },
                                    payload: { test: '123', name: 'demo-name' },
                                    secretOrPrivateKey: '{{secretOrPrivateKey}}',
                                    tokenAddTo: AUTHORIZATION_HEADER
                                }
                            }
                        }
                    }
                },
                environment: {
                    values: [
                        {
                            key: 'secretOrPrivateKey',
                            value: secretKey
                        }
                    ]
                }
            };

            this.run(runOptions, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        it('should completed the run', function () {
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

            expect(request.headers.members).to.include.deep.members([
                new Header({ key: 'Authorization', value: `Bearer ${jwtToken}`, system: true })
            ]);

            expect(response.json()).to.nested.include({
                'headers.authorization': `Bearer ${jwtToken}`
            });

            expect(jwt.verify(jwtToken, secretKey))
                .to.be.deep.equal({ test: '123', name: 'demo-name' });
            expect(jwt.decode(jwtToken, { complete: true }).header)
                .to.be.deep.equal({ alg: 'HS512', typ: 'JWT' });
        });
    });

    describe('should generate valid jwt token for registered claim payload', function () {
        const secretKey = 'cdVGscbTozmMseA6c7YfhimIF8seD02mN0g4x1212121232323434242352352345252245245245245241212s',
            issuedAt = Math.floor(Date.now() / 1000),
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
                                    algorithm: 'HS512',
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
                                    secretOrPrivateKey: '{{secretOrPrivateKey}}',
                                    tokenAddTo: QUERY_PARAM,
                                    queryParamKey: 'jwt'
                                }
                            }
                        }
                    }
                },
                environment: {
                    values: [
                        {
                            key: 'secretOrPrivateKey',
                            value: secretKey
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

        it('should completed the run', function () {
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

            expect(request.url.query.members).to.include.deep.members([
                new QueryParam({ key: 'jwt', value: jwtToken })
            ]);

            expect(jwt.decode(jwtToken, { complete: true }).header)
                .to.be.deep.equal({ alg: 'HS512', typ: 'JWT' });

            expect(response.json()).to.nested.include({
                'args.jwt': jwtToken
            });

            expect(jwt.verify(jwtToken, secretKey))
                .to.be.deep.equal({
                    aud: 'lasEkslasjnn2324nxskskosdk',
                    exp: expiresIn,
                    iat: `${issuedAt}`, // TODO: check the resolved variable should be string
                    iss: 'https://dev-0yc9dnt0.us.auth0.com/',
                    jti: 'sjh3h46bsdh37ybasjha237612723',
                    nbf: notBefore,
                    sub: 'auth0|6062e94f20d55800692b4dad'
                });
        });
    });

    describe('should generate token for private and public claim payload', function () {
        const secretKey = 'cdVGscbTozmMseA6c7YfhimIF8seD02mN0g4x1212121232323434242352352345252245245245245241212s';

        before(function (done) {
            const runOptions = {
                collection: {
                    item: {
                        request: {
                            url: 'https://postman-echo.com/get',
                            auth: {
                                type: 'jwt',
                                jwt: {
                                    algorithm: 'HS512',
                                    header: { typ: 'JWT' },
                                    payload: {
                                        customField: 'test', // private claim
                                        isAdmin: true, // private claim
                                        email: 'test@gmail.com', // public claim openId
                                        sid: 12345 // public claim IESG
                                    },
                                    secretOrPrivateKey: '{{secretOrPrivateKey}}',
                                    tokenAddTo: QUERY_PARAM,
                                    queryParamKey: 'jwtToken'
                                }
                            }
                        }
                    }
                },
                environment: {
                    values: [
                        {
                            key: 'secretOrPrivateKey',
                            value: secretKey
                        }
                    ]
                }
            };

            this.run(runOptions, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        it('should completed the run', function () {
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

            expect(request.url.query.members).to.include.deep.members([
                new QueryParam({ key: 'jwtToken', value: jwtToken })
            ]);

            expect(jwt.decode(jwtToken, { complete: true }).header)
                .to.be.deep.equal({ alg: 'HS512', typ: 'JWT' });

            expect(response.json()).to.nested.include({
                'args.jwtToken': jwtToken
            });

            expect(jwt.verify(jwtToken, secretKey))
                .to.be.deep.equal({
                    customField: 'test', // private claim
                    isAdmin: true, // private claim
                    email: 'test@gmail.com', // public claim openId
                    sid: 12345 // public claim IESG
                });
        });
    });

    describe('should not verify jwt token when nbf is greater than iat', function () {
        const secretKey = 'cdVGscbTozmMseA6c7YfhimIF8seD02mN0g4x1212121232323434242352352345252245245245245241212s',
            issuedAt = Math.floor(Date.now() / 1000),
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
                                    algorithm: 'HS256',
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
                                    secretOrPrivateKey: '{{secretOrPrivateKey}}',
                                    tokenAddTo: AUTHORIZATION_HEADER
                                }
                            }
                        }
                    }
                },
                environment: {
                    values: [
                        {
                            key: 'secretOrPrivateKey',
                            value: secretKey
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

        it('should completed the run', function () {
            expect(testrun).to.be.ok;
            expect(testrun).to.nested.include({
                'done.calledOnce': true,
                'start.calledOnce': true,
                'request.calledOnce': true
            });
        });

        it('should not add verify token since nbf is greater than iat', function () {
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

            expect(request.headers.members).to.include.deep.members([
                new Header({ key: 'Authorization', value: `Bearer ${jwtToken}`, system: true })
            ]);

            expect(response.json()).to.nested.include({
                'headers.authorization': `Bearer ${jwtToken}`
            });

            try {
                jwt.verify(jwtToken, secretKey)
                    .to.be.deep.equal({ test: '123', name: 'demo-name' });
            }
            catch (e) {
                expect(e.message).to.be.equal('jwt not active');
            }
        });
    });
});
