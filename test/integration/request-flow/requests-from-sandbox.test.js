var _ = require('lodash');

describe('requests from sandbox', function() {
    describe('sanity checks', function () {
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
            expect(testrun.io.calledTwice).to.be(true);
        });

        it('should have called the request event once', function () {
            expect(testrun.request.calledOnce).to.be(true);
        });

        it('should have the same cursor id for both the io events', function () {
            var ref = testrun.beforeItem.firstCall.args[1].ref;

            expect(testrun.io.firstCall.args[1].ref).to.eql(ref);
            expect(testrun.io.secondCall.args[1].ref).to.eql(ref);
        });

        it('should have sent the first request from inside the sandbox', function () {
            var error = testrun.io.firstCall.args[0],
                request = testrun.io.firstCall.args[4],
                response = testrun.io.firstCall.args[3],
                trace = testrun.io.firstCall.args[2];

            expect(error).to.be(null);

            expect(request.url.toString()).to.eql(sandboxRequestUrl);
            expect(response.code).to.eql(200);

            expect(trace).to.have.property('type', 'http');
            expect(trace).to.have.property('source', 'script');
            expect(trace).to.have.property('_request_id');
        });

        it('should have sent the second request as a part of the collection run', function () {
            var error = testrun.io.secondCall.args[0],
                request = testrun.io.secondCall.args[4],
                response = testrun.io.secondCall.args[3],
                trace = testrun.io.secondCall.args[2];

            expect(error).to.be(null);

            expect(request.url.toString()).to.eql('https://postman-echo.com/get');
            expect(response.code).to.eql(200);

            expect(trace).to.have.property('type', 'http');
            expect(trace).to.have.property('source', 'collection');
        });

        it('should have provided the response to the sandbox sendrequest function', function () {
            var assertion = testrun.assertion.firstCall.args[1];

            expect(assertion).to.have.property('name', 'request was sent from sandbox');
            expect(assertion).to.have.property('skipped', false);
            expect(assertion).to.have.property('passed', true);
            expect(assertion).to.have.property('error', null);
            expect(assertion).to.have.property('index', 0);
        });

        it('must have completed the run', function() {
            expect(testrun).be.ok();
            expect(testrun.done.calledOnce).be.ok();
            expect(testrun.done.getCall(0).args[0]).to.be(null);
            expect(testrun.start.calledOnce).be.ok();
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
            expect(testrun.io.calledThrice).to.be(true);
        });

        it('should have called the request event once', function () {
            expect(testrun.request.calledOnce).to.be(true);
        });

        it('should have the same cursor id for all the io events', function () {
            var ref = testrun.beforeItem.firstCall.args[1].ref;

            expect(testrun.io.firstCall.args[1].ref).to.eql(ref);
            expect(testrun.io.secondCall.args[1].ref).to.eql(ref);
            expect(testrun.io.thirdCall.args[1].ref).to.eql(ref);
        });

        it('should have sent the first request from inside the sandbox', function () {
            var error = testrun.io.firstCall.args[0],
                request = testrun.io.firstCall.args[4],
                response = testrun.io.firstCall.args[3],
                trace = testrun.io.firstCall.args[2];

            expect(error).to.be(null);

            expect(request.url.toString()).to.eql(sandboxRequestUrl1);
            expect(response.code).to.eql(200);

            expect(trace).to.have.property('type', 'http');
            expect(trace).to.have.property('source', 'script');
        });

        it('should have sent the second request from inside the sandbox too', function () {
            var error = testrun.io.secondCall.args[0],
                request = testrun.io.secondCall.args[4],
                response = testrun.io.secondCall.args[3],
                trace = testrun.io.secondCall.args[2];

            expect(error).to.be(null);

            expect(request.url.toString()).to.eql(sandboxRequestUrl2);
            expect(response.code).to.eql(200);

            expect(trace).to.have.property('type', 'http');
            expect(trace).to.have.property('source', 'script');
        });

        it('should have sent the third request as a part of the collection run', function () {
            var error = testrun.io.thirdCall.args[0],
                request = testrun.io.thirdCall.args[4],
                response = testrun.io.thirdCall.args[3],
                trace = testrun.io.thirdCall.args[2];

            expect(error).to.be(null);

            expect(request.url.toString()).to.eql('https://postman-echo.com/get');
            expect(response.code).to.eql(200);

            expect(trace).to.have.property('type', 'http');
            expect(trace).to.have.property('source', 'collection');
        });

        it('should have run two tests', function () {
            expect(testrun.assertion.calledTwice).to.be(true);
        });

        it('should ensure that the first response was provided to the test script', function () {
            var assertion = testrun.assertion.firstCall.args[1];

            expect(assertion).to.have.property('name', testname1);
            expect(assertion).to.have.property('skipped', false);
            expect(assertion).to.have.property('passed', true);
            expect(assertion).to.have.property('error', null);
            expect(assertion).to.have.property('index', 0);
        });

        it('should ensure that the second response was provided to the test script', function () {
            var assertion = testrun.assertion.secondCall.args[1];

            expect(assertion).to.have.property('name', testname2);
            expect(assertion).to.have.property('skipped', false);
            expect(assertion).to.have.property('passed', true);
            expect(assertion).to.have.property('error', null);
            expect(assertion).to.have.property('index', 1);
        });

        it('should propagate unique request id in `_request_id`', function () {
            var i = 0,
                requestIds = [];

            for (i = 0; i < testrun.io.callCount; i++) {
                requestIds.push(testrun.io.getCall(i).args[2]._request_id);
            }

            expect(_.uniq(requestIds)).to.have.length(testrun.io.callCount);
        });

        it('must have completed the run', function() {
            expect(testrun).be.ok();
            expect(testrun.done.calledOnce).be.ok();
            expect(testrun.done.getCall(0).args[0]).to.be(null);
            expect(testrun.start.calledOnce).be.ok();
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
            expect(testrun.io.calledTwice).to.be(true);
        });

        it('should have called the request event once', function () {
            expect(testrun.request.calledOnce).to.be(true);
        });

        it('should have the same cursor id for both the io events', function () {
            var ref = testrun.beforeItem.firstCall.args[1].ref;

            expect(testrun.io.firstCall.args[1].ref).to.eql(ref);
            expect(testrun.io.secondCall.args[1].ref).to.eql(ref);
        });

        it('should error out on the first request', function () {
            var error = testrun.io.firstCall.args[0],
                request = testrun.io.firstCall.args[4],
                response = testrun.io.firstCall.args[3],
                trace = testrun.io.firstCall.args[2];

            expect(error).to.be.ok();
            expect(error).to.have.property('code', 'ENOTFOUND');

            expect(request.url.toString()).to.eql(sandboxRequestUrl);
            expect(response).to.be(undefined);

            expect(trace).to.have.property('type', 'http');
            expect(trace).to.have.property('source', 'script');
        });

        it('should have provided the error to the sandbox sendrequest function', function () {
            var assertion = testrun.assertion.firstCall.args[1];

            expect(assertion).to.have.property('name', 'request did not complete');
            expect(assertion).to.have.property('skipped', false);
            expect(assertion).to.have.property('passed', true);
            expect(assertion).to.have.property('error', null);
            expect(assertion).to.have.property('index', 0);
        });

        it('should have sent the second request as a part of the collection run', function () {
            var error = testrun.io.secondCall.args[0],
                request = testrun.io.secondCall.args[4],
                response = testrun.io.secondCall.args[3],
                trace = testrun.io.secondCall.args[2];

            expect(error).to.be(null);

            expect(request.url.toString()).to.eql('https://postman-echo.com/get');
            expect(response.code).to.eql(200);

            expect(trace).to.have.property('type', 'http');
            expect(trace).to.have.property('source', 'collection');
        });

        it('must have completed the run', function() {
            expect(testrun).be.ok();
            expect(testrun.done.calledOnce).be.ok();
            expect(testrun.done.getCall(0).args[0]).to.be(null);
            expect(testrun.start.calledOnce).be.ok();
        });
    });
});
