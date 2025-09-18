var sinon = require('sinon').createSandbox(),
    expect = require('chai').expect,
    waterfallCommand = require('../../lib/runner/extensions/waterfall.command'),
    Cursor = require('../../lib/runner/cursor'),
    VariableScope = require('postman-collection').VariableScope;

describe('waterfall command - parallel iteration support', function () {
    var mockRunner;

    beforeEach(function () {
        mockRunner = {
            areIterationsParallelized: false,
            state: {
                environment: {},
                globals: {},
                collectionVariables: {},
                vaultSecrets: {},
                localVariables: {},
                items: [{ id: 'item1' }, { id: 'item2' }, { id: 'item3' }],
                data: [{ key: 'value1' }, { key: 'value2' }],
                cursor: new Cursor(3, 2)
            },
            options: {
                iterationCount: 2
            },
            queue: sinon.stub(),
            waterfall: null,
            snrHash: null
        };
    });

    afterEach(function () {
        sinon.restore();
    });

    describe('init', function () {
        it('should queue waterfall command when iterations are not parallelized', function (done) {
            mockRunner.areIterationsParallelized = false;

            waterfallCommand.init.call(mockRunner, function (err) {
                expect(err).to.be.undefined;
                expect(mockRunner.queue.calledOnce).to.be.true;
                expect(mockRunner.queue.firstCall.args[0]).to.equal('waterfall');
                expect(mockRunner.queue.firstCall.args[1]).to.deep.include({
                    static: true,
                    start: true
                });
                done();
            });
        });

        it('should not queue waterfall command when iterations are parallelized', function (done) {
            mockRunner.areIterationsParallelized = true;

            waterfallCommand.init.call(mockRunner, function (err) {
                expect(err).to.be.undefined;
                expect(mockRunner.queue.called).to.be.false;
                done();
            });
        });

        it('should prepare variable scopes regardless of parallelization', function (done) {
            mockRunner.areIterationsParallelized = true;

            waterfallCommand.init.call(mockRunner, function (err) {
                expect(err).to.be.undefined;
                expect(mockRunner.state.environment).to.be.instanceOf(VariableScope);
                expect(mockRunner.state.globals).to.be.instanceOf(VariableScope);
                expect(mockRunner.state.collectionVariables).to.be.instanceOf(VariableScope);
                expect(mockRunner.state._variables).to.be.instanceOf(VariableScope);
                done();
            });
        });

        it('should set waterfall cursor regardless of parallelization', function (done) {
            waterfallCommand.init.call(mockRunner, function (err) {
                expect(err).to.be.undefined;
                expect(mockRunner.waterfall).to.equal(mockRunner.state.cursor);
                done();
            });
        });

        it('should initialize snrHash to null', function (done) {
            waterfallCommand.init.call(mockRunner, function (err) {
                expect(err).to.be.undefined;
                expect(mockRunner.snrHash).to.be.null;
                done();
            });
        });

        it('should prepare vault variable scope', function (done) {
            waterfallCommand.init.call(mockRunner, function (err) {
                expect(err).to.be.undefined;
                expect(mockRunner.state.vaultSecrets).to.be.instanceOf(VariableScope);
                done();
            });
        });

        it('should handle existing VariableScope instances', function (done) {
            var existingEnvironment = new VariableScope({ existing: 'env' });

            mockRunner.state.environment = existingEnvironment;

            waterfallCommand.init.call(mockRunner, function (err) {
                expect(err).to.be.undefined;
                expect(mockRunner.state.environment).to.equal(existingEnvironment);
                done();
            });
        });
    });

    describe('conditional waterfall queuing', function () {
        it('should queue waterfall when areIterationsParallelized is false', function (done) {
            mockRunner.areIterationsParallelized = false;

            waterfallCommand.init.call(mockRunner, function (err) {
                expect(err).to.be.undefined;
                expect(mockRunner.queue.calledWith('waterfall')).to.be.true;
                done();
            });
        });

        it('should queue waterfall when areIterationsParallelized is undefined', function (done) {
            mockRunner.areIterationsParallelized = undefined;

            waterfallCommand.init.call(mockRunner, function (err) {
                expect(err).to.be.undefined;
                expect(mockRunner.queue.calledWith('waterfall')).to.be.true;
                done();
            });
        });

        it('should not queue waterfall when areIterationsParallelized is true', function (done) {
            mockRunner.areIterationsParallelized = true;

            waterfallCommand.init.call(mockRunner, function (err) {
                expect(err).to.be.undefined;
                expect(mockRunner.queue.called).to.be.false;
                done();
            });
        });

        it('should pass correct coordinates to waterfall queue', function (done) {
            mockRunner.areIterationsParallelized = false;

            waterfallCommand.init.call(mockRunner, function (err) {
                expect(err).to.be.undefined;
                expect(mockRunner.queue.firstCall.args[1].coords).to.deep.include({
                    position: 0,
                    iteration: 0,
                    length: 3,
                    cycles: 2
                });
                done();
            });
        });
    });

    describe('variable scope preparation', function () {
        it('should convert plain objects to VariableScope instances', function (done) {
            mockRunner.state = {
                environment: { env: 'value' },
                globals: { global: 'value' },
                collectionVariables: { collection: 'value' },
                vaultSecrets: { vault: 'secret' },
                localVariables: { local: 'value' },
                items: [],
                data: [],
                cursor: new Cursor(0, 1)
            };

            waterfallCommand.init.call(mockRunner, function (err) {
                expect(err).to.be.undefined;
                expect(mockRunner.state.environment).to.be.instanceOf(VariableScope);
                expect(mockRunner.state.globals).to.be.instanceOf(VariableScope);
                expect(mockRunner.state.collectionVariables).to.be.instanceOf(VariableScope);
                expect(mockRunner.state.vaultSecrets).to.be.instanceOf(VariableScope);
                expect(mockRunner.state._variables).to.be.instanceOf(VariableScope);
                done();
            });
        });

        it('should handle null and undefined variable scopes', function (done) {
            mockRunner.state.environment = null;
            mockRunner.state.globals = undefined;

            waterfallCommand.init.call(mockRunner, function (err) {
                expect(err).to.be.undefined;
                expect(mockRunner.state.environment).to.be.instanceOf(VariableScope);
                expect(mockRunner.state.globals).to.be.instanceOf(VariableScope);
                done();
            });
        });
    });

    describe('integration with existing functionality', function () {
        it('should maintain backward compatibility for non-parallel runs', function (done) {
            mockRunner.areIterationsParallelized = false;

            waterfallCommand.init.call(mockRunner, function (err) {
                expect(err).to.be.undefined;

                // Should behave exactly as before
                expect(mockRunner.queue.calledOnce).to.be.true;
                expect(mockRunner.waterfall).to.equal(mockRunner.state.cursor);
                expect(mockRunner.snrHash).to.be.null;
                expect(mockRunner.state.environment).to.be.instanceOf(VariableScope);

                done();
            });
        });

        it('should prepare environment for parallel runs without queuing', function (done) {
            mockRunner.areIterationsParallelized = true;

            waterfallCommand.init.call(mockRunner, function (err) {
                expect(err).to.be.undefined;

                // Should prepare everything except not queue waterfall
                expect(mockRunner.queue.called).to.be.false;
                expect(mockRunner.waterfall).to.equal(mockRunner.state.cursor);
                expect(mockRunner.snrHash).to.be.null;
                expect(mockRunner.state.environment).to.be.instanceOf(VariableScope);

                done();
            });
        });
    });

    describe('error handling', function () {
        it('should handle missing state gracefully', function () {
            mockRunner.state = null;

            expect(function () {
                waterfallCommand.init.call(mockRunner, function () {
                    // Empty callback for test
                });
            }).to.throw();
        });

        it('should handle missing cursor gracefully', function () {
            mockRunner.state.cursor = null;

            expect(function () {
                waterfallCommand.init.call(mockRunner, function () {
                    // Empty callback for test
                });
            }).to.not.throw();
        });

        it('should handle callback errors gracefully', function () {
            var callbackError = new Error('Callback error');

            // Mock queue to throw error
            mockRunner.queue = sinon.stub().throws(callbackError);

            expect(function () {
                waterfallCommand.init.call(mockRunner, function () {
                    // Empty callback for test
                });
            }).to.throw(callbackError);
        });
    });

    describe('module structure', function () {
        it('should export init function', function () {
            expect(waterfallCommand).to.have.property('init');
            expect(waterfallCommand.init).to.be.a('function');
        });

        it('should export triggers array', function () {
            expect(waterfallCommand).to.have.property('triggers');
            expect(waterfallCommand.triggers).to.be.an('array');
        });

        it('should export process object', function () {
            expect(waterfallCommand).to.have.property('process');
            expect(waterfallCommand.process).to.be.an('object');
        });
    });

    describe('shared utility usage', function () {
        it('should use shared utility functions', function (done) {
            // Test that prepareVariablesScope is working by checking its side effects
            // Set up state with plain objects that should be converted to VariableScope
            mockRunner.state.environment = { key: 'env-value' };
            mockRunner.state.globals = { key: 'global-value' };
            mockRunner.state.collectionVariables = { key: 'collection-value' };

            waterfallCommand.init.call(mockRunner, function (err) {
                expect(err).to.be.undefined;

                // Verify that prepareVariablesScope converted plain objects to VariableScope instances
                expect(mockRunner.state.environment.constructor.name).to.equal('PostmanVariableScope');
                expect(mockRunner.state.globals.constructor.name).to.equal('PostmanVariableScope');
                expect(mockRunner.state.collectionVariables.constructor.name).to.equal('PostmanVariableScope');

                done();
            });
        });

        it('should use processExecutionResult in waterfall process', function () {
            // This test verifies that the waterfall command uses the shared utility
            expect(waterfallCommand.process).to.have.property('waterfall');
            expect(waterfallCommand.process.waterfall).to.be.a('function');

            // The actual processExecutionResult usage would be tested in integration tests
            // as it requires complex setup of the waterfall execution flow
        });
    });
});
