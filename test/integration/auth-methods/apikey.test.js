var expect = require('chai').expect,
    Header = require('postman-collection').Header,
    QueryParam = require('postman-collection').QueryParam;

describe('apikey auth', function () {
    var testrun;

    describe('with (in="header")', function () {
        before(function (done) {
            var runOptions = {
                collection: {
                    item: {
                        request: {
                            url: 'https://postman-echo.com/headers',
                            auth: {
                                type: 'apikey',
                                apikey: {
                                    key: 'my-api-header',
                                    value: '{{token}}',
                                    in: 'header'
                                }
                            }
                        }
                    }
                },
                environment: {
                    values: [{
                        key: 'token',
                        value: 'ABC123'
                    }]
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

        it('should add auth header correctly', function () {
            var request = testrun.request.firstCall.args[3],
                response = testrun.request.firstCall.args[2];

            expect(request.headers.members).to.include.deep.members([
                new Header({key: 'my-api-header', value: 'ABC123', system: true})
            ]);

            expect(response.json()).to.nested.include({
                'headers.my-api-header': 'ABC123'
            });
        });
    });

    describe('with (in="query")', function () {
        before(function (done) {
            var runOptions = {
                collection: {
                    item: {
                        request: {
                            url: 'https://postman-echo.com/get',
                            auth: {
                                type: 'apikey',
                                apikey: {
                                    key: 'my-api-param',
                                    value: 'ABC123',
                                    in: 'query'
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

        it('should add auth query param correctly', function () {
            var request = testrun.request.firstCall.args[3],
                response = testrun.request.firstCall.args[2];

            expect(request.url.query.members).to.include.deep.members([
                new QueryParam({key: 'my-api-param', value: 'ABC123', system: true})
            ]);

            expect(response.json()).to.nested.include({
                'args.my-api-param': 'ABC123'
            });
        });
    });

    describe('with (in="surprise")', function () {
        before(function (done) {
            var runOptions = {
                collection: {
                    item: {
                        request: {
                            url: 'https://postman-echo.com/get',
                            auth: {
                                type: 'apikey',
                                apikey: {
                                    key: 'Authorization',
                                    value: 'ABC123',
                                    in: 'surprise'
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

        it('should add auth header correctly', function () {
            var request = testrun.request.firstCall.args[3],
                response = testrun.request.firstCall.args[2];

            expect(request.headers.members).to.include.deep.members([
                new Header({key: 'Authorization', value: 'ABC123', system: true})
            ]);

            expect(response.json()).to.nested.include({
                'headers.authorization': 'ABC123'
            });
        });
    });

    describe('without (in) [DEFAULT=header]', function () {
        before(function (done) {
            var runOptions = {
                collection: {
                    item: {
                        request: {
                            url: 'https://postman-echo.com/get',
                            auth: {
                                type: 'apikey',
                                apikey: {
                                    key: 'x-api-key',
                                    value: 'ABC123'
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

        it('should add auth header correctly', function () {
            var request = testrun.request.firstCall.args[3],
                response = testrun.request.firstCall.args[2];

            expect(request.headers.members).to.include.deep.members([
                new Header({key: 'x-api-key', value: 'ABC123', system: true})
            ]);

            expect(response.json()).to.nested.include({
                'headers.x-api-key': 'ABC123'
            });
        });
    });

    describe('without (value)', function () {
        before(function (done) {
            var runOptions = {
                collection: {
                    item: {
                        request: {
                            url: 'https://postman-echo.com/get',
                            auth: {
                                type: 'apikey',
                                apikey: {
                                    key: 'Authorization',
                                    in: 'header'
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

        it('should add auth header correctly', function () {
            var request = testrun.request.firstCall.args[3],
                response = testrun.request.firstCall.args[2];

            expect(request.headers.members).to.include.deep.members([
                new Header({key: 'Authorization', value: '', system: true})
            ]);

            expect(response.json()).to.nested.include({
                'headers.authorization': ''
            });
        });
    });

    describe('without (key)', function () {
        var TOKEN = 'FAIL_WHEN_EMPTY_HEADER_IS_SUPPORTED';

        before(function (done) {
            var runOptions = {
                collection: {
                    item: {
                        request: {
                            url: 'https://postman-echo.com/get',
                            auth: {
                                type: 'apikey',
                                apikey: {
                                    value: TOKEN,
                                    in: 'header'
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

        it('should not add auth header', function () {
            var request = testrun.request.firstCall.args[3],
                response = testrun.request.firstCall.args[2];

            expect(request.headers.members).to.include.deep.members([
                new Header({key: '', value: TOKEN, system: true})
            ]);

            // @note header's without key are not supported
            expect(response.stream.toString()).to.not.include(TOKEN);
        });
    });
});
