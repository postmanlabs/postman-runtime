var expect = require('chai').expect;

describe('assertions', function () {
    describe('from `pm.test`', function () {
        var testrun;

        before(function (done) {
            this.run({
                stopOnFailure: true,
                collection: {
                    item: {
                        request: 'https://postman-echo.com/get?testvar={{testVar}}',
                        event: [{
                            listen: 'test',
                            script: [`"use sandbox2";
                                pm.test('response body must be json', function () {
                                    pm.expect(pm.response.json()).to.be.an('object');
                                });
                                pm.test('this test will force fail', function () {
                                    throw new Error('I am an error!');
                                });
                            `]
                        }]
                    }
                },
                environment: {
                    values: [{key: 'testVar', value: 'test-var-value'}]
                }
            }, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        it('should have started and completed the test run', function () {
            expect(testrun).to.be.ok;
            expect(testrun).to.nested.include({
                'start.calledOnce': true,
                'request.calledOnce': true,
                'script.calledOnce': true,
                'assertion.calledTwice': true,
                'test.calledOnce': true,
                'done.calledOnce': true
            });
        });

        it('should receive response with the query param sent', function () {
            var response = testrun.request.getCall(0).args[2];

            expect(testrun).to.nested.include({ // one request
                'request.calledOnce': true
            });
            expect(response.json()).to.be.ok;
            expect(response.json().args).to.be.ok;
            expect(response.json()).to.nested.include({
                'args.testvar': 'test-var-value'
            });
        });

        it('should have bubbled error to `script` callback', function () {
            expect(testrun.script.getCall(0).args[0]).to.be.ok;
            expect(testrun.script.getCall(0).args[0]).have.property('message', 'this test will force fail');
        });

        it('should bubble up assertion', function () {
            expect(testrun.assertion.getCall(0).args[1][0]).to.deep.include({
                passed: true,
                error: null
            });
            expect(testrun.assertion.getCall(1).args[1][0]).to.nested.include({
                passed: false,
                'error.name': 'Error',
                'error.message': 'I am an error!'
            });
        });
    });

    describe('from legacy `tests`', function () {
        var testrun;

        before(function (done) {
            this.run({
                stopOnFailure: true,
                collection: {
                    item: {
                        request: 'https://postman-echo.com/get',
                        event: [{
                            listen: 'test',
                            script: [`
                                tests['pass'] = true;
                                tests['fail'] = false;
                            `]
                        }]
                    }
                }
            }, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        it('should have started and completed the test run', function () {
            expect(testrun).to.be.ok;
            expect(testrun).to.nested.include({
                'start.calledOnce': true,
                'request.calledOnce': true,
                'script.calledOnce': true,
                'assertion.callCount': 1,
                'test.calledOnce': true,
                'done.calledOnce': true
            });
        });

        it('should have bubbled error to `script` callback', function () {
            expect(testrun.script.getCall(0).args[0]).to.be.ok;
            expect(testrun.script.getCall(0).args[0]).have.property('message', 'fail');
        });

        it('should bubble up assertion', function () {
            expect(testrun.assertion.getCall(0).args[1][0]).to.deep.include({
                passed: true,
                error: null
            });
            expect(testrun.assertion.getCall(0).args[1][1]).to.nested.include({
                passed: false,
                'error.name': 'AssertionError',
                'error.message': 'expected false to be truthy'
            });
        });
    });
});
