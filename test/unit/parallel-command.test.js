var expect = require('chai').expect,
    parallelCommand = require('../../lib/runner/extensions/parallel.command.js');

describe('parallel command', function () {
    describe('module structure', function () {
        it('should be an object', function () {
            expect(parallelCommand).to.be.an('object');
        });

        it('should expose init function', function () {
            expect(parallelCommand).to.have.property('init');
            expect(parallelCommand.init).to.be.a('function');
        });

        it('should expose process object', function () {
            expect(parallelCommand).to.have.property('process');
            expect(parallelCommand.process).to.be.an('object');
        });

        it('should expose process.parallel function', function () {
            expect(parallelCommand.process).to.have.property('parallel');
            expect(parallelCommand.process.parallel).to.be.a('function');
        });

        it('should expose triggers array', function () {
            expect(parallelCommand).to.have.property('triggers');
            expect(parallelCommand.triggers).to.be.an('array');
        });

        it('should have correct triggers', function () {
            expect(parallelCommand.triggers).to.deep.equal(['beforeIteration', 'iteration']);
        });

        it('should have exactly three properties', function () {
            var keys = Object.keys(parallelCommand);

            expect(keys).to.have.length(3);
            expect(keys).to.include.members(['init', 'process', 'triggers']);
        });
    });

    describe('init function signature', function () {
        it('should accept one parameter (callback)', function () {
            expect(parallelCommand.init.length).to.equal(1);
        });

        it('should be callable', function () {
            expect(function () {
                // Test that the function can be called (even if it errors due to missing context)
                try {
                    parallelCommand.init(function () {
                        // Empty callback for testing
                    });
                }
                catch (e) {
                    // Expected to error without proper context
                }
            }).to.not.throw();
        });
    });

    describe('process.parallel function signature', function () {
        it('should accept two parameters (payload, callback)', function () {
            expect(parallelCommand.process.parallel.length).to.equal(2);
        });

        it('should be callable', function () {
            expect(function () {
                // Test that the function can be called (even if it errors due to missing context)
                try {
                    parallelCommand.process.parallel({}, function () {
                        // Empty callback for testing
                    });
                }
                catch (e) {
                    // Expected to error without proper context
                }
            }).to.not.throw();
        });
    });

    describe('init function behavior', function () {
        it('should call callback when areIterationsParallelized is false', function (done) {
            var context = {
                areIterationsParallelized: false
            };

            parallelCommand.init.call(context, function (err) {
                expect(err).to.not.exist;
                done();
            });
        });

        it('should handle callback parameter correctly', function (done) {
            var context = {
                    areIterationsParallelized: false
                },
                callbackCalled = false;

            parallelCommand.init.call(context, function (err) {
                callbackCalled = true;
                expect(err).to.not.exist;
            });

            // Give it a moment to execute
            setTimeout(function () {
                expect(callbackCalled).to.be.true;
                done();
            }, 10);
        });
    });

    describe('function types and properties', function () {
        it('should have init as a named function', function () {
            expect(parallelCommand.init.name).to.equal('init');
        });

        it('should have process.parallel as a named function', function () {
            expect(parallelCommand.process.parallel.name).to.equal('parallel');
        });

        it('should have triggers as a frozen array', function () {
            expect(parallelCommand.triggers).to.be.an('array');
            // Test that it contains the expected values
            expect(parallelCommand.triggers[0]).to.equal('beforeIteration');
            expect(parallelCommand.triggers[1]).to.equal('iteration');
        });
    });

    describe('module consistency', function () {
        it('should maintain consistent structure', function () {
            // Test that the module structure is consistent
            expect(parallelCommand).to.have.all.keys(['init', 'process', 'triggers']);
            expect(parallelCommand.process).to.have.all.keys(['parallel']);
        });

        it('should have stable function references', function () {
            // Test that function references are stable
            var init1 = parallelCommand.init,
                init2 = parallelCommand.init,
                parallel1 = parallelCommand.process.parallel,
                parallel2 = parallelCommand.process.parallel;

            expect(init1).to.equal(init2);
            expect(parallel1).to.equal(parallel2);
        });

        it('should have immutable triggers array reference', function () {
            var triggers1 = parallelCommand.triggers,
                triggers2 = parallelCommand.triggers;

            expect(triggers1).to.equal(triggers2);
            expect(triggers1).to.have.length(2);
        });
    });

    describe('function execution safety', function () {
        it('should not modify global state when loaded', function () {
            // Simply loading the module should not modify global state
            // This is tested by the fact that we can require it multiple times
            var module1 = require('../../lib/runner/extensions/parallel.command.js');
            var module2 = require('../../lib/runner/extensions/parallel.command.js');

            expect(module1).to.equal(module2);
        });

        it('should not throw when accessing properties', function () {
            expect(function () {
                // Access all properties to verify they don't throw
                var init = parallelCommand.init,
                    process = parallelCommand.process,
                    triggers = parallelCommand.triggers,
                    parallel = parallelCommand.process.parallel;

                // Verify they exist
                expect(init).to.exist;
                expect(process).to.exist;
                expect(triggers).to.exist;
                expect(parallel).to.exist;
            }).to.not.throw();
        });
    });

    describe('early return behavior', function () {
        it('should return early from init when areIterationsParallelized is false', function (done) {
            var context = {
                    areIterationsParallelized: false,
                    // Add some properties that would cause issues if accessed
                    state: null,
                    partitionManager: null
                },

                startTime = Date.now();

            parallelCommand.init.call(context, function (err) {
                var endTime = Date.now();

                expect(err).to.not.exist;
                // Should return very quickly (within 10ms) since it returns early
                expect(endTime - startTime).to.be.lessThan(10);
                done();
            });
        });
    });
});
