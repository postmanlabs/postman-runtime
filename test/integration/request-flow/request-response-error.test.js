var expect = require('chai').expect,
    sinon = require('sinon'),
    server = require('../../fixtures/server');

describe('Response callback with error', function () {
    var responseErrorServer = server.createResponseErrorServer();

    before(function (done) {
        responseErrorServer.listen(0, done);
    });

    after(function (done) {
        responseErrorServer.destroy(done);
    });

    describe('in request', function () {
        var testrun;

        before(function (done) {
            this.run({
                collection: {
                    item: [{
                        request: {
                            url: 'http://postman-echo.com',
                            method: 'GET',
                            header: [{
                                key: 'Invalid Header Name ', // contains space at the end
                                value: 'value1'
                            }]
                        }
                    }]
                },
                requester: {
                    verbose: true
                }
            }, function (err, result) {
                testrun = result;
                done(err);
            });
        });

        it('should complete the run', function () {
            expect(testrun).to.be.ok;
            sinon.assert.calledOnce(testrun.start);
            sinon.assert.calledOnce(testrun.done);
            sinon.assert.calledWith(testrun.done.getCall(0), null);
        });

        it('should not contain sessions', function () {
            sinon.assert.calledOnce(testrun.request);
            sinon.assert.calledOnce(testrun.response);

            expect(testrun.request.getCall(0).lastArg.execution.sessions).to.be.empty;
        });
    });

    describe('in response', function () {
        var testrun;

        before(function (done) {
            this.run({
                collection: {
                    item: [{
                        request: {
                            url: responseErrorServer.url,
                            method: 'GET'
                        }
                    }]
                },
                requester: {
                    verbose: true
                }
            }, function (err, result) {
                testrun = result;
                done(err);
            });
        });

        it('should complete the run', function () {
            expect(testrun).to.be.ok;
            sinon.assert.calledOnce(testrun.start);
            sinon.assert.calledOnce(testrun.done);
            sinon.assert.calledWith(testrun.done.getCall(0), null);
        });

        it('should contain sessions', function () {
            sinon.assert.calledOnce(testrun.request);
            sinon.assert.calledOnce(testrun.response);

            expect(testrun.request.getCall(0).lastArg.execution.sessions).to.not.be.empty;
        });
    });
});
