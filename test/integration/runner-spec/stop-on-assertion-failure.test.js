var expect = require('chai').expect;

describe('Stop on assertion failure', function () {
    describe('with stopOnAssertionFailure: true', function () {
        describe('should stop on assertion failures', function () {
            var testrun;

            before(function (done) {
                this.run({
                    stopOnAssertionFailure: true,
                    collection: {
                        item: [{
                            name: 'First Request',
                            event: [{
                                listen: 'test',
                                script: {
                                    exec: [
                                        'pm.test("This test will pass", function () {',
                                        '    pm.expect(pm.response.code).to.equal(200);',
                                        '});',
                                        'pm.test("This test will fail", function () {',
                                        '    pm.expect(pm.response.code).to.equal(404);',
                                        '});'
                                    ]
                                }
                            }],
                            request: {
                                url: 'https://postman-echo.com/get',
                                method: 'GET'
                            }
                        }, {
                            name: 'Second Request',
                            event: [{
                                listen: 'test',
                                script: {
                                    exec: [
                                        'pm.test("This should not run", function () {',
                                        '    pm.expect(pm.response.code).to.equal(200);',
                                        '});'
                                    ]
                                }
                            }],
                            request: {
                                url: 'https://postman-echo.com/get',
                                method: 'GET'
                            }
                        }]
                    }
                }, function (err, results) {
                    testrun = results;
                    done(err);
                });
            });

            it('should have completed the run', function () {
                expect(testrun).to.be.ok;
                expect(testrun.done.getCall(0).args[0]).to.be.null;
                expect(testrun).to.nested.include({
                    'done.calledOnce': true,
                    'start.calledOnce': true
                });
            });

            it('should gracefully stop the run on assertion failures', function () {
                expect(testrun).to.nested.include({
                    'item.calledOnce': true,
                    'request.calledOnce': true,
                    'test.calledOnce': true,
                    'iteration.calledOnce': true
                });

                // Second request should not have been executed
                expect(testrun.request.callCount).to.equal(1);
            });

            it('should have assertion failures', function () {
                expect(testrun.assertion.callCount).to.be.at.least(2);

                // Check if any assertion call has a failed assertion
                var hasFailedAssertion = testrun.assertion.args.some(function (args) {
                    return args[1] && args[1].some(function (assertion) {
                        return assertion && assertion.passed === false;
                    });
                });

                expect(hasFailedAssertion).to.be.true;
            });
        });

        describe('should stop on legacy tests assertion failures', function () {
            var testrun;

            before(function (done) {
                this.run({
                    stopOnAssertionFailure: true,
                    collection: {
                        item: [{
                            name: 'First Request',
                            event: [{
                                listen: 'test',
                                script: {
                                    exec: [
                                        'tests["Body contains headers"] = responseBody.has("headers");',
                                        'tests["Body contains args"] = responseBody.has("args");',
                                        'tests["fail"] = false;' // This will cause an assertion failure
                                    ]
                                }
                            }],
                            request: {
                                url: 'https://postman-echo.com/get',
                                method: 'GET'
                            }
                        }, {
                            name: 'Second Request',
                            event: [{
                                listen: 'test',
                                script: {
                                    exec: [
                                        'tests["should not run"] = true;'
                                    ]
                                }
                            }],
                            request: {
                                url: 'https://postman-echo.com/get',
                                method: 'GET'
                            }
                        }]
                    }
                }, function (err, results) {
                    testrun = results;
                    done(err);
                });
            });

            it('should have completed the run', function () {
                expect(testrun).to.be.ok;
                expect(testrun.done.getCall(0).args[0]).to.be.null;
                expect(testrun).to.nested.include({
                    'done.calledOnce': true,
                    'start.calledOnce': true
                });
            });

            it('should gracefully stop the run on assertion failures', function () {
                expect(testrun).to.nested.include({
                    'item.calledOnce': true,
                    'request.calledOnce': true,
                    'test.calledOnce': true,
                    'iteration.calledOnce': true
                });

                // Second request should not have been executed
                expect(testrun.request.callCount).to.equal(1);
            });
        });

        describe('should NOT stop on script execution errors', function () {
            var testrun;

            before(function (done) {
                this.run({
                    stopOnAssertionFailure: true,
                    collection: {
                        item: [{
                            name: 'First Request',
                            event: [{
                                listen: 'test',
                                script: {
                                    exec: [
                                        'console.log(foo);' // deliberate reference error
                                    ]
                                }
                            }],
                            request: {
                                url: 'https://postman-echo.com/get',
                                method: 'GET'
                            }
                        }, {
                            name: 'Second Request',
                            event: [{
                                listen: 'test',
                                script: {
                                    exec: [
                                        'pm.test("This should run", function () {',
                                        '    pm.expect(pm.response.code).to.equal(200);',
                                        '});'
                                    ]
                                }
                            }],
                            request: {
                                url: 'https://postman-echo.com/get',
                                method: 'GET'
                            }
                        }]
                    }
                }, function (err, results) {
                    testrun = results;
                    done(err);
                });
            });

            it('should have completed the run', function () {
                expect(testrun).to.be.ok;
                expect(testrun.done.getCall(0).args[0]).to.be.null;
                expect(testrun).to.nested.include({
                    'done.calledOnce': true,
                    'start.calledOnce': true
                });
            });

            it('should NOT stop the run on script execution errors', function () {
                // Both requests should have been executed
                expect(testrun.request.callCount).to.equal(2);
                expect(testrun.item.callCount).to.equal(2);
            });

            it('should have script error in first request', function () {
                expect(testrun.script.getCall(0).args[0]).to.be.ok;
                expect(testrun.script.getCall(0).args[0]).to.have.property('message');
            });
        });

        describe('should stop on assertion failures with multiple iterations', function () {
            var testrun;

            before(function (done) {
                this.run({
                    stopOnAssertionFailure: true,
                    iterationCount: 3,
                    collection: {
                        item: [{
                            name: 'First Request',
                            event: [{
                                listen: 'test',
                                script: {
                                    exec: [
                                        'pm.test("This test will pass", function () {',
                                        '    pm.expect(pm.response.code).to.equal(200);',
                                        '});',
                                        'if (iteration === 1) {',
                                        '    pm.test("This test will fail", function () {',
                                        '        pm.expect(pm.response.code).to.equal(404);',
                                        '    });',
                                        '}'
                                    ]
                                }
                            }],
                            request: {
                                url: 'https://postman-echo.com/get',
                                method: 'GET'
                            }
                        }, {
                            name: 'Second Request',
                            event: [{
                                listen: 'test',
                                script: {
                                    exec: [
                                        'pm.test("This should not run in iteration 1", function () {',
                                        '    pm.expect(pm.response.code).to.equal(200);',
                                        '});'
                                    ]
                                }
                            }],
                            request: {
                                url: 'https://postman-echo.com/get',
                                method: 'GET'
                            }
                        }]
                    }
                }, function (err, results) {
                    testrun = results;
                    done(err);
                });
            });

            it('should have completed the run', function () {
                expect(testrun).to.be.ok;
                expect(testrun.done.getCall(0).args[0]).to.be.null;
                expect(testrun).to.nested.include({
                    'done.calledOnce': true,
                    'start.calledOnce': true
                });
            });

            it('should stop on assertion failure in iteration 1', function () {
                // First iteration: both requests should run
                // Second iteration: first request fails, second should not run
                // Third iteration: should not run at all
                expect(testrun.request.callCount).to.be.at.least(2);
                expect(testrun.request.callCount).to.be.lessThan(6); // Less than 3 iterations * 2 requests
            });
        });
    });

    describe('with stopOnAssertionFailure: false', function () {
        describe('should NOT stop on assertion failures', function () {
            var testrun;

            before(function (done) {
                this.run({
                    stopOnAssertionFailure: false,
                    collection: {
                        item: [{
                            name: 'First Request',
                            event: [{
                                listen: 'test',
                                script: {
                                    exec: [
                                        'pm.test("This test will fail", function () {',
                                        '    pm.expect(pm.response.code).to.equal(404);',
                                        '});'
                                    ]
                                }
                            }],
                            request: {
                                url: 'https://postman-echo.com/get',
                                method: 'GET'
                            }
                        }, {
                            name: 'Second Request',
                            event: [{
                                listen: 'test',
                                script: {
                                    exec: [
                                        'pm.test("This should run", function () {',
                                        '    pm.expect(pm.response.code).to.equal(200);',
                                        '});'
                                    ]
                                }
                            }],
                            request: {
                                url: 'https://postman-echo.com/get',
                                method: 'GET'
                            }
                        }]
                    }
                }, function (err, results) {
                    testrun = results;
                    done(err);
                });
            });

            it('should have completed the run', function () {
                expect(testrun).to.be.ok;
                expect(testrun.done.getCall(0).args[0]).to.be.null;
                expect(testrun).to.nested.include({
                    'done.calledOnce': true,
                    'start.calledOnce': true
                });
            });

            it('should NOT stop the run on assertion failures', function () {
                // Both requests should have been executed
                expect(testrun.request.callCount).to.equal(2);
                expect(testrun.item.callCount).to.equal(2);
            });
        });
    });
});

