var expect = require('expect.js');

describe('digest auth', function () {
    var testrun;

    // @todo
    // 1. add a test case with (qop=""). For this we need a Digest server which does not return qop value
    //        echo, httpbin and windows server, all return the value of qop
    // 2. add a test case with (qop="auth-int" and algorithm="MD5-sess")
    //        httpbin has auth-int but no support for MD5-sess
    // 3. add a test case with (qop="auth-int" and with body defined (method != "GET"))
    //        httbin does not support methods other than "GET"

    describe('with correct details (qop="auth", algorithm="MD5")', function () {
        before(function (done) {
            var runOptions = {
                collection: {
                    item: {
                        name: 'DigestAuth',
                        request: {
                            url: 'https://postman-echo.com/digest-auth',
                            auth: {
                                type: 'digest',
                                digest: {
                                    algorithm: 'MD5',
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
            };

            // perform the collection run
            this.run(runOptions, function (err, results) {
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

        it('must have sent two requests internally', function () {
            expect(testrun.io.callCount).to.be(2);
            expect(testrun.request.callCount).to.be(2);

            var firstError = testrun.io.firstCall.args[0],
                secondError = testrun.io.secondCall.args[0],
                firstRequest = testrun.io.firstCall.args[4],
                firstResponse = testrun.io.firstCall.args[3],
                secondRequest = testrun.io.secondCall.args[4],
                secondResponse = testrun.io.secondCall.args[3];

            expect(firstError).to.be(null);
            expect(secondError).to.be(null);

            expect(firstRequest.url.toString()).to.eql('https://postman-echo.com/digest-auth');
            expect(firstResponse.code).to.eql(401);

            expect(secondRequest.url.toString()).to.eql('https://postman-echo.com/digest-auth');
            expect(secondResponse.code).to.eql(200);
        });

        it('must have failed the digest authorization in first attempt', function () {
            var request = testrun.request.getCall(0).args[3],
                response = testrun.request.getCall(0).args[2];

            expect(request.url.toString()).to.eql('https://postman-echo.com/digest-auth');
            expect(response.code).to.eql(401);
        });

        it('must have passed the digest authorization in second attempt', function () {
            var request = testrun.request.getCall(1).args[3],
                response = testrun.request.getCall(1).args[2];

            expect(request.url.toString()).to.eql('https://postman-echo.com/digest-auth');
            expect(response.code).to.eql(200);
        });

        it('must have taken the qop value from the server\'s response', function () {
            var request = testrun.request.getCall(1).args[3],
                authHeader = request.headers.get('authorization');

            expect(authHeader.match(/qop=auth/)).to.be.ok();
        });
    });

    describe('with correct details (qop="auth", algorithm="MD5-sess")', function () {
        before(function (done) {
            var runOptions = {
                collection: {
                    item: {
                        name: 'DigestAuth',
                        request: {
                            url: 'https://postman-echo.com/digest-auth',
                            auth: {
                                type: 'digest',
                                digest: {
                                    qop: 'auth',
                                    algorithm: 'MD5-sess',
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
            };

            // perform the collection run
            this.run(runOptions, function (err, results) {
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

        it('must have sent two requests internally', function () {
            expect(testrun.io.callCount).to.be(2);
            expect(testrun.request.callCount).to.be(2);

            var firstError = testrun.io.firstCall.args[0],
                secondError = testrun.io.secondCall.args[0],
                firstRequest = testrun.io.firstCall.args[4],
                firstResponse = testrun.io.firstCall.args[3],
                secondRequest = testrun.io.secondCall.args[4],
                secondResponse = testrun.io.secondCall.args[3];

            expect(firstError).to.be(null);
            expect(secondError).to.be(null);

            expect(firstRequest.url.toString()).to.eql('https://postman-echo.com/digest-auth');
            expect(firstResponse.code).to.eql(401);

            expect(secondRequest.url.toString()).to.eql('https://postman-echo.com/digest-auth');
            expect(secondResponse.code).to.eql(200);
        });

        it('must have failed the digest authorization in first attempt', function () {
            var request = testrun.request.getCall(0).args[3],
                response = testrun.request.getCall(0).args[2];

            expect(request.url.toString()).to.eql('https://postman-echo.com/digest-auth');
            expect(response.code).to.eql(401);
        });

        it('must have passed the digest authorization in second attempt', function () {
            var request = testrun.request.getCall(1).args[3],
                response = testrun.request.getCall(1).args[2];

            expect(request.url.toString()).to.eql('https://postman-echo.com/digest-auth');
            expect(response.code).to.eql(200);
        });
    });

    describe('with retrying turned off', function () {
        before(function (done) {
            var runOptions = {
                collection: {
                    item: {
                        name: 'DigestAuth',
                        request: {
                            url: 'https://postman-echo.com/digest-auth',
                            auth: {
                                type: 'digest',
                                digest: {
                                    algorithm: 'MD5',
                                    username: '{{uname}}',
                                    password: '{{pass}}',
                                    disableRetryRequest: true
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
            };

            // perform the collection run
            this.run(runOptions, function (err, results) {
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

        it('must have sent only one request', function () {
            expect(testrun.io.callCount).to.be(1);
            expect(testrun.request.callCount).to.be(1);

            var err = testrun.io.firstCall.args[0],
                request = testrun.io.firstCall.args[4],
                response = testrun.io.firstCall.args[3];

            expect(err).to.be(null);
            expect(request.url.toString()).to.eql('https://postman-echo.com/digest-auth');
            expect(response.code).to.eql(401);
        });
    });

    describe('with incorrect details (advance options not provided)', function () {
        before(function (done) {
            var runOptions = {
                collection: {
                    item: {
                        name: 'DigestAuth',
                        request: {
                            url: 'https://postman-echo.com/digest-auth',
                            auth: {
                                type: 'digest',
                                digest: {
                                    algorithm: 'MD5',
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
                        value: 'notpostman'
                    }, {
                        key: 'pass',
                        value: 'password'
                    }]
                }
            };

            // perform the collection run
            this.run(runOptions, function (err, results) {
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

        it('must have tried twice', function () {
            expect(testrun.io.callCount).to.be(2);
            expect(testrun.request.callCount).to.be(2);

            var firstError = testrun.io.firstCall.args[0],
                secondError = testrun.io.secondCall.args[0],
                firstResponse = testrun.io.firstCall.args[3],
                secondResponse = testrun.io.secondCall.args[3];

            expect(firstError).to.be(null);
            expect(secondError).to.be(null);
            expect(firstResponse.code).to.eql(401);
            expect(secondResponse.code).to.eql(401);
        });
    });

    describe('with incorrect details (all advance options provided)', function () {
        before(function (done) {
            var runOptions = {
                collection: {
                    item: {
                        name: 'DigestAuth',
                        request: {
                            url: 'https://postman-echo.com/digest-auth',
                            auth: {
                                type: 'digest',
                                digest: {
                                    algorithm: 'MD5',
                                    username: '{{uname}}',
                                    password: '{{pass}}',
                                    nonce: 'random',
                                    realm: 'random',
                                    clientNonce: 'random',
                                    nonceCount: 1,
                                    qop: 'auth'
                                }
                            }
                        }
                    }
                },
                environment: {
                    values: [{
                        key: 'uname',
                        value: 'notpostman'
                    }, {
                        key: 'pass',
                        value: 'password'
                    }]
                }
            };

            // perform the collection run
            this.run(runOptions, function (err, results) {
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

        it('must try only once', function () {
            expect(testrun.io.callCount).to.be(1);
            expect(testrun.request.callCount).to.be(1);

            var firstError = testrun.io.firstCall.args[0],
                firstResponse = testrun.io.firstCall.args[3];

            expect(firstError).to.be(null);
            expect(firstResponse.code).to.eql(401);
        });
    });

    describe('with correct details (qop="auth-int", algorithm="MD5")', function () {
        before(function (done) {
            var runOptions = {
                collection: {
                    item: {
                        name: 'DigestAuth',
                        request: {
                            url: 'https://httpbin.org/digest-auth/auth-int/postman/password/MD5',
                            auth: {
                                type: 'digest',
                                digest: {
                                    algorithm: 'MD5',
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
            };

            // perform the collection run
            this.run(runOptions, function (err, results) {
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

        it('must have sent two requests internally', function () {
            expect(testrun.io.callCount).to.be(2);
            expect(testrun.request.callCount).to.be(2);

            var firstError = testrun.io.firstCall.args[0],
                secondError = testrun.io.secondCall.args[0],
                firstResponse = testrun.io.firstCall.args[3],
                secondResponse = testrun.io.secondCall.args[3];

            expect(firstError).to.be(null);
            expect(secondError).to.be(null);
            expect(firstResponse.code).to.eql(401);
            expect(secondResponse.code).to.eql(200);
        });

        it('must have failed the digest authorization in first attempt', function () {
            var response = testrun.request.getCall(0).args[2];

            expect(response.code).to.eql(401);
        });

        it('must have passed the digest authorization in second attempt', function () {
            var response = testrun.request.getCall(1).args[2];

            expect(response.code).to.eql(200);
        });

        it('must have taken the qop value from the server\'s response', function () {
            var request = testrun.request.getCall(1).args[3],
                authHeader = request.headers.get('authorization');

            expect(authHeader.match(/qop=auth-int/)).to.be.ok();
        });
    });
});
