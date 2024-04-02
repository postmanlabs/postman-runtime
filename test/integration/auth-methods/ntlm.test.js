var expect = require('chai').expect,
    _ = require('lodash');

(typeof window === 'undefined' ? describe : describe.skip)('NTLM', function () {
    // @todo Add '/ntlm' endpoint in echo server
    var USERNAME = 'postman',
        PASSWORD = 'NTLM@123',
        DOMAIN = 'domain',
        WORKSTATION = 'workstation',
        ntlmServerURL,
        testrun,
        runOptions;

    before(function () {
        ntlmServerURL = global.servers.ntlm;
        runOptions = {
            collection: {
                item: {
                    name: 'NTLM Sample Request',
                    request: {
                        url: ntlmServerURL,
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
    });

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
                            url: ntlmServerURL,
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

    describe('with username in down-level logon format', function () {
        before(function (done) {
            var clonedRunOptions = _.merge({}, runOptions, {
                environment: {
                    values: [{
                        key: 'uname',
                        value: DOMAIN + '\\' + USERNAME
                    }, {
                        key: 'pass',
                        value: PASSWORD
                    }, {
                        key: 'domain',
                        value: ''
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

    describe('with username in user principal name format', function () {
        before(function (done) {
            var clonedRunOptions = _.merge({}, runOptions, {
                environment: {
                    values: [{
                        key: 'uname',
                        value: USERNAME + '@' + DOMAIN
                    }, {
                        key: 'pass',
                        value: PASSWORD
                    }, {
                        key: 'domain',
                        value: ''
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

    describe('with username in both formats', function () {
        before(function (done) {
            var clonedRunOptions = _.merge({}, runOptions, {
                environment: {
                    values: [{
                        key: 'uname',
                        value: DOMAIN + '\\' + USERNAME + '@' + DOMAIN
                    }, {
                        key: 'pass',
                        value: PASSWORD
                    }, {
                        key: 'domain',
                        value: ''
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

        it('should have sent the request thrice with failed authentication', function () {
            expect(testrun).to.nested.include({
                'request.callCount': 3
            });

            var err = testrun.request.thirdCall.args[0],
                response = testrun.request.thirdCall.args[2];

            expect(err).to.be.null;
            expect(response).to.have.property('code', 401);
        });
    });

    describe('with NTLM auth set at collection level and 5 iterations', function () {
        before(function (done) {
            var localRunOptions = {
                collection: {
                    item: {
                        name: 'NTLM Sample Request',
                        request: {
                            url: ntlmServerURL
                        }
                    },
                    auth: {
                        type: 'ntlm',
                        ntlm: {
                            username: USERNAME,
                            password: PASSWORD,
                            domain: DOMAIN,
                            workstation: WORKSTATION
                        }
                    }
                },
                iterationCount: 5
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

        it('should have sent the request 3 * 5 = 15 times', function () {
            expect(testrun).to.nested.include({
                'request.callCount': 15
            });

            var response0 = testrun.request.getCall(0).args[2],
                response1 = testrun.request.getCall(1).args[2],
                response2 = testrun.request.getCall(2).args[2],
                response5 = testrun.request.getCall(5).args[2],
                response8 = testrun.request.getCall(8).args[2],
                response11 = testrun.request.getCall(11).args[2],
                response14 = testrun.request.getCall(14).args[2];

            expect(response0, 'iteration 1, request 1').to.have.property('code', 401);
            expect(response1, 'iteration 1, request 2').to.have.property('code', 401);
            expect(response2, 'iteration 1, request 3').to.have.property('code', 200);
            expect(response5, 'iteration 2, request 3').to.have.property('code', 200);
            expect(response8, 'iteration 3, request 3').to.have.property('code', 200);
            expect(response11, 'iteration 4, request 3').to.have.property('code', 200);
            expect(response14, 'iteration 5, request 3').to.have.property('code', 200);
        });
    });

    describe('with NTLM auth set at collection level with 4 requests', function () {
        before(function (done) {
            var localRunOptions = {
                collection: {
                    item: [
                        { name: 'NTLM Sample Request 1',
                            request: {
                                url: ntlmServerURL
                            } },
                        { name: 'NTLM Sample Request 2',
                            request: {
                                url: ntlmServerURL
                            } },
                        { name: 'NTLM Sample Request 3',
                            request: {
                                url: ntlmServerURL
                            } },
                        { name: 'NTLM Sample Request 4',
                            request: {
                                url: ntlmServerURL
                            } }
                    ],
                    auth: {
                        type: 'ntlm',
                        ntlm: {
                            username: USERNAME,
                            password: PASSWORD,
                            domain: DOMAIN,
                            workstation: WORKSTATION
                        }
                    }
                },
                iterationCount: 5
            };

            // perform the collection run
            this.run(localRunOptions, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        it('should have completed the run with 4 200 and other 401', function () {
            var response0 = testrun.request.getCall(0).args[2],
                response1 = testrun.request.getCall(1).args[2],
                response2 = testrun.request.getCall(2).args[2],
                response5 = testrun.request.getCall(5).args[2],
                response8 = testrun.request.getCall(8).args[2],
                response11 = testrun.request.getCall(11).args[2];

            expect(response0, 'iteration 1, request 1').to.have.property('code', 401);
            expect(response1, 'iteration 1, request 2').to.have.property('code', 401);
            expect(response2, 'iteration 1, request 3').to.have.property('code', 200);
            expect(response5, 'iteration 2, request 3').to.have.property('code', 200);
            expect(response8, 'iteration 3, request 3').to.have.property('code', 200);
            expect(response11, 'iteration 4, request 3').to.have.property('code', 200);
        });
    });
});
