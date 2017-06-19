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
});
