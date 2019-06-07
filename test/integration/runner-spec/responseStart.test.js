var sinon = require('sinon'),
    expect = require('chai').expect;

describe('Runner Spec: responseStart', function () {
    var testrun;

    describe('with collection request', function () {
        before(function (done) {
            this.run({
                collection: {
                    item: [{
                        request: 'https://www.postman-echo.com/get'
                    }]
                }
            }, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        it('should complete the run', function () {
            expect(testrun).to.be.ok;
            sinon.assert.calledOnce(testrun.start);
            sinon.assert.calledOnce(testrun.done);
            sinon.assert.calledWith(testrun.done.getCall(0), null);

            sinon.assert.calledOnce(testrun.request);
            sinon.assert.calledWith(testrun.request.getCall(0), null);

            sinon.assert.calledOnce(testrun.response);
            sinon.assert.calledWith(testrun.response.getCall(0), null);
        });

        it('should trigger responseStart callback for collection request', function () {
            sinon.assert.calledOnce(testrun.responseStart);
            sinon.assert.calledWith(testrun.responseStart.getCall(0), null);

            var responseStart = testrun.responseStart.getCall(0),
                response = responseStart.args[2];

            expect(response).to.have.property('code', 200);
            expect(response).to.have.property('headers');
            expect(response).to.not.have.property('stream');
        });
    });

    describe('with script request', function () {
        before(function (done) {
            this.run({
                collection: {
                    item: [{
                        request: 'https://www.postman-echo.com/get',
                        event: [{
                            listen: 'test',
                            script: {
                                type: 'text/javascript',
                                exec: `
                                pm.sendRequest('https://postman-echo.com/status/200', function (err, res) {
                                    pm.test("Status code is 200", function () {
                                        pm.expect(res).to.have.status(200);
                                    });
                                });
                                `
                            }
                        }]
                    }]
                }
            }, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        it('should complete the run', function () {
            expect(testrun).to.be.ok;
            sinon.assert.calledOnce(testrun.start);
            sinon.assert.calledOnce(testrun.done);
            sinon.assert.calledWith(testrun.done.getCall(0), null);

            sinon.assert.calledOnce(testrun.response);
            sinon.assert.calledWith(testrun.response.getCall(0), null);
        });

        it('should not trigger responseStart callback for pm.sendRequest', function () {
            // request triggered twice
            sinon.assert.calledTwice(testrun.request);
            sinon.assert.calledWith(testrun.request.getCall(0), null);
            sinon.assert.calledWith(testrun.request.getCall(1), null);

            // responseStart triggered only once
            sinon.assert.calledOnce(testrun.responseStart);
            sinon.assert.calledWith(testrun.responseStart.getCall(0), null);

            // assert collection request
            var responseStart = testrun.responseStart.getCall(0),
                response = responseStart.args[2],
                request = responseStart.args[3];

            expect(response).to.have.property('code', 200);
            expect(response).to.have.property('headers');
            expect(response).to.not.have.property('stream');

            expect(request.url.toString()).to.not.have.property('https://www.postman-echo.com/get');

            // assert script request
            sinon.assert.calledOnce(testrun.script);
            sinon.assert.calledWith(testrun.script.getCall(0), null);

            sinon.assert.calledOnce(testrun.test);
            sinon.assert.calledWith(testrun.script.getCall(0), null);

            sinon.assert.calledOnce(testrun.assertion);
            expect(testrun.assertion.getCall(0).args[1][0]).to.include({
                error: null,
                index: 0,
                passed: true,
                skipped: false,
                name: 'Status code is 200'
            });
        });
    });

    describe('with auth request', function () {
        before(function (done) {
            this.run({
                collection: {
                    item: [{
                        request: 'https://www.postman-echo.com/get',
                        event: [{
                            listen: 'test',
                            script: {
                                type: 'text/javascript',
                                exec: `
                                pm.sendRequest({
                                    url: 'https://postman-echo.com/digest-auth',
                                    auth: {
                                        type: 'digest',
                                        digest: {
                                            algorithm: 'MD5',
                                            username: 'postman',
                                            password: 'password'
                                        }
                                    }
                                }, function (err, res) {
                                    pm.test("Status code is 200", function () {
                                        pm.expect(res).to.have.status(200);
                                    });
                                });
                                `
                            }
                        }]
                    }]
                }
            }, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        it('should complete the run', function () {
            expect(testrun).to.be.ok;
            sinon.assert.calledOnce(testrun.start);
            sinon.assert.calledOnce(testrun.done);
            sinon.assert.calledWith(testrun.done.getCall(0), null);

            sinon.assert.calledOnce(testrun.response);
            sinon.assert.calledWith(testrun.response.getCall(0), null);
        });

        it('should not trigger responseStart callback for digest auth request', function () {
            // request triggered thrice
            sinon.assert.calledThrice(testrun.request);
            sinon.assert.calledWith(testrun.request.getCall(0), null);
            sinon.assert.calledWith(testrun.request.getCall(1), null);
            sinon.assert.calledWith(testrun.request.getCall(2), null);

            // responseStart triggered only once
            sinon.assert.calledOnce(testrun.responseStart);
            sinon.assert.calledWith(testrun.responseStart.getCall(0), null);

            // assert collection request
            var responseStart = testrun.responseStart.getCall(0),
                response = responseStart.args[2],
                request = responseStart.args[3];

            expect(response).to.have.property('code', 200);
            expect(response).to.have.property('headers');
            expect(response).to.not.have.property('stream');

            expect(request.url.toString()).to.not.have.property('https://www.postman-echo.com/get');

            // assert script request
            sinon.assert.calledOnce(testrun.script);
            sinon.assert.calledWith(testrun.script.getCall(0), null);

            sinon.assert.calledOnce(testrun.test);
            sinon.assert.calledWith(testrun.script.getCall(0), null);

            sinon.assert.calledOnce(testrun.assertion);
            expect(testrun.assertion.getCall(0).args[1][0]).to.include({
                error: null,
                index: 0,
                passed: true,
                skipped: false,
                name: 'Status code is 200'
            });
        });
    });
});
