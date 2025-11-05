var sinon = require('sinon'),
    expect = require('chai').expect;

(typeof window === 'undefined' ? describe : describe.skip)('requester disableCookies option', function () {
    var testrun;

    describe('with requester.disableCookies: true', function () {
        before(function (done) {
            this.run({
                requester: {
                    disableCookies: true
                },
                collection: {
                    item: [{
                        request: 'https://postman-echo.com/cookies/set?foo=bar'
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

        it('should not use cookies when requester disableCookies is true', function () {
            var response = testrun.response.getCall(0).args[2];

            expect(response).to.have.property('code', 200);
            expect(response.json()).to.eql({
                cookies: {}
            });
        });
    });

    describe('with requester.disableCookies: false', function () {
        before(function (done) {
            this.run({
                requester: {
                    disableCookies: false
                },
                collection: {
                    item: [{
                        request: 'https://postman-echo.com/cookies/set?foo=bar'
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

        it('should use cookies when requester disableCookies is false', function () {
            var response = testrun.response.getCall(0).args[2];

            expect(response).to.have.property('code', 200);
            expect(response.json()).to.eql({
                cookies: {
                    foo: 'bar'
                }
            });
        });
    });

    describe('with requester.disableCookies: true and protocolProfileBehavior.disableCookies: false', function () {
        before(function (done) {
            this.run({
                requester: {
                    disableCookies: true
                },
                collection: {
                    item: [{
                        request: {
                            url: 'https://postman-echo.com/cookies/set?foo=bar',
                            method: 'GET'
                        }
                    }],
                    protocolProfileBehavior: {
                        disableCookies: false
                    }
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

        it('should use cookies when per-request override is false', function () {
            var response = testrun.response.getCall(0).args[2];

            expect(response).to.have.property('code', 200);
            expect(response.json()).to.eql({
                cookies: {
                    foo: 'bar'
                }
            });
        });
    });

    describe('with requester.disableCookies: false and protocolProfileBehavior.disableCookies: true', function () {
        before(function (done) {
            this.run({
                requester: {
                    disableCookies: false
                },
                collection: {
                    item: [{
                        request: {
                            url: 'https://postman-echo.com/cookies/set?foo=bar',
                            method: 'GET'
                        }
                    }],
                    protocolProfileBehavior: {
                        disableCookies: true
                    }
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

        it('should not use cookies when per-request override is true', function () {
            var response = testrun.response.getCall(0).args[2];

            expect(response).to.have.property('code', 200);
            expect(response.json()).to.eql({
                cookies: {}
            });
        });
    });

    describe('with requester.disableCookies: true and mixed per-request overrides', function () {
        before(function (done) {
            this.run({
                requester: {
                    disableCookies: true
                },
                collection: {
                    item: [
                        {
                            name: 'Request 1 - No Override (Uses Requester Default)',
                            request: 'https://postman-echo.com/cookies/set?first=one'
                        },
                        {
                            name: 'Request 2 - Override to Enable',
                            request: {
                                url: 'https://postman-echo.com/cookies/set?second=two',
                                method: 'GET'
                            },
                            protocolProfileBehavior: {
                                disableCookies: false
                            }
                        },
                        {
                            name: 'Request 3 - Explicitly Disabled',
                            request: {
                                url: 'https://postman-echo.com/cookies/set?third=three',
                                method: 'GET'
                            },
                            protocolProfileBehavior: {
                                disableCookies: true
                            }
                        }
                    ]
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

            sinon.assert.calledThrice(testrun.request);
            sinon.assert.calledThrice(testrun.response);
        });

        it('should not use cookies for request 1 (requester default)', function () {
            var response = testrun.response.getCall(0).args[2];

            expect(response).to.have.property('code', 200);
            expect(response.json()).to.eql({
                cookies: {}
            });
        });

        it('should use cookies for request 2 (override to enable)', function () {
            var response = testrun.response.getCall(1).args[2];

            expect(response).to.have.property('code', 200);
            expect(response.json()).to.eql({
                cookies: {
                    second: 'two'
                }
            });
        });

        it('should not use cookies for request 3 (explicitly disabled)', function () {
            var response = testrun.response.getCall(2).args[2];

            expect(response).to.have.property('code', 200);
            expect(response.json()).to.eql({
                cookies: {}
            });
        });
    });

    describe('with no requester.disableCookies set (default behavior)', function () {
        before(function (done) {
            this.run({
                collection: {
                    item: [{
                        request: 'https://postman-echo.com/cookies/set?foo=bar'
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

        it('should use cookies by default (backward compatibility)', function () {
            var response = testrun.response.getCall(0).args[2];

            expect(response).to.have.property('code', 200);
            expect(response.json()).to.eql({
                cookies: {
                    foo: 'bar'
                }
            });
        });
    });

    describe('cookies not sent when disabled at requester level', function () {
        before(function (done) {
            this.run({
                requester: {
                    disableCookies: true
                },
                collection: {
                    item: [
                        {
                            request: 'https://postman-echo.com/cookies/set?test=value'
                        },
                        {
                            request: 'https://postman-echo.com/cookies'
                        }
                    ]
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
            sinon.assert.calledTwice(testrun.request);
            sinon.assert.calledTwice(testrun.response);
        });

        it('should not send cookies in subsequent requests', function () {
            var response = testrun.response.getCall(1).args[2];

            expect(response).to.have.property('code', 200);
            expect(response.json()).to.eql({
                cookies: {}
            });
        });
    });

    describe('cookies sent when enabled at requester level', function () {
        before(function (done) {
            this.run({
                requester: {
                    disableCookies: false
                },
                collection: {
                    item: [
                        {
                            request: 'https://postman-echo.com/cookies/set?test=value'
                        },
                        {
                            request: 'https://postman-echo.com/cookies'
                        }
                    ]
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
            sinon.assert.calledTwice(testrun.request);
            sinon.assert.calledTwice(testrun.response);
        });

        it('should send cookies in subsequent requests', function () {
            var response = testrun.response.getCall(1).args[2];

            expect(response).to.have.property('code', 200);
            expect(response.json()).to.eql({
                cookies: {
                    test: 'value'
                }
            });
        });
    });
});

