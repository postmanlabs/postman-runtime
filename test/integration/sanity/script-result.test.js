var sdk = require('postman-collection'),
    expect = require('chai').expect;

describe('script result format', function () {
    describe('sanity checks', function () {
        var testrun;

        before(function (done) {
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
            }, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        it('should have sent the request successfully', function () {
            expect(testrun).to.be.ok;
            expect(testrun).to.nested.include({
                'request.calledOnce': true
            });

            expect(testrun.request.getCall(0).args[0]).to.be.null;
        });

        it('should have triggered the script event twice', function () {
            expect(testrun).to.nested.include({
                'script.calledTwice': true
            });
        });

        it('should have set the right targets in the result', function () {
            var prerequest = testrun.script.firstCall.args[2],
                test = testrun.script.secondCall.args[2];

            expect(prerequest).to.have.property('target', 'prerequest');
            expect(test).to.have.property('target', 'test');
        });

        it('should have provided variable-scope objects in the events', function () {
            var prerequest = testrun.script.firstCall.args[2],
                test = testrun.script.secondCall.args[2];

            expect(sdk.VariableScope.isVariableScope(prerequest.environment)).to.be.true;
            expect(sdk.VariableScope.isVariableScope(prerequest.globals)).to.be.true;

            expect(sdk.VariableScope.isVariableScope(test.environment)).to.be.true;
            expect(sdk.VariableScope.isVariableScope(test.globals)).to.be.true;
        });

        it('should have request in the result object', function () {
            var prerequest = testrun.script.firstCall.args[2],
                test = testrun.script.secondCall.args[2];

            expect(sdk.Request.isRequest(prerequest.request)).to.be.true;
            expect(sdk.Request.isRequest(test.request)).to.be.true;
        });

        it('should have the cursor in the result', function () {
            var prerequest = testrun.script.firstCall.args[2],
                test = testrun.script.secondCall.args[2];

            expect(prerequest).to.have.property('cursor').that.is.an('object');
            expect(test).to.have.property('cursor').that.is.an('object');
        });

        it('should have data variables in the result', function () {
            var prerequest = testrun.script.firstCall.args[2],
                test = testrun.script.secondCall.args[2];

            expect(prerequest).to.have.property('data');
            expect(test).to.have.property('data');

            expect(prerequest).to.have.deep.property('data', {});
            expect(test).to.have.deep.property('data', {});
        });

        (typeof window === 'undefined' ? it : it.skip)('should have cookies in the result', function () {
            var prerequest = testrun.script.firstCall.args[2],
                test = testrun.script.secondCall.args[2];

            expect(prerequest).to.have.property('cookies');
            expect(test).to.have.property('cookies');

            expect(prerequest.cookies).to.eql([]); // @todo - should this be present in the pre-request script?

            // the test script must have a cookie
            expect(test).to.have.property('cookies').that.is.an('array').that.has.lengthOf(1);
        });

        it('should have empty return object', function () {
            var prerequest = testrun.script.firstCall.args[2],
                test = testrun.script.secondCall.args[2];

            expect(prerequest).to.have.deep.property('return', {async: false});
            expect(test).to.have.deep.property('return', {async: false});
        });

        it('should have a response in the test script result', function () {
            var test = testrun.script.secondCall.args[2];

            expect(test).to.have.property('response');

            expect(sdk.Response.isResponse(test.response)).to.be.true;
        });

        it('should have completed the run', function () {
            expect(testrun).to.be.ok;
            expect(testrun.done.getCall(0).args[0]).to.be.null;
            expect(testrun).to.nested.include({
                'done.calledOnce': true,
                'start.calledOnce': true
            });
        });
    });

    describe('next request in pre-request script', function () {
        var testrun;

        before(function (done) {
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
            }, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        it('should have sent the request successfully', function () {
            expect(testrun).to.be.ok;
            expect(testrun).to.nested.include({
                'request.calledOnce': true
            });

            expect(testrun.request.getCall(0).args[0]).to.be.null;
        });

        it('should have triggered the script event once', function () {
            expect(testrun).to.nested.include({
                'script.calledOnce': true
            });
        });

        it('should have a return object in the pre-request result', function () {
            var prerequest = testrun.script.firstCall.args[2];

            expect(prerequest.return).to.be.ok;
            expect(prerequest).to.have.nested.property('return.nextRequest', 'some-req-name');
        });

        it('should have completed the run', function () {
            expect(testrun).to.be.ok;
            expect(testrun.done.getCall(0).args[0]).to.be.null;
            expect(testrun).to.nested.include({
                'done.calledOnce': true,
                'start.calledOnce': true
            });
        });
    });
});
