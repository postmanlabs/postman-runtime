const expect = require('chai').expect,
    AUTHORIZATION_HEADER = 'authorizationHeader';

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
                },
                environment: {
                    values: [
                        {
                            key: 'token',
                            value: 'ABC123'
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
            expect(headers).to.not.have.members(['Authorization']);
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
                },
                environment: {
                    values: [
                        {
                            key: 'token',
                            value: 'ABC123'
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
            expect(headers).to.not.have.members(['Authorization']);
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
                },
                environment: {
                    values: [
                        {
                            key: 'token',
                            value: 'ABC123'
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
            const members = [],
                request = testrun.request.firstCall.args[3];

            request.headers.members.forEach(function (header) {
                members.push(header.key);
            });
            expect(members).to.not.have.members(['Authorization']);
        });
    });
});
