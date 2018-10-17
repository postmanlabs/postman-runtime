var _ = require('lodash'),
    expect = require('chai').expect;

describe('Inherited Auth', function () {
    var testrun,
        runOptions = {
            collection: {
                item: {
                    name: 'BasicAuth Request',
                    request: {
                        url: 'https://postman-echo.com/digest-auth'
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
                                    type: 'digest',
                                    digest: {
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

        it('should have completed the run', function () {
            expect(testrun).to.be.ok;
            expect(testrun).to.nested.include({
                'done.callCount': 1
            });
            testrun.done.getCall(0).args[0] && console.error(testrun.done.getCall(0).args[0].stack);
            expect(testrun.done.getCall(0).args[0]).to.be.null;
            expect(testrun).to.nested.include({
                'start.callCount': 1
            });
        });

        it('should have sent the request twice', function () {
            expect(testrun).to.nested.include({
                'request.callCount': 2
            });

            var err = testrun.request.firstCall.args[0],
                request = testrun.request.firstCall.args[3],
                response1 = testrun.request.firstCall.args[2],
                response2 = testrun.request.secondCall.args[2];

            expect(err).to.be.null;
            expect(request.url.toString()).to.equal('https://postman-echo.com/digest-auth');
            expect(response1).to.have.property('code', 401);
            expect(response2).to.have.property('code', 200);
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
                                type: 'digest',
                                digest: {
                                    username: '{{uname}}',
                                    password: '{{pass}}'
                                }
                            },
                            item: [{
                                name: 'digestAuth Request 1',
                                request: {
                                    url: 'https://postman-echo.com/digest-auth'
                                }
                            }, {
                                name: 'digestAuth Request 2',
                                request: {
                                    url: 'https://postman-echo.com/digest-auth'
                                }
                            }]
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

        it('should have completed the run', function () {
            expect(testrun).to.be.ok;
            expect(testrun).to.nested.include({
                'done.callCount': 1
            });
            testrun.done.getCall(0).args[0] && console.error(testrun.done.getCall(0).args[0].stack);
            expect(testrun.done.getCall(0).args[0]).to.be.null;
            expect(testrun).to.nested.include({
                'start.callCount': 1
            });
        });

        it('should have inherited auth for both requests', function () {
            // the second req should reuse the nonce and realm from the 1st req's response
            expect(testrun).to.nested.include({
                'request.callCount': 3
            });

            var err1 = testrun.request.firstCall.args[0],
                request1 = testrun.request.firstCall.args[3],
                response1 = testrun.request.firstCall.args[2],
                response2 = testrun.request.secondCall.args[2],
                err2 = testrun.request.secondCall.args[0],
                request2 = testrun.request.secondCall.args[3],
                response3 = testrun.request.thirdCall.args[2];

            expect(err1).to.be.null;
            expect(request1.url.toString()).to.equal('https://postman-echo.com/digest-auth');
            expect(response1).to.have.property('code', 401);
            expect(response2).to.have.property('code', 200);

            expect(err2).to.be.null;
            expect(request2.url.toString()).to.equal('https://postman-echo.com/digest-auth');
            expect(response3).to.have.property('code', 200);
        });
    });

    describe('in collection level', function () {
        before(function (done) {
            var clonedRunOptions = _.merge({}, runOptions,
                {
                    collection: {
                        auth: {
                            type: 'digest',
                            digest: {
                                username: '{{uname}}',
                                password: '{{pass}}'
                            }
                        },
                        item: [{
                            name: 'F1',
                            item: [{
                                name: 'DigestAuth Request 1',
                                request: {
                                    url: 'https://postman-echo.com/digest-auth'
                                }
                            }, {
                                name: 'DigestAuth Request 2',
                                request: {
                                    url: 'https://postman-echo.com/digest-auth'
                                }
                            }]
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

        it('should have completed the run', function () {
            expect(testrun).to.be.ok;
            expect(testrun).to.nested.include({
                'done.callCount': 1
            });
            testrun.done.getCall(0).args[0] && console.error(testrun.done.getCall(0).args[0].stack);
            expect(testrun.done.getCall(0).args[0]).to.be.null;
            expect(testrun).to.nested.include({
                'start.callCount': 1
            });
        });

        it('should inherited auth for both requests', function () {
            // the second req should reuse the nonce and realm from the 1st req's response
            expect(testrun).to.nested.include({
                'request.callCount': 3
            });

            var err1 = testrun.request.firstCall.args[0],
                err2 = testrun.request.secondCall.args[0],
                request1 = testrun.request.firstCall.args[3],
                request2 = testrun.request.secondCall.args[3],
                response1 = testrun.request.firstCall.args[2],
                response2 = testrun.request.secondCall.args[2],
                response3 = testrun.request.thirdCall.args[2];

            expect(err1).to.be.null;
            expect(err2).to.be.null;
            expect(request1.url.toString()).to.equal('https://postman-echo.com/digest-auth');
            expect(request2.url.toString()).to.equal('https://postman-echo.com/digest-auth');
            expect(response1).to.have.property('code', 401);
            expect(response2).to.have.property('code', 200);
            expect(response3).to.have.property('code', 200);
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
                                    type: 'digest',
                                    digest: {
                                        username: '{{uname}}',
                                        password: '{{pass}}'
                                    }
                                }
                            }
                        },
                        auth: {
                            type: 'digest',
                            digest: {
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

        it('should have completed the run', function () {
            expect(testrun).to.be.ok;
            expect(testrun).to.nested.include({
                'done.callCount': 1
            });
            testrun.done.getCall(0).args[0] && console.error(testrun.done.getCall(0).args[0].stack);
            expect(testrun.done.getCall(0).args[0]).to.be.null;
            expect(testrun).to.nested.include({
                'start.callCount': 1
            });
        });

        it('should have sent the request twice', function () {
            expect(testrun).to.nested.include({
                'request.callCount': 2
            });

            var err = testrun.request.firstCall.args[0],
                request = testrun.request.firstCall.args[3],
                response1 = testrun.request.firstCall.args[2],
                response2 = testrun.request.secondCall.args[2];

            expect(err).to.be.null;
            expect(request.url.toString()).to.equal('https://postman-echo.com/digest-auth');
            expect(response1).to.have.property('code', 401);
            expect(response2).to.have.property('code', 200);
        });
    });
});
