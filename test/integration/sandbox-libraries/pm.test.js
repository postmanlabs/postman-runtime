var expect = require('chai').expect,
    sinon = require('sinon');

describe('sandbox library - pm api', function () {
    var testrun;

    describe('chai', function () {
        before(function (done) {
            this.run({
                collection: {
                    item: [{
                        request: 'https://postman-echo.com/get',
                        event: [{
                            listen: 'test',
                            script: {
                                type: 'text/javascript',
                                exec: `
                                pm.test("pre-assert request", function () {
                                    pm.expect(pm.request).to.have.property('to');
                                    pm.expect(pm.request.to).to.be.an('object');
                                    pm.request.to.be.ok;
                                    pm.request.to.not.be.a.postmanResponse;
                                    pm.request.to.not.have.header('Foo-Bar');
                                    pm.request.to.have.header('host');
                                    pm.request.to.be.a.postmanRequestOrResponse;
                                });

                                pm.test("pre-assert response", function () {
                                    pm.response.to.be.ok;
                                    pm.response.to.not.be.a.postmanRequest;
                                    pm.response.to.not.be.serverError;
                                    pm.response.to.not.have.statusCode(400);
                                    pm.response.to.have.statusCode(200);
                                    pm.response.to.have.statusReason('OK');
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

            sinon.assert.calledOnce(testrun.request);
            sinon.assert.calledWith(testrun.request.getCall(0), null);

            sinon.assert.calledOnce(testrun.response);
            sinon.assert.calledWith(testrun.response.getCall(0), null);
        });

        it('should run the test script successfully', function () {
            sinon.assert.calledOnce(testrun.script);
            sinon.assert.calledWith(testrun.script.getCall(0), null);

            sinon.assert.calledOnce(testrun.test);
            sinon.assert.calledWith(testrun.script.getCall(0), null);

            sinon.assert.calledTwice(testrun.assertion);

            expect(testrun.assertion.getCall(0).args[1][0]).to.include({
                error: null,
                index: 0,
                passed: true,
                skipped: false,
                name: 'pre-assert request'
            });

            expect(testrun.assertion.getCall(1).args[1][0]).to.include({
                error: null,
                index: 1,
                passed: true,
                skipped: false,
                name: 'pre-assert response'
            });
        });
    });

    describe('sendRequest', function () {
        before(function (done) {
            this.run({
                collection: {
                    item: [{
                        request: 'https://postman-echo.com/get',
                        event: [{
                            listen: 'test',
                            script: {
                                type: 'text/javascript',
                                exec: `
                                pm.sendRequest('https://postman-echo.com/cookies/set?foo=bar', (err, res, history) => {
                                    var CookieList = require('postman-collection').CookieList;
                                    pm.test("History object in pm.sendRequest", function () {
                                        pm.expect(history).to.be.ok;
                                        pm.expect(history).to.be.an('object');
                                        pm.expect(history).to.have.all.keys(['cookies']);
                                        pm.expect(CookieList.isCookieList(history.cookies)).to.be.true;
                                        pm.expect(history.cookies.count()).to.be.at.least(1);;
                                        pm.expect(history.cookies.get('foo')).to.equal('bar');
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

            sinon.assert.calledTwice(testrun.request);
            sinon.assert.calledWith(testrun.request.getCall(0), null);

            sinon.assert.calledOnce(testrun.response);
            sinon.assert.calledWith(testrun.response.getCall(0), null);
        });

        it('should run the test script successfully', function () {
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
                name: 'History object in pm.sendRequest'
            });
        });
    });


    describe('cookies.jar', function () {
        describe('getCookies', function () {
            before(function (done) {
                this.run({
                    collection: {
                        item: [{
                            request: 'http://postman-echo.com/cookies/set?foo=bar',
                            event: [{
                                listen: 'prerequest',
                                script: {
                                    type: 'text/javascript',
                                    exec: `
                                    var jar = pm.cookies.jar();

                                    pm.test('getCookies in pre-request', function (done) {
                                        jar.getCookies("http://postman-echo.com/", function (err, cookies) {
                                            pm.expect(err).to.be.null;
                                            pm.expect(cookies).to.be.an('array').that.is.empty;
                                            done();
                                        });
                                    });
                                    `
                                }
                            }, {
                                listen: 'test',
                                script: {
                                    type: 'text/javascript',
                                    exec: `
                                    var jar = pm.cookies.jar();

                                    pm.test('getCookies in test', function (done) {
                                        jar.getCookies("http://postman-echo.com/", function (err, cookies) {
                                            pm.expect(err).to.be.null;
                                            pm.expect(cookies).to.be.an('array').that.have.a.lengthOf.at.least(1);
                                            done();
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

                sinon.assert.calledOnce(testrun.request);
                sinon.assert.calledWith(testrun.request.getCall(0), null);

                sinon.assert.calledOnce(testrun.response);
                sinon.assert.calledWith(testrun.response.getCall(0), null);
            });

            it('should run the test script successfully', function () {
                sinon.assert.calledTwice(testrun.script);
                sinon.assert.calledWith(testrun.script.getCall(0), null);
                sinon.assert.calledWith(testrun.script.getCall(1), null);

                sinon.assert.calledTwice(testrun.assertion);

                expect(testrun.assertion.getCall(0).args[1][0]).to.include({
                    error: null,
                    index: 0,
                    passed: true,
                    skipped: false,
                    name: 'getCookies in pre-request'
                });

                expect(testrun.assertion.getCall(1).args[1][0]).to.include({
                    error: null,
                    index: 0,
                    passed: true,
                    skipped: false,
                    name: 'getCookies in test'
                });
            });
        });

        describe('setCookie', function () {
            before(function (done) {
                this.run({
                    collection: {
                        item: [{
                            request: 'http://postman-echo.com/cookies',
                            event: [{
                                listen: 'prerequest',
                                script: {
                                    type: 'text/javascript',
                                    exec: `
                                    var jar = pm.cookies.jar();

                                    pm.test('setCookie in pre-request', function (done) {
                                        jar.setCookie("hello=world; Path=/", "http://postman-echo.com/",
                                            function (err) {
                                            pm.expect(err).to.be.null;
                                            done();
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

                sinon.assert.calledOnce(testrun.request);
                sinon.assert.calledWith(testrun.request.getCall(0), null);

                sinon.assert.calledOnce(testrun.response);
                sinon.assert.calledWith(testrun.response.getCall(0), null);
            });

            it('should run the test script successfully', function () {
                var response = testrun.response.getCall(0).args[2].stream.toString();

                sinon.assert.calledOnce(testrun.script);
                sinon.assert.calledWith(testrun.script.getCall(0), null);

                sinon.assert.calledOnce(testrun.assertion);
                expect(testrun.assertion.getCall(0).args[1][0]).to.include({
                    error: null,
                    index: 0,
                    passed: true,
                    skipped: false,
                    name: 'setCookie in pre-request'
                });

                expect(JSON.parse(response)).to.eql({cookies: {hello: 'world'}});
            });
        });

        describe('removeAllCookies', function () {
            before(function (done) {
                this.run({
                    collection: {
                        item: [{
                            request: 'http://postman-echo.com/cookies/set?foo=bar'
                        }, {
                            request: 'http://postman-echo.com/cookies',
                            event: [{
                                listen: 'prerequest',
                                script: {
                                    type: 'text/javascript',
                                    exec: `
                                    var jar = pm.cookies.jar();

                                    pm.test('setCookie in pre-request', function (done) {
                                        jar.setCookie("hello=world; Path=/", "http://postman-echo.com/",
                                            function (err) {
                                            pm.expect(err).to.be.null;
                                            done();
                                        });
                                    });

                                    pm.test('removeAllCookies in pre-request', function (done) {
                                        jar.removeAllCookies(function (err) {
                                            pm.expect(err).to.be.null;
                                            done();
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

                sinon.assert.calledTwice(testrun.request);
                sinon.assert.calledWith(testrun.request.getCall(0), null);

                sinon.assert.calledTwice(testrun.response);
                sinon.assert.calledWith(testrun.response.getCall(0), null);
            });

            it('should run the test script successfully', function () {
                var firstResponse = testrun.response.getCall(0).args[2].stream.toString(),
                    secondResponse = testrun.response.getCall(1).args[2].stream.toString();

                sinon.assert.calledOnce(testrun.script);
                sinon.assert.calledWith(testrun.script.getCall(0), null);

                sinon.assert.calledOnce(testrun.assertion);
                expect(testrun.assertion.getCall(0).args[1][0]).to.include({
                    error: null,
                    index: 0,
                    passed: true,
                    skipped: false,
                    name: 'setCookie in pre-request'
                });

                expect(JSON.parse(firstResponse)).to.eql({cookies: {foo: 'bar'}});
                expect(JSON.parse(secondResponse)).to.eql({cookies: {}});
            });
        });
    });
});
