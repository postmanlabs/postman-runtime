var fs = require('fs'),
    path = require('path'),
    expect = require('chai').expect;

describe('digest auth', function () {
    var USERNAME = 'postman',
        PASSWORD = 'password',
        testrun;

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
                            url: global.servers.digest,
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
                        value: USERNAME
                    }, {
                        key: 'pass',
                        value: PASSWORD
                    }]
                }
            };

            // perform the collection run
            this.run(runOptions, function (err, results) {
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

        it('should have sent two requests internally', function () {
            expect(testrun).to.nested.include({
                'request.callCount': 2,
                'io.callCount': 2
            });

            var firstError = testrun.io.firstCall.args[0],
                secondError = testrun.io.secondCall.args[0],
                firstResponse = testrun.io.firstCall.args[3],
                secondResponse = testrun.io.secondCall.args[3];

            expect(firstError).to.be.null;
            expect(secondError).to.be.null;

            expect(firstResponse).to.have.property('code', 401);
            expect(secondResponse).to.have.property('code', 200);
        });

        it('should have failed the digest authorization in first attempt', function () {
            var response = testrun.request.getCall(0).args[2];

            expect(response).to.have.property('code', 401);
        });

        it('should have passed the digest authorization in second attempt', function () {
            var response = testrun.request.getCall(1).args[2];

            expect(response).to.have.property('code', 200);
        });

        it('should have taken the qop value from the server\'s response', function () {
            var request = testrun.request.getCall(1).args[3],
                authHeader = request.headers.get('authorization');

            expect(authHeader).to.match(/qop=auth/);
        });
    });

    describe('with correct details (qop="auth", algorithm="MD5-sess")', function () {
        before(function (done) {
            var runOptions = {
                collection: {
                    item: {
                        name: 'DigestAuth',
                        request: {
                            url: global.servers.digest,
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
                        value: USERNAME
                    }, {
                        key: 'pass',
                        value: PASSWORD
                    }]
                }
            };

            // perform the collection run
            this.run(runOptions, function (err, results) {
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

        it('should have sent two requests internally', function () {
            expect(testrun).to.nested.include({
                'io.callCount': 2,
                'request.callCount': 2
            });

            var firstError = testrun.io.firstCall.args[0],
                secondError = testrun.io.secondCall.args[0],
                firstResponse = testrun.io.firstCall.args[3],
                secondResponse = testrun.io.secondCall.args[3];

            expect(firstError).to.be.null;
            expect(secondError).to.be.null;

            expect(firstResponse).to.have.property('code', 401);
            expect(secondResponse).to.have.property('code', 200);
        });

        it('should have failed the digest authorization in first attempt', function () {
            var response = testrun.request.getCall(0).args[2];

            expect(response).to.have.property('code', 401);
        });

        it('should have passed the digest authorization in second attempt', function () {
            var response = testrun.request.getCall(1).args[2];

            expect(response).to.have.property('code', 200);
        });
    });

    describe('with retrying turned off', function () {
        before(function (done) {
            var runOptions = {
                collection: {
                    item: {
                        name: 'DigestAuth',
                        request: {
                            url: global.servers.digest,
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
                        value: USERNAME
                    }, {
                        key: 'pass',
                        value: PASSWORD
                    }]
                }
            };

            // perform the collection run
            this.run(runOptions, function (err, results) {
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

        it('should have sent only one request', function () {
            expect(testrun).to.nested.include({
                'io.callCount': 1,
                'request.callCount': 1
            });

            var err = testrun.io.firstCall.args[0],
                response = testrun.io.firstCall.args[3];

            expect(err).to.be.null;
            expect(response).to.have.property('code', 401);
        });
    });

    describe('with incorrect details (wrong username and advance options not provided)', function () {
        before(function (done) {
            var runOptions = {
                collection: {
                    item: {
                        name: 'DigestAuth',
                        request: {
                            url: global.servers.digest,
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
                        value: PASSWORD
                    }]
                }
            };

            // perform the collection run
            this.run(runOptions, function (err, results) {
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

        it('should have tried twice', function () {
            expect(testrun).to.nested.include({
                'io.callCount': 2,
                'request.callCount': 2
            });

            var firstError = testrun.io.firstCall.args[0],
                secondError = testrun.io.secondCall.args[0],
                firstResponse = testrun.io.firstCall.args[3],
                secondResponse = testrun.io.secondCall.args[3];

            expect(firstError).to.be.null;
            expect(secondError).to.be.null;
            expect(firstResponse).to.have.property('code', 401);
            expect(secondResponse).to.have.property('code', 401);
        });
    });

    describe('with incorrect details (wrong password and advance options not provided)', function () {
        before(function (done) {
            var runOptions = {
                collection: {
                    item: {
                        name: 'DigestAuth',
                        request: {
                            url: global.servers.digest,
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
                        value: USERNAME
                    }, {
                        key: 'pass',
                        value: 'notpassword'
                    }]
                }
            };

            // perform the collection run
            this.run(runOptions, function (err, results) {
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

        it('should have tried twice', function () {
            expect(testrun).to.nested.include({
                'io.callCount': 2,
                'request.callCount': 2
            });

            var firstError = testrun.io.firstCall.args[0],
                secondError = testrun.io.secondCall.args[0],
                firstResponse = testrun.io.firstCall.args[3],
                secondResponse = testrun.io.secondCall.args[3];

            expect(firstError).to.be.null;
            expect(secondError).to.be.null;
            expect(firstResponse).to.have.property('code', 401);
            expect(secondResponse).to.have.property('code', 401);
        });
    });

    describe('with incorrect details (all advance options provided)', function () {
        before(function (done) {
            var runOptions = {
                collection: {
                    item: {
                        name: 'DigestAuth',
                        request: {
                            url: global.servers.digest,
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

        it('should try only once', function () {
            expect(testrun).to.nested.include({
                'io.callCount': 1,
                'request.callCount': 1
            });

            var firstError = testrun.io.firstCall.args[0],
                firstResponse = testrun.io.firstCall.args[3];

            expect(firstError).to.be.null;
            expect(firstResponse).to.have.property('code', 401);
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
                        value: USERNAME
                    }, {
                        key: 'pass',
                        value: PASSWORD
                    }]
                }
            };

            // perform the collection run
            this.run(runOptions, function (err, results) {
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

        it('should have sent two requests internally', function () {
            expect(testrun).to.nested.include({
                'io.callCount': 2,
                'request.callCount': 2
            });

            var firstError = testrun.io.firstCall.args[0],
                secondError = testrun.io.secondCall.args[0],
                firstResponse = testrun.io.firstCall.args[3],
                secondResponse = testrun.io.secondCall.args[3];

            expect(firstError).to.be.null;
            expect(secondError).to.be.null;
            expect(firstResponse).to.have.property('code', 401);
            expect(secondResponse).to.have.property('code', 200);
        });

        it('should have failed the digest authorization in first attempt', function () {
            var response = testrun.request.getCall(0).args[2];

            expect(response).to.have.property('code', 401);
        });

        it('should have passed the digest authorization in second attempt', function () {
            var response = testrun.request.getCall(1).args[2];

            expect(response).to.have.property('code', 200);
        });

        it('should have taken the qop value from the server\'s response', function () {
            var request = testrun.request.getCall(1).args[3],
                authHeader = request.headers.get('authorization');

            expect(authHeader).to.match(/qop=auth-int/);
        });
    });

    describe('with correct details and async CookieJar', function () {
        // @note this tests that `responseStart` and `response` triggers
        // are emitted in correct order because if not, request post-send
        // helpers will not execute and digest auth will fail.
        // @todo fix requester control flow to avoid this.
        before(function (done) {
            var runOptions = {
                requester: {
                    cookieJar: {
                        // this will delay the `responseStart` trigger as well
                        // and `response` callback will wait for it
                        getCookies: function (url, cb) {
                            setTimeout(function () {
                                cb(null, []);
                            }, 2000);
                        }
                    }
                },
                collection: {
                    item: {
                        name: 'DigestAuth',
                        request: {
                            url: global.servers.digest,
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
                        value: USERNAME
                    }, {
                        key: 'pass',
                        value: PASSWORD
                    }]
                }
            };

            // perform the collection run
            this.run(runOptions, function (err, results) {
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

        it('should have sent two requests internally', function () {
            expect(testrun).to.nested.include({
                'request.callCount': 2,
                'io.callCount': 2
            });

            var firstError = testrun.io.firstCall.args[0],
                secondError = testrun.io.secondCall.args[0],
                firstResponse = testrun.io.firstCall.args[3],
                secondResponse = testrun.io.secondCall.args[3];

            expect(firstError).to.be.null;
            expect(secondError).to.be.null;

            expect(firstResponse).to.have.property('code', 401);
            expect(secondResponse).to.have.property('code', 200);
        });

        it('should have failed the digest authorization in first attempt', function () {
            var response = testrun.request.getCall(0).args[2];

            expect(response).to.have.property('code', 401);
        });

        it('should have passed the digest authorization in second attempt', function () {
            var response = testrun.request.getCall(1).args[2];

            expect(response).to.have.property('code', 200);
        });

        it('should have taken the qop value from the server\'s response', function () {
            var request = testrun.request.getCall(1).args[3],
                authHeader = request.headers.get('authorization');

            expect(authHeader).to.match(/qop=auth/);
        });
    });

    (typeof window === 'undefined' ? describe : describe.skip)('with binary body and qop=auth-int', function () {
        before(function (done) {
            // perform the collection run
            this.run({
                collection: {
                    item: {
                        request: {
                            auth: {
                                type: 'digest',
                                digest: {
                                    username: 'postman',
                                    realm: 'Users',
                                    password: 'password',
                                    nonce: 'bcgEc5RPU1ANglyT2I0ShU0oxqPB5jXp',
                                    nonceCount: '00000001',
                                    algorithm: 'MD5',
                                    qop: 'auth-int',
                                    clientNonce: '0a4f113b',
                                    opaque: '5ccc069c403ebaf9f0171e9517f40e'
                                }
                            },
                            url: 'https://postman-echo.com/get',
                            method: 'GET',
                            body: {
                                mode: 'file',
                                file: {
                                    src: path.resolve(__dirname, '../../fixtures/upload-file.json')
                                }
                            }
                        }
                    }
                },
                fileResolver: fs
            }, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        it('should have completed the run', function () {
            expect(testrun).to.be.ok;
            expect(testrun).to.nested.include({
                'done.calledOnce': true,
                'start.calledOnce': true
            });
            expect(testrun.done.getCall(0).args[0]).to.be.null;
        });

        it('should send correct Auth header', function () {
            var response = testrun.response.getCall(0).args[2],

                // eslint-disable-next-line max-len
                expectedHeader = 'Digest username="postman", realm="Users", nonce="bcgEc5RPU1ANglyT2I0ShU0oxqPB5jXp", uri="/get", algorithm="MD5", qop=auth-int, nc=00000001, cnonce="0a4f113b", response="a6745c111f25f5816f3b14c9d23c2cb1", opaque="5ccc069c403ebaf9f0171e9517f40e"';

            expect(response.json().headers).to.have.property('authorization', expectedHeader);
        });
    });

    // @todo remove authorization header in the pre-hook for digest and NTLM auth.
    // this test suite fails because authorization header is present in the first request.
    // authorization header must be removed before sending request to the server.
    // if header is not removed in the first request, server might return 400 - Bad Request.
    describe.skip('with correct details and existing Authorization header', function () {
        before(function (done) {
            var runOptions = {
                collection: {
                    item: {
                        name: 'DigestAuth',
                        request: {
                            url: global.servers.digest,
                            method: 'GET',
                            auth: {
                                type: 'digest',
                                digest: {
                                    algorithm: 'MD5',
                                    username: USERNAME,
                                    password: PASSWORD
                                }
                            },
                            header: [
                                {
                                    key: 'Authorization',
                                    value: 'postman'
                                }
                            ]
                        }
                    }
                }
            };

            this.run(runOptions, function (err, results) {
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

        // this fails because only one request is sent, as server returns 400 in the first request.
        it('should have sent two requests internally', function () {
            expect(testrun).to.nested.include({
                'io.callCount': 2,
                'request.callCount': 2
            });

            var firstError = testrun.io.firstCall.args[0],
                secondError = testrun.io.secondCall.args[0];

            expect(firstError).to.be.null;
            expect(secondError).to.be.null;
        });

        // this fails because we get 400 instead of 401.
        it('should have passed even if Authorization header is present', function () {
            var firstCall = testrun.request.getCall(0),
                secondCall = testrun.request.getCall(1);

            expect(firstCall).to.be.not.null;
            expect(firstCall.args[2]).to.have.property('code', 401);

            expect(secondCall).to.be.not.null;
            expect(secondCall.args[2]).to.have.property('code', 200);
        });
    });
});
