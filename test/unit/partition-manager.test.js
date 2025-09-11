var sinon = require('sinon').createSandbox(),
    expect = require('chai').expect,
    PartitionManager = require('../../lib/runner/partition-manager'),
    Partition = require('../../lib/runner/partition');

describe('PartitionManager', function () {
    var mockRunInstance,
        partitionManager;

    beforeEach(function () {
        mockRunInstance = {
            options: {
                iterationCount: 10,
                maxConcurrency: 3
            },
            state: {
                items: [{ id: 'item1' }, { id: 'item2' }],
                cursor: {
                    current: sinon.stub().returns({
                        position: 0,
                        iteration: 0,
                        ref: 'test-ref'
                    })
                }
            },
            queue: sinon.stub(),
            triggers: sinon.stub(),
            aborted: false,
            host: {
                dispose: sinon.stub()
            }
        };

        partitionManager = new PartitionManager(mockRunInstance);
    });

    afterEach(function () {
        sinon.restore();
    });

    describe('constructor', function () {
        it('should initialize with run instance', function () {
            expect(partitionManager.runInstance).to.equal(mockRunInstance);
            expect(partitionManager.partitions).to.be.an('array').that.is.empty;
            expect(partitionManager.priorityPartition).to.be.instanceOf(Partition);
        });
    });

    describe('createPartitions', function () {
        it('should create partitions based on concurrency and iteration count', function () {
            partitionManager.createPartitions();

            expect(partitionManager.partitions).to.have.length(3);
            expect(partitionManager.partitions[0]).to.be.instanceOf(Partition);
        });

        it('should distribute iterations evenly across partitions', function () {
            partitionManager.createPartitions();

            // 10 iterations across 3 partitions: 4, 3, 3
            expect(partitionManager.partitions[0].cursor.partitionCycles).to.equal(4);
            expect(partitionManager.partitions[1].cursor.partitionCycles).to.equal(3);
            expect(partitionManager.partitions[2].cursor.partitionCycles).to.equal(3);
        });

        it('should handle remainder iterations correctly', function () {
            mockRunInstance.options.iterationCount = 11;
            mockRunInstance.options.maxConcurrency = 3;

            partitionManager.createPartitions();

            // 11 iterations across 3 partitions: 4, 4, 3
            expect(partitionManager.partitions[0].cursor.partitionCycles).to.equal(4);
            expect(partitionManager.partitions[1].cursor.partitionCycles).to.equal(4);
            expect(partitionManager.partitions[2].cursor.partitionCycles).to.equal(3);
        });

        it('should limit concurrency to iteration count when concurrency is higher', function () {
            mockRunInstance.options.iterationCount = 2;
            mockRunInstance.options.maxConcurrency = 5;

            partitionManager.createPartitions();

            expect(partitionManager.partitions).to.have.length(2);
        });

        it('should set correct start indices for partitions', function () {
            partitionManager.createPartitions();

            expect(partitionManager.partitions[0].startIndex).to.equal(0);
            expect(partitionManager.partitions[1].startIndex).to.equal(4);
            expect(partitionManager.partitions[2].startIndex).to.equal(7);
        });

        it('should skip partitions with zero or negative size', function () {
            mockRunInstance.options.iterationCount = 2;
            mockRunInstance.options.maxConcurrency = 5;

            partitionManager.createPartitions();

            // Should only create 2 partitions for 2 iterations
            expect(partitionManager.partitions).to.have.length(2);
        });
    });

    describe('schedule', function () {
        beforeEach(function () {
            partitionManager.createPartitions();
            sinon.stub(partitionManager.partitions[0], 'schedule');
            sinon.stub(partitionManager.priorityPartition, 'schedule');
        });

        it('should schedule to priority partition when immediate flag is true', function () {
            var payload = { coords: { partitionIndex: 0 } };

            partitionManager.schedule('test-action', payload, [], true);

            expect(partitionManager.priorityPartition.schedule.calledOnce).to.be.true;
            expect(partitionManager.partitions[0].schedule.called).to.be.false;
        });

        it('should schedule to correct partition based on partitionIndex', function () {
            var payload = { coords: { partitionIndex: 0 } };

            partitionManager.schedule('test-action', payload, [], false);

            expect(partitionManager.partitions[0].schedule.calledOnce).to.be.true;
            expect(partitionManager.priorityPartition.schedule.called).to.be.false;
        });

        it('should handle payload with cursor instead of coords', function () {
            var payload = { cursor: { partitionIndex: 0 } };

            partitionManager.schedule('test-action', payload, [], false);

            expect(partitionManager.partitions[0].schedule.calledOnce).to.be.true;
        });
    });

    describe('process', function () {
        beforeEach(function () {
            partitionManager.createPartitions();
            sinon.stub(partitionManager, '_processPartition');
        });

        it('should return early if run is aborted', function (done) {
            mockRunInstance.aborted = true;

            partitionManager.process(function (err) {
                expect(err).to.be.undefined;
                expect(partitionManager._processPartition.called).to.be.false;
                done();
            });
        });

        it('should process priority partition first if it has instructions', function () {
            sinon.stub(partitionManager.priorityPartition, 'hasInstructions').returns(true);
            partitionManager._processPartition.callsArgWith(1, null);

            partitionManager.process(function () {
                // Empty callback for test
            });

            expect(partitionManager._processPartition.calledWith(partitionManager.priorityPartition)).to.be.true;
        });

        it('should process all partitions after priority is done', function () {
            sinon.stub(partitionManager.priorityPartition, 'hasInstructions').returns(true);
            partitionManager._processPartition.callsArgWith(1, null);
            mockRunInstance.options.customParallelIterations = false;

            partitionManager.process(function () {
                // Empty callback for test
            });

            // Should be called for priority + all partitions
            expect(partitionManager._processPartition.callCount).to.equal(4); // 1 priority + 3 partitions
        });

        it('should not process other partitions if customParallelIterations is true', function () {
            sinon.stub(partitionManager.priorityPartition, 'hasInstructions').returns(true);
            partitionManager._processPartition.callsArgWith(1, null);
            mockRunInstance.options.customParallelIterations = true;

            partitionManager.process(function () {
                // Empty callback for test
            });

            // Should only process priority partition
            expect(partitionManager._processPartition.callCount).to.equal(1);
        });

        it('should handle errors from partition processing', function (done) {
            var testError = new Error('Test error');

            sinon.stub(partitionManager.priorityPartition, 'hasInstructions').returns(true);
            partitionManager._processPartition.callsArgWith(1, testError);

            partitionManager.process(function (err) {
                expect(err).to.equal(testError);
                done();
            });
        });

        it('should dispose host when all partitions complete', function (done) {
            sinon.stub(partitionManager.priorityPartition, 'hasInstructions').returns(false);
            mockRunInstance.options.customParallelIterations = false;
            partitionManager._processPartition.callsArgWith(1, null);

            partitionManager.process(function (err) {
                expect(err).to.be.null;
                expect(mockRunInstance.host.dispose.calledOnce).to.be.true;
                done();
            });
        });
    });

    describe('_processPartition', function () {
        var mockPartition, mockInstruction;

        beforeEach(function () {
            mockInstruction = {
                execute: sinon.stub()
            };
            mockPartition = {
                nextInstruction: sinon.stub().returns(mockInstruction),
                hasInstructions: sinon.stub().returns(true)
            };
        });

        it('should return early if partition has no instructions', function (done) {
            mockPartition.nextInstruction.returns(null);

            partitionManager._processPartition(mockPartition, function (err) {
                expect(err).to.be.undefined;
                expect(mockInstruction.execute.called).to.be.false;
                done();
            });
        });

        it('should execute instruction and continue processing', function () {
            mockInstruction.execute.callsArgWith(0, null);
            mockPartition.nextInstruction.onSecondCall().returns(null);

            var callback = sinon.stub();

            partitionManager._processPartition(mockPartition, callback);

            expect(mockInstruction.execute.calledOnce).to.be.true;
            expect(mockPartition.nextInstruction.calledTwice).to.be.true;
        });

        it('should handle instruction execution errors', function (done) {
            var testError = new Error('Instruction error');

            mockInstruction.execute.callsArgWith(0, testError);

            partitionManager._processPartition(mockPartition, function (err) {
                expect(err).to.equal(testError);
                done();
            });
        });

        it('should wait for priority partition when priority lock is active', function (done) {
            partitionManager.priorityLock = true;
            var clock = sinon.useFakeTimers();

            partitionManager._processPartition(mockPartition, function () {
                done();
            });

            // Should not execute immediately
            expect(mockInstruction.execute.called).to.be.false;

            // Advance time and release lock
            setTimeout(function () {
                partitionManager.priorityLock = false;
                mockPartition.nextInstruction.returns(null);
            }, 5);

            clock.tick(15);
            clock.restore();
        });
    });

    describe('utility methods', function () {
        beforeEach(function () {
            partitionManager.createPartitions();
        });

        it('should reset partitions', function () {
            expect(partitionManager.partitions).to.have.length(3);

            partitionManager.reset();

            expect(partitionManager.partitions).to.be.empty;
        });

        it('should return total partition count', function () {
            expect(partitionManager.getTotalPartitions()).to.equal(3);
        });

        it('should clear all partition pools', function () {
            partitionManager.partitions.forEach(function (partition) {
                sinon.stub(partition, 'clearPool');
            });

            partitionManager.clearPools();

            partitionManager.partitions.forEach(function (partition) {
                expect(partition.clearPool.calledOnce).to.be.true;
            });
        });
    });

    describe('single partition operations', function () {
        beforeEach(function () {
            partitionManager.createPartitions();
        });

        it('should create single partition with correct parameters', function () {
            var partition = partitionManager.createSinglePartition(5);

            expect(partition).to.be.instanceOf(Partition);
            expect(partition.startIndex).to.equal(0);
            expect(partition.cursor.partitionCycles).to.equal(1);
            expect(partitionManager.partitions).to.include(partition);
        });

        it('should run single partition', function (done) {
            var localVariables = { test: 'value' };

            sinon.stub(partitionManager, '_processPartition').callsArgWith(1, null);

            partitionManager.runSinglePartition(0, localVariables, function (err) {
                expect(err).to.be.null;
                expect(mockRunInstance.queue.calledWith('parallel')).to.be.true;
                done();
            });
        });

        it('should reuse existing partition if available', function (done) {
            var existingPartition = partitionManager.partitions[0];

            sinon.stub(existingPartition, 'hasInstructions').returns(false);
            sinon.stub(partitionManager, '_processPartition').callsArgWith(1, null);

            partitionManager.runSinglePartition(0, null, function (err) {
                expect(err).to.be.null;
                expect(partitionManager.partitions[0]).to.equal(existingPartition);
                done();
            });
        });

        it('should not run partition if it already has instructions', function (done) {
            var existingPartition = partitionManager.partitions[0];

            sinon.stub(existingPartition, 'hasInstructions').returns(true);

            partitionManager.runSinglePartition(0, null, function (err) {
                expect(err).to.be.null;
                expect(mockRunInstance.queue.called).to.be.false;
                done();
            });
        });

        it('should stop single partition by clearing its pool', function (done) {
            var partition = partitionManager.partitions[0];

            sinon.stub(partition, 'clearPool');

            partitionManager.stopSinglePartition(0, function (err) {
                expect(err).to.be.null;
                expect(partition.clearPool.calledOnce).to.be.true;
                done();
            });
        });

        it('should handle stopping non-existent partition gracefully', function (done) {
            partitionManager.stopSinglePartition(99, function (err) {
                expect(err).to.be.null;
                done();
            });
        });
    });

    describe('triggerStopAction', function () {
        beforeEach(function () {
            partitionManager.createPartitions(); // This copies options from runInstance
        });

        it('should trigger stop action when customParallelIterations is enabled', function () {
            mockRunInstance.options.customParallelIterations = true;
            partitionManager.options = mockRunInstance.options; // Ensure options are set

            partitionManager.triggerStopAction();

            expect(mockRunInstance.triggers.calledWith(null)).to.be.true;
        });

        it('should not trigger stop action when customParallelIterations is disabled', function () {
            mockRunInstance.options.customParallelIterations = false;
            partitionManager.options = mockRunInstance.options; // Ensure options are set

            partitionManager.triggerStopAction();

            expect(mockRunInstance.triggers.called).to.be.false;
        });
    });
});
