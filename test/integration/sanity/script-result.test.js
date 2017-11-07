var sdk = require('postman-collection');

describe('script result format', function() {
    describe('sanity checks', function () {
        var testrun;

        before(function(done) {
            this.run({
                requester: {followRedirects: false},
                collection: {
                    item: {
                        // ensure that we run something for test and pre-req scripts
                        event: [{
                            listen: 'prerequest',
                            script: {exec: ';'}
                        }, {
                            listen: 'test',
                            script: {exec: 'tests.worked = true;'}
                        }],
                        request: 'https://postman-echo.com/get'
                    }
                }
            }, function(err, results) {
                testrun = results;
                done(err);
            });
        });

        it('must have sent the request successfully', function() {
            expect(testrun).be.ok();
            expect(testrun.request.calledOnce).be.ok();

            expect(testrun.request.getCall(0).args[0]).to.be(null);
        });

        it('must have triggered the script event twice', function () {
            expect(testrun.script.calledTwice).to.be.ok();
        });

        it('must have set the right targets in the result', function () {
            var prerequest = testrun.script.firstCall.args[2],
                test = testrun.script.secondCall.args[2];

            expect(prerequest.target).to.be('prerequest');
            expect(test.target).to.be('test');
        });

        it('must have provided variable-scope objects in the events', function () {
            var prerequest = testrun.script.firstCall.args[2],
                test = testrun.script.secondCall.args[2];

            expect(sdk.VariableScope.isVariableScope(prerequest.environment)).to.be(true);
            expect(sdk.VariableScope.isVariableScope(prerequest.globals)).to.be(true);

            expect(sdk.VariableScope.isVariableScope(test.environment)).to.be(true);
            expect(sdk.VariableScope.isVariableScope(test.globals)).to.be(true);
        });

        it('must have request in the result object', function () {
            var prerequest = testrun.script.firstCall.args[2],
                test = testrun.script.secondCall.args[2];

            expect(sdk.Request.isRequest(prerequest.request)).to.be(true);
            expect(sdk.Request.isRequest(test.request)).to.be(true);
        });

        it('must have the cursor in the result', function () {
            var prerequest = testrun.script.firstCall.args[2],
                test = testrun.script.secondCall.args[2];

            expect(prerequest).to.have.property('cursor');
            expect(test).to.have.property('cursor');

            expect(prerequest.cursor).to.be.an('object');
            expect(test.cursor).to.be.an('object');
        });

        it('must have data variables in the result', function () {
            var prerequest = testrun.script.firstCall.args[2],
                test = testrun.script.secondCall.args[2];

            expect(prerequest).to.have.property('data');
            expect(test).to.have.property('data');

            expect(prerequest.data).to.eql({});
            expect(test.data).to.eql({});
        });

        it('must have cookies in the result', function () {
            var prerequest = testrun.script.firstCall.args[2],
                test = testrun.script.secondCall.args[2];

            expect(prerequest).to.have.property('cookies');
            expect(test).to.have.property('cookies');

            expect(prerequest.cookies).to.eql([]); // @todo - should this be present in the pre-request script?

            // the test script must have a cookie
            expect(test.cookies).to.be.an('array');
            expect(test.cookies).to.have.length(1);
        });

        it('must have empty return object', function () {
            var prerequest = testrun.script.firstCall.args[2],
                test = testrun.script.secondCall.args[2];

            expect(prerequest.return).to.eql({async: false});
            expect(test.return).to.eql({async: false});
        });

        it('must have a response in the test script result', function () {
            var test = testrun.script.secondCall.args[2];

            expect(test).to.have.property('response');

            expect(sdk.Response.isResponse(test.response)).to.be(true);
        });

        it('must have completed the run', function() {
            expect(testrun).be.ok();
            expect(testrun.done.calledOnce).be.ok();
            expect(testrun.done.getCall(0).args[0]).to.be(null);
            expect(testrun.start.calledOnce).be.ok();
        });
    });

    describe('next request in pre-request script', function () {
        var testrun;

        before(function(done) {
            this.run({
                requester: {followRedirects: false},
                collection: {
                    item: {
                        // ensure that we run something for test and pre-req scripts
                        event: [{
                            listen: 'prerequest',
                            script: {exec: 'postman.setNextRequest("some-req-name");'}
                        }],
                        request: 'https://postman-echo.com/get'
                    }
                }
            }, function(err, results) {
                testrun = results;
                done(err);
            });
        });

        it('must have sent the request successfully', function() {
            expect(testrun).be.ok();
            expect(testrun.request.calledOnce).be.ok();

            expect(testrun.request.getCall(0).args[0]).to.be(null);
        });

        it('must have triggered the script event once', function () {
            expect(testrun.script.calledOnce).to.be.ok();
        });

        it('must have a return object in the pre-request result', function () {
            var prerequest = testrun.script.firstCall.args[2];

            expect(prerequest.return).to.be.ok();
            expect(prerequest.return).to.have.property('nextRequest', 'some-req-name');
        });

        it('must have completed the run', function() {
            expect(testrun).be.ok();
            expect(testrun.done.calledOnce).be.ok();
            expect(testrun.done.getCall(0).args[0]).to.be(null);
            expect(testrun.start.calledOnce).be.ok();
        });
    });
});
