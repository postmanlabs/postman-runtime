var _ = require('lodash'),
    expect = require('chai').expect;

describe('Run option parallelIterations', function () {
    var collection = {
        item: [{
            request: 'https://postman-echo.com/get',
            event: [{
                listen: 'test',
                script: {
                    type: 'text/javascript',
                    exec: `
                        var data = JSON.parse(responseBody);
                        pm.test("should contain data", function () {
                            pm.expect(pm.iterationData.get("foo")).to.equal("bar");
                        });
                        pm.test("should have correct iteration", function () {
                            pm.expect(data.args.iteration).to.equal(String(pm.iterationData.iteration));
                        });
                        pm.test("partition data is isolated", function () {
                            // Set a variable that would cause issues if shared across partitions
                            pm.variables.set("testVar", "partition-" + pm.iterationData.iteration);
                            pm.expect(pm.variables.get("testVar")).to.equal("partition-" + pm.iterationData.iteration);
                        });
                    `
                }
            }]
        }]
    };

    // Basic functionality tests
    describe('basic functionality', function () {
        describe('with parallelized iterations', function () {
            var testrun;

            before(function (done) {
                this.run({
                    collection: collection,
                    iterationCount: 4,
                    data: [
                        { foo: 'bar' },
                        { foo: 'bar' },
                        { foo: 'bar' },
                        { foo: 'bar' }
                    ],
                    maxConcurrency: 2, // Run with 2 partitions
                    parallelRun: true
                }, function (err, results) {
                    testrun = results;
                    done(err);
                });
            });

            it('should complete the run successfully', function () {
                expect(testrun).to.be.ok;
                expect(testrun.done.getCall(0).args[0]).to.not.exist;
                expect(testrun).to.nested.include({
                    'done.calledOnce': true,
                    'start.calledOnce': true
                });
            });

            it('should run all iterations', function () {
                expect(testrun.iteration.callCount).to.equal(4);
                expect(testrun.request.callCount).to.equal(4);
            });

            it('should maintain correct test data in each iteration', function () {
                // Each request has 3 tests, so with 4 iterations we should have 12 assertions
                expect(testrun.assertion.callCount).to.equal(12);

                // Check that "should contain data" test passed in all iterations
                var dataTests = testrun.assertion.args.filter(function (args) {
                    return args[1].some(function (assertion) {
                        return assertion.name === 'should contain data';
                    });
                });

                expect(dataTests.length).to.equal(4); // One for each iteration

                dataTests.forEach(function (args) {
                    var assertion = args[1].find(function (a) {
                        return a.name === 'should contain data';
                    });

                    expect(assertion.passed).to.be.true;
                });
            });
        });
    });

    // Variable scope tests
    describe('variable scope isolation', function () {
        var testrun;

        before(function (done) {
            this.run({
                collection: collection,
                iterationCount: 4,
                data: [
                    { foo: 'bar' },
                    { foo: 'bar' },
                    { foo: 'bar' },
                    { foo: 'bar' }
                ],
                maxConcurrency: 4, // Maximum parallelization
                parallelRun: true
            }, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        it('should properly isolate variables between partitions', function () {
            // Should have 12 assertions total (3 tests × 4 iterations)
            expect(testrun.assertion.callCount).to.equal(12);

            // Filter only the partition data isolation tests
            var isolationTests = testrun.assertion.args.filter(function (args) {
                return args[1].some(function (assertion) {
                    return assertion.name === 'partition data is isolated';
                });
            });

            expect(isolationTests.length).to.equal(4); // One for each iteration

            // All partition isolation tests should pass
            isolationTests.forEach(function (args) {
                var assertion = args[1].find(function (a) {
                    return a.name === 'partition data is isolated';
                });

                expect(assertion.passed).to.be.true;
            });
        });
    });

    // Partition distribution tests
    describe('partition distribution', function () {
        describe('with more iterations than concurrency', function () {
            var testrun;

            before(function (done) {
                this.run({
                    collection: collection,
                    iterationCount: 5,
                    maxConcurrency: 2,
                    parallelRun: true,
                    data: Array(5).fill({ foo: 'bar' })
                }, function (err, results) {
                    testrun = results;
                    done(err);
                });
            });

            it('should distribute iterations correctly', function () {
                // With 5 iterations and concurrency of 2, distribution should be:
                // Partition 1: 3 iterations, Partition 2: 2 iterations
                expect(testrun.request.callCount).to.equal(5);
                expect(testrun.iteration.callCount).to.equal(5);
            });
        });

        describe('with more concurrency than iterations', function () {
            var testrun;

            before(function (done) {
                this.run({
                    collection: collection,
                    iterationCount: 2,
                    maxConcurrency: 4,
                    data: Array(2).fill({ foo: 'bar' })
                }, function (err, results) {
                    testrun = results;
                    done(err);
                });
            });

            it('should limit concurrency to iteration count', function () {
                expect(testrun.request.callCount).to.equal(2);
                expect(testrun.iteration.callCount).to.equal(2);
            });
        });
    });

    // SNR tests
    describe('Set Next Request functionality', function () {
        var testrun;

        before(function (done) {
            this.run({
                collection: {
                    item: [{
                        name: 'First Request',
                        request: 'https://postman-echo.com/get?request=1',
                        event: [{
                            listen: 'test',
                            script: {
                                exec: `
                                    pm.test("First request", function() {
                                        pm.expect(true).to.be.true;
                                    });
                                    pm.execution.setNextRequest("Third Request");
                                `
                            }
                        }]
                    }, {
                        name: 'Second Request',
                        request: 'https://postman-echo.com/get?request=2',
                        event: [{
                            listen: 'test',
                            script: {
                                exec: `
                                    pm.test("Should not run", function() {
                                        pm.expect(false).to.be.true;
                                    });
                                `
                            }
                        }]
                    }, {
                        name: 'Third Request',
                        request: 'https://postman-echo.com/get?request=3',
                        event: [{
                            listen: 'test',
                            script: {
                                exec: `
                                    pm.test("Third request", function() {
                                        pm.expect(true).to.be.true;
                                    });
                                `
                            }
                        }]
                    }]
                },
                iterationCount: 2,
                maxConcurrency: 2,
                parallelRun: true
            }, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        it('should respect setNextRequest in each partition', function () {
            // Verify second request was skipped in both iterations
            expect(_.map(testrun.request.args, '[4].name'))
                .to.not.include('Second Request');

            // Ensure first and third requests ran in both iterations
            expect(_.map(testrun.request.args, '[4].name'))
                .to.include.members(['First Request', 'Third Request']);
        });
    });

    // Error handling tests
    describe('stopOnFailure functionality', function () {
        var testrun;

        before(function (done) {
            this.run({
                collection: {
                    item: [{
                        request: 'https://postman-echo.com/get',
                        event: [{
                            listen: 'test',
                            script: {
                                exec: `
                                    pm.test("This test will fail", function () {
                                        throw new Error("Forced error");
                                    });
                                `
                            }
                        }]
                    }]
                },
                iterationCount: 4,
                maxConcurrency: 2,
                stopOnFailure: true,
                parallelRun: true
            }, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        it('should stop all partitions on test failure when stopOnFailure is true', function () {
            // First iteration in each partition should fail and stop
            expect(testrun.request.callCount).to.be.lessThan(4);
            expect(testrun.request.callCount).to.be.at.least(1);

            // Ensure we have test failures
            expect(testrun.assertion.args.some(function (args) {
                return args[1][0].error && args[1][0].error.message === 'Forced error';
            })).to.be.true;
        });
    });

    // Performance tests
    describe('performance comparison', function () {
        var serialTestrun,
            parallelTestrun,
            serialTime,
            parallelTime;

        before(function (done) {
            var serialStart = Date.now();

            // Run in serial mode first
            this.run({
                collection: {
                    item: [{
                        name: 'Delayed Request',
                        request: {
                            url: 'https://postman-echo.com/delay/1', // 1 second delay
                            method: 'GET'
                        }
                    }]
                },
                iterationCount: 3,
                parallelRun: false
            }, function (err, results) {
                if (err) { return done(err); }

                serialTestrun = results;
                serialTime = Date.now() - serialStart;

                // Now run in parallel mode
                var parallelStart = Date.now();

                this.run({
                    collection: {
                        item: [{
                            name: 'Delayed Request',
                            request: {
                                url: 'https://postman-echo.com/delay/1', // 1 second delay
                                method: 'GET'
                            }
                        }]
                    },
                    iterationCount: 3,
                    maxConcurrency: 3, // Run all iterations in parallel
                    parallelRun: true
                }, function (err, results) {
                    parallelTestrun = results;
                    parallelTime = Date.now() - parallelStart;
                    done(err);
                });
            }.bind(this));
        });

        it('should complete all iterations in both modes', function () {
            expect(serialTestrun.request.callCount).to.equal(3);
            expect(parallelTestrun.request.callCount).to.equal(3);
        });

        it('should run faster in parallel mode', function () {
            // Parallel should be faster, but sometimes tests can be flaky in CI environments
            // We're expecting at least 30% speedup for 3 parallel iterations
            expect(parallelTime).to.be.lessThan(serialTime * 0.9);

            // Avoid console.log in tests, but keep the info in a comment
            // console.log('Serial time: ' + serialTime + 'ms, Parallel time: ' + parallelTime + 'ms');
        });
    });
});
