var expect = require('chai').expect,
    sinon = require('sinon');

describe('sandbox library - chai-postman', function () {
    var testrun;

    describe('json schema assertions', function () {
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
                                var schema = {
                                    properties: {
                                        alpha: {
                                            type: 'boolean'
                                        }
                                    }
                                };

                                pm.test("0: valid schema", function () {
                                    pm.expect({alpha: true}).to.be.jsonSchema(schema);
                                    pm.expect('POSTMAN').to.be.jsonSchema({"type": "string"});
                                });

                                pm.test("1: negated assertions", function () {
                                    pm.expect({alpha: 123}).to.not.be.jsonSchema(schema);
                                    pm.expect(123).to.not.be.jsonSchema({"type": "string"});
                                });

                                pm.test("2: incorrect assertions", function () {
                                    pm.expect({alpha: 123}).to.be.jsonSchema(schema);
                                    pm.expect(123).to.be.jsonSchema({"type": "string"});
                                });

                                pm.test("3: incorrect negated assertions", function () {
                                    pm.expect({alpha: true}).to.not.be.jsonSchema(schema);
                                    pm.expect('POSTMAN').to.not.be.jsonSchema({"type": "string"});
                                });

                                pm.test("4: pm.response.to", function () {
                                    pm.response.to.have.jsonSchema({
                                        properties: {
                                            url: {
                                                type: 'string'
                                            }
                                        }
                                    });
                                });

                                pm.test("5: pm.response.to.not", function () {
                                    pm.response.to.not.have.jsonSchema({
                                        properties: {
                                            url: {
                                                type: 'number'
                                            }
                                        }
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
            sinon.assert.calledOnce(testrun.script);
            sinon.assert.calledWith(testrun.script.getCall(0), null);

            sinon.assert.calledOnce(testrun.test);
            sinon.assert.calledWith(testrun.script.getCall(0), null);

            sinon.assert.callCount(testrun.assertion, 6);

            expect(testrun.assertion.getCall(0).args[1]).to.eql([{
                error: null,
                index: 0,
                passed: true,
                skipped: false,
                name: '0: valid schema'
            }]);

            expect(testrun.assertion.getCall(1).args[1]).to.eql([{
                error: null,
                index: 1,
                passed: true,
                skipped: false,
                name: '1: negated assertions'
            }]);

            expect(testrun.assertion.getCall(2).args[1]).to.have.lengthOf(1);
            expect(testrun.assertion.getCall(2).args[1][0]).to.include({
                index: 2,
                passed: false,
                skipped: false,
                name: '2: incorrect assertions'
            });
            expect(testrun.assertion.getCall(2).args[1][0]).to.have.property('error').that.include({
                name: 'AssertionError',
                message: 'expected data to satisfy schema but found following errors: \ndata.alpha should be boolean',
                showDiff: true,
                actual: false,
                expected: true
            });

            expect(testrun.assertion.getCall(3).args[1]).to.have.lengthOf(1);
            expect(testrun.assertion.getCall(3).args[1][0]).to.include({
                index: 3,
                passed: false,
                skipped: false,
                name: '3: incorrect negated assertions'
            });
            expect(testrun.assertion.getCall(3).args[1][0]).to.have.property('error').that.include({
                name: 'AssertionError',
                message: 'expected data to not satisfy schema',
                showDiff: true,
                actual: true,
                expected: true
            });

            expect(testrun.assertion.getCall(4).args[1]).to.eql([{
                error: null,
                index: 4,
                passed: true,
                skipped: false,
                name: '4: pm.response.to'
            }]);

            expect(testrun.assertion.getCall(5).args[1]).to.eql([{
                error: null,
                index: 5,
                passed: true,
                skipped: false,
                name: '5: pm.response.to.not'
            }]);
        });
    });
});
