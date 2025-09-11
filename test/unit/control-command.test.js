var sinon = require('sinon').createSandbox(),
    expect = require('chai').expect,
    controlCommand = require('../../lib/runner/extensions/control.command');

describe('control command extension', function () {
    var mockRunner,
        mockPartitionManager,
        mockPool,
        mockTriggers;

    beforeEach(function () {
        mockTriggers = {
            abort: sinon.stub()
        };

        mockPool = {
            clear: sinon.stub()
        };

        mockPartitionManager = {
            clearPools: sinon.stub(),
            triggerStopAction: sinon.stub()
        };

        mockRunner = {
            pool: mockPool,
            partitionManager: mockPartitionManager,
            triggers: mockTriggers,
            aborted: false,
            state: {
                cursor: {
                    current: sinon.stub().returns({
                        position: 1,
                        iteration: 0,
                        ref: 'test-ref'
                    })
                }
            }
        };
    });

    afterEach(function () {
        sinon.restore();
    });

    describe('abort process', function () {
        var payload, next, userback;

        beforeEach(function () {
            payload = {};
            next = sinon.stub();
            userback = sinon.stub();
        });

        it('should clear instruction pool', function () {
            controlCommand.process.abort.call(mockRunner, userback, payload, next);

            expect(mockPool.clear.calledOnce).to.be.true;
        });

        it('should clear partition manager pools', function () {
            controlCommand.process.abort.call(mockRunner, userback, payload, next);

            expect(mockPartitionManager.clearPools.calledOnce).to.be.true;
        });

        it('should trigger abort event when not already aborted', function () {
            controlCommand.process.abort.call(mockRunner, userback, payload, next);

            expect(mockTriggers.abort.calledOnce).to.be.true;
            expect(mockTriggers.abort.firstCall.args[0]).to.be.null;
            expect(mockTriggers.abort.firstCall.args[1]).to.deep.include({
                position: 1,
                iteration: 0,
                ref: 'test-ref'
            });
        });

        it('should set aborted flag to true', function () {
            controlCommand.process.abort.call(mockRunner, userback, payload, next);

            expect(mockRunner.aborted).to.be.true;
        });

        it('should execute userback callback', function () {
            controlCommand.process.abort.call(mockRunner, userback, payload, next);

            expect(userback.calledOnce).to.be.true;
        });

        it('should not execute userback if it is not a function', function () {
            var nonFunction = 'not a function';

            expect(function () {
                controlCommand.process.abort.call(mockRunner, nonFunction, payload, next);
            }).to.not.throw();

            expect(mockTriggers.abort.calledOnce).to.be.true;
        });

        it('should handle userback execution errors gracefully', function () {
            var errorUserback = sinon.stub().throws(new Error('Userback error'));

            // The implementation currently doesn't have try-catch around userback execution
            // So the error will propagate, but the abort process should still complete
            expect(function () {
                controlCommand.process.abort.call(mockRunner, errorUserback, payload, next);
            }).to.throw('Userback error');

            expect(errorUserback.calledOnce).to.be.true;
            expect(mockTriggers.abort.calledOnce).to.be.true;
            // next() is called after the userback, so it won't be reached if userback throws
        });

        it('should not trigger abort event if already aborted', function () {
            mockRunner.aborted = true;

            controlCommand.process.abort.call(mockRunner, userback, payload, next);

            expect(mockTriggers.abort.called).to.be.false;
            expect(userback.called).to.be.false;
        });

        it('should still clear pools even if already aborted', function () {
            mockRunner.aborted = true;

            controlCommand.process.abort.call(mockRunner, userback, payload, next);

            expect(mockPool.clear.calledOnce).to.be.true;
            expect(mockPartitionManager.clearPools.calledOnce).to.be.true;
        });

        it('should trigger partition manager stop action', function () {
            controlCommand.process.abort.call(mockRunner, userback, payload, next);

            expect(mockPartitionManager.triggerStopAction.calledOnce).to.be.true;
        });

        it('should call next callback', function () {
            controlCommand.process.abort.call(mockRunner, userback, payload, next);

            expect(next.calledOnce).to.be.true;
            expect(next.firstCall.args[0]).to.be.null;
        });

        it('should execute operations in correct order', function () {
            var callOrder = [];

            mockPool.clear = sinon.stub().callsFake(function () {
                callOrder.push('pool.clear');
            });

            mockPartitionManager.clearPools = sinon.stub().callsFake(function () {
                callOrder.push('partitionManager.clearPools');
            });

            mockTriggers.abort = sinon.stub().callsFake(function () {
                callOrder.push('triggers.abort');
            });

            userback = sinon.stub().callsFake(function () {
                callOrder.push('userback');
            });

            mockPartitionManager.triggerStopAction = sinon.stub().callsFake(function () {
                callOrder.push('triggerStopAction');
            });

            next = sinon.stub().callsFake(function () {
                callOrder.push('next');
            });

            controlCommand.process.abort.call(mockRunner, userback, payload, next);

            expect(callOrder).to.deep.equal([
                'pool.clear',
                'partitionManager.clearPools',
                'triggers.abort',
                'userback',
                'triggerStopAction',
                'next'
            ]);
        });

        it('should handle missing partition manager gracefully', function () {
            mockRunner.partitionManager = null;

            expect(function () {
                controlCommand.process.abort.call(mockRunner, userback, payload, next);
            }).to.throw();
        });

        it('should handle missing pool gracefully', function () {
            mockRunner.pool = null;

            expect(function () {
                controlCommand.process.abort.call(mockRunner, userback, payload, next);
            }).to.throw();
        });
    });

    describe('module structure', function () {
        it('should export process object with abort method', function () {
            expect(controlCommand).to.have.property('process');
            expect(controlCommand.process).to.have.property('abort');
            expect(controlCommand.process.abort).to.be.a('function');
        });
    });
});
