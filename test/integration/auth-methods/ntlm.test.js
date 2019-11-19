var expect = require('chai').expect,
    _ = require('lodash'),

    server = require('../../fixtures/server');

describe.skip('NTLM', function () {
    // @todo Add '/ntlm' endpoint in echo server
    var ntlmServerIP = '34.214.154.175',
        USERNAME = 'postman',
        PASSWORD = 'NTLM@123',
        DOMAIN = '',
        WORKSTATION = '',
        testrun,
        runOptions = {
            collection: {
                item: {
                    name: 'NTLM Sample Request',
                    request: {
                        url: ntlmServerIP,
                        auth: {
                            type: 'ntlm',
                            ntlm: {
                                username: '{{uname}}',
                                password: '{{pass}}',
                                domain: '{{domain}}',
                                workstation: '{{workstation}}'
                            }
                        }
                    }
                }
            }
        };

    describe('with request server not supporting NTLM', function () {
        before(function (done) {
            var clonedRunOptions = _.merge({}, runOptions, {
                collection: {
                    item: {
                        request: {
                            url: 'https://postman-echo.com/digest'
                        }
                    }
                }
            }, {
                environment: {
                    values: [{
                        key: 'uname',
                        value: USERNAME
                    }, {
                        key: 'pass',
                        value: PASSWORD
                    }, {
                        key: 'domain',
                        value: DOMAIN
                    }, {
                        key: 'workstation',
                        value: WORKSTATION
                    }]
                }
            });

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

        it('should bail out after sending one request', function () {
            expect(testrun).to.nested.include({
                'request.callCount': 1
            });

            var err = testrun.request.firstCall.args[0];

            expect(err).to.be.null;
        });
    });

    describe('with empty details', function () {
        before(function (done) {
            // creating local copy of collection because we don't want to send
            // any parameters for NTLM auth
            var localRunOptions = {
                collection: {
                    item: {
                        name: 'NTLM Sample Request',
                        request: {
                            url: ntlmServerIP,
                            auth: {
                                type: 'ntlm'
                            }
                        }
                    }
                }
            };

            // perform the collection run
            this.run(localRunOptions, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        it('should have completed the run', function () {
            expect(testrun).to.be.ok;
            expect(testrun).to.nested.include({
                'done.callCount': 1
            });

            var err = testrun.request.firstCall.args[0];

            err && console.error(err.stack);
            expect(err).to.be.null;

            expect(testrun).to.nested.include({
                'start.callCount': 1
            });
        });

        it('should have sent the request thrice', function () {
            expect(testrun).to.nested.include({
                'request.callCount': 3
            });

            var response = testrun.request.firstCall.args[2];

            expect(response).to.have.property('code', 401);
        });
    });

    describe('with in-correct details', function () {
        before(function (done) {
            var clonedRunOptions = _.merge({}, runOptions, {
                environment: {
                    values: [{
                        key: 'uname',
                        value: 'foo'
                    }, {
                        key: 'pass',
                        value: 'bar'
                    }, {
                        key: 'domain',
                        value: DOMAIN
                    }, {
                        key: 'workstation',
                        value: WORKSTATION
                    }]
                }
            });

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

        it('should have sent the request thrice', function () {
            expect(testrun).to.nested.include({
                'request.callCount': 3
            });

            var err = testrun.request.firstCall.args[0],
                response = testrun.request.firstCall.args[2];

            expect(err).to.be.null;
            expect(response).to.have.property('code', 401);
        });
    });

    describe('with retrying turned off', function () {
        before(function (done) {
            var clonedRunOptions = _.merge({}, runOptions, {
                collection: {
                    item: {
                        request: {
                            auth: {
                                ntlm: {
                                    disableRetryRequest: true
                                }
                            }
                        }
                    }
                },
                environment: {
                    values: [{
                        key: 'uname',
                        value: 'foo'
                    }, {
                        key: 'pass',
                        value: 'bar'
                    }, {
                        key: 'domain',
                        value: DOMAIN
                    }, {
                        key: 'workstation',
                        value: WORKSTATION
                    }]
                }
            });

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

        it('should have sent the request only once', function () {
            expect(testrun).to.nested.include({
                'request.callCount': 1
            });

            var err = testrun.request.firstCall.args[0],
                response = testrun.request.firstCall.args[2];

            expect(err).to.be.null;
            expect(response).to.have.property('code', 401);
        });
    });

    describe('with redirects', function () {
        var redirectServer,
            PORT = 5050,
            URL = 'http://localhost:' + PORT;

        before(function (done) {
            redirectServer = server.createExternalRedirectServer();

            var customRunOptions = {
                collection: {
                    item: [{
                        name: 'NTLM Sample Request',
                        request: {
                            // send request to ntlm server after redirect
                            url: URL + '/http://' + ntlmServerIP,
                            auth: {
                                type: 'ntlm',
                                ntlm: {
                                    username: USERNAME,
                                    password: PASSWORD,
                                    domain: DOMAIN,
                                    workstation: WORKSTATION
                                }
                            }
                        }
                    }, {
                        name: 'Close connection',
                        request: {
                            header: [{
                                key: 'Connection',
                                value: 'close'
                            }],
                            url: ntlmServerIP
                        }
                    }]
                }
            };

            redirectServer.listen(PORT, function () {
                // perform the collection run
                this.run(customRunOptions, function (err, results) {
                    testrun = results;
                    done(err);
                });
            }.bind(this));
        });

        after(function (done) {
            redirectServer.destroy(done);
        });

        it('should have completed the run', function () {
            expect(testrun).to.be.ok;
            expect(testrun).to.nested.include({
                'done.callCount': 1
            });

            var err = testrun.request.firstCall.args[0];

            err && console.error(err.stack);
            expect(err).to.be.null;

            expect(testrun).to.nested.include({
                'start.callCount': 1
            });
        });

        it('should have sent the request thrice for NTLM', function () {
            expect(testrun).to.nested.include({
                'request.callCount': 4 // fourth call is for "Close connection" request
            });

            var response1 = testrun.request.firstCall.args[2],
                response2 = testrun.request.secondCall.args[2],
                response3 = testrun.request.thirdCall.args[2];

            expect(response1).to.have.property('code', 401);
            expect(response2).to.have.property('code', 401);
            expect(response3).to.have.property('code', 200);
        });
    });

    describe('with correct details', function () {
        before(function (done) {
            var clonedRunOptions = _.merge({}, runOptions, {
                environment: {
                    values: [{
                        key: 'uname',
                        value: USERNAME
                    }, {
                        key: 'pass',
                        value: PASSWORD
                    }, {
                        key: 'domain',
                        value: DOMAIN
                    }, {
                        key: 'workstation',
                        value: WORKSTATION
                    }]
                }
            }, runOptions);

            // perform the collection run
            this.run(clonedRunOptions, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        it('should have completed the run successfully', function () {
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

        it('should have sent the request thrice', function () {
            expect(testrun).to.nested.include({
                'request.callCount': 3
            });

            var err = testrun.request.thirdCall.args[0],
                response = testrun.request.thirdCall.args[2];

            expect(err).to.be.null;
            expect(response).to.have.property('code', 200);
        });
    });
});
