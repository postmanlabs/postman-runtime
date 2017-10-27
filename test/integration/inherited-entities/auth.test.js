var _ = require('lodash');

describe('Inherited Auth', function () {
    var testrun,
        runOptions = {
            collection: {
                item: {
                    name: 'BasicAuth Request',
                    request: {
                        url: 'https://postman-echo.com/basic-auth'
                    }
                }
            }
        };

    describe('in request level', function () {
        before(function (done) {
            var clonedRunOptions = _.merge({}, runOptions,
                {
                    collection: {
                        item: {
                            request: {
                                auth: {
                                    type: 'basic',
                                    basic: {
                                        username: '{{uname}}',
                                        password: '{{pass}}'
                                    }
                                }
                            }
                        }
                    },
                    environment: {
                        values: [{
                            key: 'uname',
                            value: 'postman'
                        }, {
                            key: 'pass',
                            value: 'password'
                        }]
                    }
                }
            );

            // perform the collection run
            this.run(clonedRunOptions, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        it('must have completed the run', function () {
            expect(testrun).be.ok();
            expect(testrun.done.callCount).to.be(1);
            testrun.done.getCall(0).args[0] && console.error(testrun.done.getCall(0).args[0].stack);
            expect(testrun.done.getCall(0).args[0]).to.be(null);
            expect(testrun.start.callCount).to.be(1);
        });

        it('must have sent the request once', function () {
            expect(testrun.request.callCount).to.be(1);

            var err = testrun.request.firstCall.args[0],
                request = testrun.request.firstCall.args[3],
                response = testrun.request.firstCall.args[2];

            expect(err).to.be(null);
            expect(request.url.toString()).to.be('https://postman-echo.com/basic-auth');
            expect(response.code).to.be(200);
        });
    });

    describe('in itemGroup level', function () {
        before(function (done) {
            var clonedRunOptions = _.merge({}, runOptions,
                {
                    collection: {
                        item: [{
                            name: 'F1',
                            auth: {
                                type: 'basic',
                                basic: {
                                    username: '{{uname}}',
                                    password: '{{pass}}'
                                }
                            },
                            item: {
                                name: 'BasicAuth Request',
                                request: {
                                    url: 'https://postman-echo.com/basic-auth'
                                }
                            }
                        }]
                    },
                    environment: {
                        values: [{
                            key: 'uname',
                            value: 'postman'
                        }, {
                            key: 'pass',
                            value: 'password'
                        }]
                    }
                }
            );

            // perform the collection run
            this.run(clonedRunOptions, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        it('must have completed the run', function () {
            expect(testrun).be.ok();
            expect(testrun.done.callCount).to.be(1);
            testrun.done.getCall(0).args[0] && console.error(testrun.done.getCall(0).args[0].stack);
            expect(testrun.done.getCall(0).args[0]).to.be(null);
            expect(testrun.start.callCount).to.be(1);
        });

        it('must have sent the request once', function () {
            expect(testrun.request.callCount).to.be(1);

            var err = testrun.request.firstCall.args[0],
                request = testrun.request.firstCall.args[3],
                response = testrun.request.firstCall.args[2];

            expect(err).to.be(null);
            expect(request.url.toString()).to.be('https://postman-echo.com/basic-auth');
            expect(response.code).to.be(200);
        });
    });

    describe('in collection level', function () {
        before(function (done) {
            var clonedRunOptions = _.merge({}, runOptions,
                {
                    collection: {
                        auth: {
                            type: 'basic',
                            basic: {
                                username: '{{uname}}',
                                password: '{{pass}}'
                            }
                        }
                    },
                    environment: {
                        values: [{
                            key: 'uname',
                            value: 'postman'
                        }, {
                            key: 'pass',
                            value: 'password'
                        }]
                    }
                }
            );

            // perform the collection run
            this.run(clonedRunOptions, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        it('must have completed the run', function () {
            expect(testrun).be.ok();
            expect(testrun.done.callCount).to.be(1);
            testrun.done.getCall(0).args[0] && console.error(testrun.done.getCall(0).args[0].stack);
            expect(testrun.done.getCall(0).args[0]).to.be(null);
            expect(testrun.start.callCount).to.be(1);
        });

        it('must have sent the request once', function () {
            expect(testrun.request.callCount).to.be(1);

            var err = testrun.request.firstCall.args[0],
                request = testrun.request.firstCall.args[3],
                response = testrun.request.firstCall.args[2];

            expect(err).to.be(null);
            expect(request.url.toString()).to.be('https://postman-echo.com/basic-auth');
            expect(response.code).to.be(200);
        });
    });

    describe('in collection and request level', function () {
        before(function (done) {
            var clonedRunOptions = _.merge({}, runOptions,
                {
                    collection: {
                        item: {
                            request: {
                                auth: {
                                    type: 'basic',
                                    basic: {
                                        username: '{{uname}}',
                                        password: '{{pass}}'
                                    }
                                }
                            }
                        },
                        auth: {
                            type: 'basic',
                            basic: {
                                username: 'iamnotpostman',
                                password: 'password'
                            }
                        }
                    },
                    environment: {
                        values: [{
                            key: 'uname',
                            value: 'postman'
                        }, {
                            key: 'pass',
                            value: 'password'
                        }]
                    }
                }
            );

            // perform the collection run
            this.run(clonedRunOptions, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        it('must have completed the run', function () {
            expect(testrun).be.ok();
            expect(testrun.done.callCount).to.be(1);
            testrun.done.getCall(0).args[0] && console.error(testrun.done.getCall(0).args[0].stack);
            expect(testrun.done.getCall(0).args[0]).to.be(null);
            expect(testrun.start.callCount).to.be(1);
        });

        it('must have sent the request once', function () {
            expect(testrun.request.callCount).to.be(1);

            var err = testrun.request.firstCall.args[0],
                request = testrun.request.firstCall.args[3],
                response = testrun.request.firstCall.args[2];

            expect(err).to.be(null);
            expect(request.url.toString()).to.be('https://postman-echo.com/basic-auth');
            expect(response.code).to.be(200);
        });
    });
});
