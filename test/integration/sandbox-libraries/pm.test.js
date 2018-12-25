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

            expect(testrun.assertion.getCall(0).args[1]).to.eql([{
                error: null,
                index: 0,
                passed: true,
                skipped: false,
                name: 'pre-assert request'
            }]);

            expect(testrun.assertion.getCall(1).args[1]).to.eql([{
                error: null,
                index: 1,
                passed: true,
                skipped: false,
                name: 'pre-assert response'
            }]);
        });
    });
});
