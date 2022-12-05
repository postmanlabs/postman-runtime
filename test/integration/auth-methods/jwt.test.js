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
                                    header: [{ key: 'alg', value: 'HS256' }],
                                    payload: [{ key: 'test', value: '123' }],
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
                                    header: [],
                                    payload: [{ key: 'test', value: '123' }],
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
                                    header: [{ key: 'alg', value: 'HS256' }],
                                    payload: [{ key: 'test', value: '123' }],
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
                                    header: [{ key: 'typ', value: 'JWT' }],
                                    payload: [{ key: 'test', value: '123' }, { key: 'name', value: 'demo-name' }],
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
                .to.be.deep.equal({ test: '123', name: 'demo-name' });
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
                                    header: [{ key: 'typ', value: 'JWT' }],
                                    payload: [{ key: 'name', value: '{{name}}' }],
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
                                    header: [{ key: 'typ', value: 'JWT' }],
                                    payload: [{ key: 'test', value: '123' }, { key: 'name', value: 'demo-name' }],
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
});
