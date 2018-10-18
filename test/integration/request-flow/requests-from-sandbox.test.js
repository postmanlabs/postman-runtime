var expect = require('chai').expect;

describe('requests from sandbox', function() {
    describe('single .sendRequest', function () {
        var testrun,
            sandboxRequestUrl = 'postman-echo.com/get?sandbox=true';

        before(function(done) {
            this.run({
                collection: {
                    item: {
                        // ensure that we run something for test and pre-req scripts
                        event: [{
                            listen: 'prerequest',
                            script: {
                                exec: `
                                var sdk = require('postman-collection'),
                                    myreq = new sdk.Request('${sandboxRequestUrl}');

                                pm.sendRequest(myreq, function(err, _response) {
                                    pm.test('request was sent from sandbox', function () {
                                        pm.expect(_response).to.have.property('code', 200);
                                        pm.expect(_response).to.have.property('status', 'OK');
                                    });
                                });
                                `
                            }
                        }],
                        request: 'https://postman-echo.com/get'
                    }
                }
            }, function(err, results) {
                testrun = results;
                done(err);
            });
        });

        it('should have called io event twice', function () {
            expect(testrun).to.nested.include({
                'io.calledTwice': true
            });
        });

        it('should have called the request event twice', function () {
            expect(testrun).to.nested.include({
                'request.calledTwice': true
            });
        });

        it('should have the same cursor id for both the io events', function () {
            var ref = testrun.beforeItem.firstCall.args[1].ref;

            expect(testrun).to.have.property('io').that.nested.include({
                'firstCall.args[1].ref': ref,
                'secondCall.args[1].ref': ref
            });
        });

        it('should have sent the first request from inside the sandbox', function () {
            var error = testrun.io.firstCall.args[0],
                request = testrun.io.firstCall.args[4],
                response = testrun.io.firstCall.args[3],
                trace = testrun.io.firstCall.args[2];

            expect(error).to.be.null;

            expect(request.url.toString()).to.eql(sandboxRequestUrl);
            expect(response).to.have.property('code', 200);

            expect(trace).to.deep.include({
                type: 'http',
                source: 'script'
            });
        });

        it('should have sent the second request as a part of the collection run', function () {
            var error = testrun.io.secondCall.args[0],
                request = testrun.io.secondCall.args[4],
                response = testrun.io.secondCall.args[3],
                trace = testrun.io.secondCall.args[2];

            expect(error).to.be.null;

            expect(request.url.toString()).to.eql('https://postman-echo.com/get');
            expect(response).to.have.property('code', 200);

            expect(trace).to.deep.include({
                type: 'http',
                source: 'collection'
            });
        });

        it('should have provided the response to the sandbox sendrequest function', function () {
            var assertion = testrun.assertion.firstCall.args[1][0];

            expect(assertion).to.deep.include({
                name: 'request was sent from sandbox',
                skipped: false,
                passed: true,
                error: null,
                index: 0
            });
        });

        it('should have completed the run', function() {
            expect(testrun).to.be.ok;
            expect(testrun.done.getCall(0).args[0]).to.be.null;
            expect(testrun).to.nested.include({
                'done.calledOnce': true,
                'start.calledOnce': true
            });
        });
    });

    describe('multiple sends', function () {
        var testrun,
            sandboxRequestUrl1 = 'postman-echo.com/get?sandbox=true&n=1',
            sandboxRequestUrl2 = 'postman-echo.com/get?sandbox=true&n=2',
            testname1 = 'sending-1',
            testname2 = 'sending-2';

        before(function(done) {
            this.run({
                collection: {
                    item: {
                        // ensure that we run something for test and pre-req scripts
                        event: [{
                            listen: 'prerequest',
                            script: {
                                exec: `
                                var sdk = require('postman-collection'),
                                    req1 = new sdk.Request('${sandboxRequestUrl1}');

                                pm.sendRequest(req1, function(err, response1) {
                                    pm.test('${testname1}', function () {
                                        pm.expect(response1).to.have.property('code', 200);
                                        pm.expect(response1).to.have.property('status', 'OK');

                                        pm.expect(response1.json().args).to.have.property('n', '1');
                                    });

                                    var req2 = new sdk.Request('${sandboxRequestUrl2}');
                                    pm.sendRequest(req2, function (err, response2) {
                                        pm.test('${testname2}', function () {
                                            pm.expect(response2).to.have.property('code', 200);
                                            pm.expect(response2).to.have.property('status', 'OK');

                                            pm.expect(response2.json().args).to.have.property('n', '2');
                                        });
                                    });
                                });
                                `
                            }
                        }],
                        request: 'https://postman-echo.com/get'
                    }
                }
            }, function(err, results) {
                testrun = results;
                done(err);
            });
        });

        it('should have called io event thrice', function () {
            expect(testrun).to.nested.include({
                'io.calledThrice': true
            });
        });

        it('should have called the request event thrice', function () {
            expect(testrun).to.nested.include({
                'request.calledThrice': true
            });
        });

        it('should have the same cursor id for all the io events', function () {
            var ref = testrun.beforeItem.firstCall.args[1].ref;

            expect(testrun).to.have.property('io').that.nested.include({
                'firstCall.args[1].ref': ref,
                'secondCall.args[1].ref': ref,
                'thirdCall.args[1].ref': ref
            });
        });

        it('should have sent the first request from inside the sandbox', function () {
            var error = testrun.io.firstCall.args[0],
                request = testrun.io.firstCall.args[4],
                response = testrun.io.firstCall.args[3],
                trace = testrun.io.firstCall.args[2];

            expect(error).to.be.null;

            expect(request.url.toString()).to.eql(sandboxRequestUrl1);
            expect(response).to.have.property('code', 200);

            expect(trace).to.deep.include({
                type: 'http',
                source: 'script'
            });
        });

        it('should have sent the second request from inside the sandbox too', function () {
            var error = testrun.io.secondCall.args[0],
                request = testrun.io.secondCall.args[4],
                response = testrun.io.secondCall.args[3],
                trace = testrun.io.secondCall.args[2];

            expect(error).to.be.null;

            expect(request.url.toString()).to.eql(sandboxRequestUrl2);
            expect(response).to.have.property('code', 200);

            expect(trace).to.deep.include({
                type: 'http',
                source: 'script'
            });
        });

        it('should have sent the third request as a part of the collection run', function () {
            var error = testrun.io.thirdCall.args[0],
                request = testrun.io.thirdCall.args[4],
                response = testrun.io.thirdCall.args[3],
                trace = testrun.io.thirdCall.args[2];

            expect(error).to.be.null;

            expect(request.url.toString()).to.eql('https://postman-echo.com/get');
            expect(response).to.have.property('code', 200);

            expect(trace).to.deep.include({
                type: 'http',
                source: 'collection'
            });
        });

        it('should have run two tests', function () {
            expect(testrun).to.nested.include({
                'assertion.calledTwice': true
            });
        });

        it('should ensure that the first response was provided to the test script', function () {
            var assertion = testrun.assertion.firstCall.args[1][0];

            expect(assertion).to.deep.include({
                name: testname1,
                skipped: false,
                passed: true,
                error: null,
                index: 0
            });
        });

        it('should ensure that the second response was provided to the test script', function () {
            var assertion = testrun.assertion.secondCall.args[1][0];

            expect(assertion).to.deep.include({
                name: testname2,
                skipped: false,
                passed: true,
                error: null,
                index: 1
            });
        });

        it('should have completed the run', function() {
            expect(testrun).to.be.ok;
            expect(testrun.done.getCall(0).args[0]).to.be.null;
            expect(testrun).to.nested.include({
                'done.calledOnce': true,
                'start.calledOnce': true
            });
        });
    });

    describe('with invalid urls', function () {
        var testrun;

        before(function(done) {
            this.run({
                collection: {
                    item: {
                        // ensure that we run something for test and pre-req scripts
                        event: [{
                            listen: 'prerequest',
                            script: {
                                exec: `
                                pm.sendRequest({}, function(err, _response) {
                                    pm.test('request did not complete', function () {
                                        pm.expect(err).to.not.eql(null);
                                        pm.expect(_response).to.not.be.ok;
                                    });
                                });
                                `
                            }
                        }],
                        request: 'https://postman-echo.com/get'
                    }
                }
            }, function(err, results) {
                testrun = results;
                done(err);
            });
        });

        it('should have called io event twice', function () {
            expect(testrun).to.nested.include({
                'io.callCount': 2
            });
        });

        it('should have called request event twice', function () {
            expect(testrun).to.nested.include({
                'request.callCount': 2
            });
        });

        it('should have provided the error to the sandbox sendrequest function', function () {
            var assertion = testrun.assertion.firstCall.args[1][0];

            expect(assertion).to.deep.include({
                name: 'request did not complete',
                skipped: false,
                passed: true,
                error: null,
                index: 0
            });
        });

        it('should have sent the second request as a part of the collection run', function () {
            var error = testrun.io.secondCall.args[0],
                request = testrun.io.secondCall.args[4],
                response = testrun.io.secondCall.args[3],
                trace = testrun.io.secondCall.args[2];

            expect(error).to.be.null;

            expect(request.url.toString()).to.eql('https://postman-echo.com/get');
            expect(response).to.have.property('code', 200);

            expect(trace).to.deep.include({
                type: 'http',
                source: 'collection'
            });
        });

        it('should have completed the run', function() {
            expect(testrun).to.be.ok;
            expect(testrun.done.getCall(0).args[0]).to.be.null;
            expect(testrun).to.nested.include({
                'done.calledOnce': true,
                'start.calledOnce': true
            });
        });
    });

    describe('sending errors', function () {
        var testrun,
            sandboxRequestUrl = 'somenonexistentweirddomain.com/get?sandbox=true';

        before(function(done) {
            this.run({
                collection: {
                    item: {
                        // ensure that we run something for test and pre-req scripts
                        event: [{
                            listen: 'prerequest',
                            script: {
                                exec: `
                                var sdk = require('postman-collection'),
                                    myreq = new sdk.Request('${sandboxRequestUrl}');

                                pm.sendRequest(myreq, function(err, _response) {
                                    pm.test('request did not complete', function () {
                                        pm.expect(err).to.have.property('code', 'ENOTFOUND');
                                        pm.expect(_response).to.not.be.ok;
                                    });
                                });
                                `
                            }
                        }],
                        request: 'https://postman-echo.com/get'
                    }
                }
            }, function(err, results) {
                testrun = results;
                done(err);
            });
        });

        it('should have called io event twice', function () {
            expect(testrun).to.nested.include({
                'io.calledTwice': true
            });
        });

        it('should have called the request event twice', function () {
            expect(testrun).to.nested.include({
                'request.calledTwice': true
            });
        });

        it('should have the same cursor id for both the io events', function () {
            var ref = testrun.beforeItem.firstCall.args[1].ref;

            expect(testrun).to.have.property('io').that.nested.include({
                'firstCall.args[1].ref': ref,
                'secondCall.args[1].ref': ref
            });
        });

        it('should error out on the first request', function () {
            var error = testrun.io.firstCall.args[0],
                request = testrun.io.firstCall.args[4],
                response = testrun.io.firstCall.args[3],
                trace = testrun.io.firstCall.args[2];

            expect(error).to.be.ok;
            expect(error).to.have.property('code', 'ENOTFOUND');

            expect(request.url.toString()).to.eql(sandboxRequestUrl);
            expect(response).to.be.undefined;

            expect(trace).to.deep.include({
                type: 'http',
                source: 'script'
            });
        });

        it('should have provided the error to the sandbox sendrequest function', function () {
            var assertion = testrun.assertion.firstCall.args[1][0];

            expect(assertion).to.deep.include({
                name: 'request did not complete',
                skipped: false,
                passed: true,
                error: null,
                index: 0
            });
        });

        it('should have sent the second request as a part of the collection run', function () {
            var error = testrun.io.secondCall.args[0],
                request = testrun.io.secondCall.args[4],
                response = testrun.io.secondCall.args[3],
                trace = testrun.io.secondCall.args[2];

            expect(error).to.be.null;

            expect(request.url.toString()).to.eql('https://postman-echo.com/get');
            expect(response).to.have.property('code', 200);

            expect(trace).to.deep.include({
                type: 'http',
                source: 'collection'
            });
        });

        it('should have completed the run', function() {
            expect(testrun).to.be.ok;
            expect(testrun.done.getCall(0).args[0]).to.be.null;
            expect(testrun).to.nested.include({
                'done.calledOnce': true,
                'start.calledOnce': true
            });
        });
    });

    describe('with files', function () {
        var testrun;
        describe('in binary mode', function () {
            before(function (done) {
                this.run({
                    collection: {
                        item: {
                            // ensure that we run something for test and pre-req scripts
                            event: [{
                                listen: 'prerequest',
                                script: {
                                    exec: `
                                    var sdk = require('postman-collection'),
                                        myreq = new sdk.Request({
                                            url: 'https://postman-echo.com/post',
                                            method: 'POST',
                                            body: {
                                                mode: 'file',
                                                file: {src: 'test/fixtures/upload-file.json'}
                                            }
                                        });

                                    pm.sendRequest(myreq, function(err, _response) {
                                        pm.test('request was sent from sandbox', function () {
                                            pm.expect(_response).to.be.ok
                                        });
                                    });
                                    `
                                }
                            }],
                            request: {
                                url: 'https://postman-echo.com/get'
                            }
                        }
                    }
                }, function(err, results) {
                    testrun = results;
                    done(err);
                });
            });

            it('should send a warning', function () {
                var warning = testrun.console.firstCall;

                expect(testrun).to.be.ok;
                expect(warning.args[1]).to.eql('warn');
                expect(warning.args[2]).to.eql('uploading files from scripts is not allowed');
            });

            it('should not send file in body', function () {
                var response = testrun.io.firstCall.args[3];

                expect(response.json().data).to.be.empty;
            });
        });

        describe('in formdata', function () {
            before(function (done) {
                this.run({
                    collection: {
                        item: {
                            // ensure that we run something for test and pre-req scripts
                            event: [{
                                listen: 'prerequest',
                                script: {
                                    exec: `
                                    var sdk = require('postman-collection'),
                                        myreq = new sdk.Request({
                                            url: 'https://postman-echo.com/post',
                                            method: 'POST',
                                            body: {
                                                mode: 'formdata',
                                                formdata: [{
                                                    type: 'file',
                                                    key: 'foo',
                                                    src: 'test/fixtures/upload-file.json'
                                                }, {
                                                    type: 'text',
                                                    key: 'bar',
                                                    value: 'baz'
                                                }]
                                            }
                                        });

                                    pm.sendRequest(myreq, function(err, _response) {
                                        pm.test('request was sent from sandbox', function () {
                                            pm.expect(_response).to.be.ok
                                        });
                                    });
                                    `
                                }
                            }],
                            request: {
                                url: 'https://postman-echo.com/get'
                            }
                        }
                    }
                }, function(err, results) {
                    testrun = results;
                    done(err);
                });
            });

            it('should send a warning', function () {
                var warning = testrun.console.firstCall;

                expect(testrun).to.be.ok;
                expect(warning.args[1]).to.eql('warn');
                expect(warning.args[2]).to.eql('uploading files from scripts is not allowed');
            });

            it('should remove only file type params from formdata', function () {
                var response = testrun.io.firstCall.args[3];

                expect(response.json().files).to.be.empty;
                expect(response.json()).to.deep.include({
                    form: {bar: 'baz'}
                });
            });
        });
    });
});
