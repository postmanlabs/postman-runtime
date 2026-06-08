var sinon = require('sinon').createSandbox(),
    expect = require('chai').expect,
    PartitionManager = require('../../lib/runner/partition-manager'),
    Partition = require('../../lib/runner/partition'),
    parallelCommand = require('../../lib/runner/extensions/parallel.command'),
    eventCommand = require('../../lib/runner/extensions/event.command');

describe('customParallelIterations', function () {
    afterEach(function () {
        sinon.restore();
    });

    describe('Partition construction', function () {
        var mockRunInstance;

        beforeEach(function () {
            mockRunInstance = {
                isCustomParallelIterations: true,
                options: {
                    customParallelIterations: true,
                    iterationCount: 1,
                    maxConcurrency: 1
                },
                state: {
                    items: [{ id: 'item1' }],
                    environment: {},
                    globals: {},
                    vaultSecrets: {},
                    collectionVariables: {},
                    _variables: {}
                }
            };
        });

        it('initializes loopIteration to 0', function () {
            var partition = new Partition(mockRunInstance, 0, 1, 0);

            expect(partition.loopIteration).to.equal(0);
        });

        it('initializes stopped flag to false', function () {
            var partition = new Partition(mockRunInstance, 0, 1, 0);

            expect(partition.stopped).to.equal(false);
        });

        it('sets cursor.cycles to MAX_SAFE_INTEGER in custom mode', function () {
            var partition = new Partition(mockRunInstance, 0, 1, 0);

            expect(partition.cursor.cycles).to.equal(Number.MAX_SAFE_INTEGER);
        });

        it('exposes a public resetVariables() helper that re-clones from run state', function () {
            var partition = new Partition(mockRunInstance, 0, 1, 0),
                before = partition.variables;

            expect(partition.resetVariables).to.be.a('function');
            partition.resetVariables();
            expect(partition.variables).to.not.equal(before);
            expect(partition.variables).to.have.all.keys(
                'environment', 'globals', 'vaultSecrets', 'collectionVariables', '_variables'
            );
        });

        describe('runtime-managed mode regression', function () {
            it('keeps cursor.cycles === options.iterationCount when not in custom mode', function () {
                mockRunInstance.isCustomParallelIterations = false;
                mockRunInstance.options.customParallelIterations = false;
                mockRunInstance.options.iterationCount = 4;

                var partition = new Partition(mockRunInstance, 0, 2, 0);

                expect(partition.cursor.cycles).to.equal(4);
            });
        });
    });

    describe('Run constructor — isCustomParallelIterations helper', function () {
        var Run;

        before(function () {
            Run = require('../../lib/runner/run');
        });

        it('is true when customParallelIterations option is set', function () {
            var run = new Run({}, { customParallelIterations: true });

            expect(run.isCustomParallelIterations).to.equal(true);
        });

        it('is false when customParallelIterations option is unset', function () {
            var run = new Run({}, {});

            expect(run.isCustomParallelIterations).to.equal(false);
        });

        it('coerces truthy non-boolean values to true', function () {
            var run = new Run({}, { customParallelIterations: 1 });

            expect(run.isCustomParallelIterations).to.equal(true);
        });
    });

    describe('PartitionManager.runSinglePartition counter increment', function () {
        var mgr, mockRun;

        beforeEach(function () {
            mockRun = {
                isCustomParallelIterations: true,
                options: {
                    customParallelIterations: true,
                    iterationCount: 1,
                    maxConcurrency: 1
                },
                state: {
                    items: [{ id: 'item1' }],
                    environment: {},
                    globals: {},
                    vaultSecrets: {},
                    collectionVariables: {},
                    _variables: {},
                    cursor: { current: sinon.stub().returns({}) }
                },
                queue: sinon.stub(),
                triggers: sinon.stub(),
                aborted: false,
                host: { dispose: sinon.stub() }
            };
            mgr = new PartitionManager(mockRun);
            mgr.spawn();
            // expose options on the manager — production code reads
            // this.options inside runSinglePartition's siblings, set by
            // createPartitions(). For custom mode, mirror that:
            mgr.options = mockRun.options;
            // ensure _processPartition does not actually run anything
            sinon.stub(mgr, '_processPartition').callsArgWith(1, null);
        });

        it('sets cursor.iteration = 0 on first runSinglePartition (loop 1)', function (done) {
            mgr.runSinglePartition(0, null, function () {
                var p = mgr.partitions[0];

                expect(p.cursor.iteration).to.equal(0);
                expect(p.loopIteration).to.equal(1);
                done();
            });
        });

        it('increments cursor.iteration to 1 on second runSinglePartition (loop 2)', function (done) {
            mgr.runSinglePartition(0, null, function () {
                var p = mgr.partitions[0];

                // simulate partition drained between calls
                sinon.stub(p, 'hasInstructions').returns(false);
                mgr.runSinglePartition(0, null, function () {
                    expect(p.cursor.iteration).to.equal(1);
                    expect(p.loopIteration).to.equal(2);
                    done();
                });
            });
        });

        it('monotonically increments across 5 loops', function (done) {
            var p,
                expectedIterations = [],
                actualIterations = [];

            function runLoop (n) {
                mgr.runSinglePartition(0, null, function () {
                    if (!p) { p = mgr.partitions[0]; sinon.stub(p, 'hasInstructions').returns(false); }
                    actualIterations.push(p.cursor.iteration);
                    expectedIterations.push(n);
                    if (n === 4) {
                        expect(actualIterations).to.eql([0, 1, 2, 3, 4]);
                        return done();
                    }
                    runLoop(n + 1);
                });
            }
            runLoop(0);
        });

        it('does NOT increment in runtime-managed mode', function (done) {
            mockRun.isCustomParallelIterations = false;
            mockRun.options.customParallelIterations = false;
            mockRun.options.iterationCount = 4;
            mgr.options.customParallelIterations = false;

            mgr.runSinglePartition(0, null, function () {
                var p = mgr.partitions[0];

                // In non-custom mode, runSinglePartition is not the
                // increment path. Counter stays at 0 (untouched).
                expect(p.loopIteration).to.equal(0);
                expect(p.cursor.iteration).to.equal(0);
                done();
            });
        });
    });

    describe('parallel.command processor — Change 4 + 5 guards', function () {
        var parallelProc, ctx, partition, baseCoords;

        beforeEach(function () {
            parallelProc = parallelCommand.process.parallel;
            partition = {
                cursor: {
                    whatnext: sinon.stub(),
                    current: sinon.stub(),
                    seek: sinon.stub()
                },
                startIndex: 0,
                partitionIndex: 0
            };
            ctx = {
                isCustomParallelIterations: true,
                partitionManager: { partitions: [partition] },
                state: { items: [{ id: 'item-0' }], data: null },
                triggers: {
                    beforeIteration: sinon.spy(),
                    iteration: sinon.spy()
                },
                options: {},
                queue: sinon.spy(),
                queueDelay: sinon.spy()
            };
            // coords for "loop just rolled" — what runSinglePartition queues
            // on loop 2 of a 1-item collection: cursor.iteration === 1.
            baseCoords = {
                iteration: 1,
                position: 0,
                partitionIndex: 0,
                partitionCycles: 1,
                cr: false,
                eof: false,
                empty: false
            };
        });

        describe('Change 4 — end-of-partition guard is gated on custom mode', function () {
            it('does NOT short-circuit on loop 2 in custom mode (items must execute)', function () {
                var next = sinon.spy();

                parallelProc.call(ctx, {
                    coords: baseCoords,
                    static: true,
                    start: false
                }, next);

                // The guard at line 103 must be skipped in custom mode.
                // No iteration trigger from the guard; no early next();
                // the processor proceeds to queue the next item.
                expect(ctx.triggers.iteration.callCount).to.equal(0);
                expect(next.callCount).to.equal(0);
                expect(ctx.queueDelay.callCount).to.equal(1);
            });

            it('still short-circuits in runtime-managed mode (regression)', function () {
                var next = sinon.spy();

                ctx.isCustomParallelIterations = false;
                parallelProc.call(ctx, {
                    coords: baseCoords,
                    static: true,
                    start: false
                }, next);

                expect(ctx.triggers.iteration.callCount).to.equal(1);
                expect(next.callCount).to.equal(1);
                expect(ctx.queueDelay.callCount).to.equal(0);
            });
        });

        describe('Change 6 — stopSinglePartition: full fresh on reuse', function () {
            var mgr, mockRun;

            beforeEach(function () {
                mockRun = {
                    isCustomParallelIterations: true,
                    options: {
                        customParallelIterations: true,
                        iterationCount: 1,
                        maxConcurrency: 1
                    },
                    state: {
                        items: [{ id: 'item1' }],
                        environment: {},
                        globals: {},
                        vaultSecrets: {},
                        collectionVariables: {},
                        _variables: {},
                        cursor: { current: sinon.stub().returns({}) }
                    },
                    queue: sinon.stub(),
                    triggers: sinon.stub(),
                    aborted: false,
                    host: { dispose: sinon.stub() }
                };
                mgr = new PartitionManager(mockRun);
                mgr.spawn();
                mgr.options = mockRun.options;
                sinon.stub(mgr, '_processPartition').callsArgWith(1, null);
            });

            it('resets loopIteration to 0 on stop in custom mode', function (done) {
                mgr.runSinglePartition(0, null, function () {
                    var p = mgr.partitions[0];

                    sinon.stub(p, 'hasInstructions').returns(false);
                    mgr.runSinglePartition(0, null, function () {
                        expect(p.loopIteration).to.equal(2);
                        mgr.stopSinglePartition(0, function () {
                            expect(p.loopIteration).to.equal(0);
                            done();
                        });
                    });
                });
            });

            it('sets partition.stopped=true on stop', function (done) {
                mgr.runSinglePartition(0, null, function () {
                    var p = mgr.partitions[0];

                    expect(p.stopped).to.equal(false);
                    mgr.stopSinglePartition(0, function () {
                        expect(p.stopped).to.equal(true);
                        done();
                    });
                });
            });

            it('re-clones partition.variables on stop (full fresh contract)', function (done) {
                mgr.runSinglePartition(0, null, function () {
                    var p = mgr.partitions[0],
                        originalVars = p.variables;

                    mgr.stopSinglePartition(0, function () {
                        expect(p.variables).to.not.equal(originalVars);
                        expect(p.variables).to.have.all.keys(
                            'environment', 'globals', 'vaultSecrets',
                            'collectionVariables', '_variables'
                        );
                        done();
                    });
                });
            });

            it('clears partition.stopped flag on next runSinglePartition', function (done) {
                mgr.runSinglePartition(0, null, function () {
                    var p = mgr.partitions[0];

                    mgr.stopSinglePartition(0, function () {
                        expect(p.stopped).to.equal(true);
                        sinon.stub(p, 'hasInstructions').returns(false);
                        mgr.runSinglePartition(0, null, function () {
                            expect(p.stopped).to.equal(false);
                            done();
                        });
                    });
                });
            });

            it('counter restarts from 0 after stop+restart (regression for footgun #4)', function (done) {
                mgr.runSinglePartition(0, null, function () {
                    var p = mgr.partitions[0];

                    sinon.stub(p, 'hasInstructions').returns(false);
                    mgr.runSinglePartition(0, null, function () {
                        expect(p.cursor.iteration).to.equal(1);
                        mgr.stopSinglePartition(0, function () {
                            mgr.runSinglePartition(0, null, function () {
                                expect(p.cursor.iteration).to.equal(0);
                                expect(p.loopIteration).to.equal(1);
                                done();
                            });
                        });
                    });
                });
            });

            it('does NOT reset counter or re-clone variables in runtime-managed mode', function (done) {
                mockRun.isCustomParallelIterations = false;
                mockRun.options.customParallelIterations = false;
                mgr.options.customParallelIterations = false;

                mgr.runSinglePartition(0, null, function () {
                    var p = mgr.partitions[0],
                        originalVars = p.variables;

                    p.loopIteration = 5; // simulate mutation
                    mgr.stopSinglePartition(0, function () {
                        expect(p.loopIteration).to.equal(5);
                        expect(p.variables).to.equal(originalVars);
                        expect(p.stopped).to.equal(false);
                        done();
                    });
                });
            });
        });

        describe('Change 6c — updatePartitionVariables drops late writes', function () {
            var mgr, mockRun;

            beforeEach(function () {
                mockRun = {
                    isCustomParallelIterations: true,
                    options: {
                        customParallelIterations: true,
                        iterationCount: 1,
                        maxConcurrency: 1
                    },
                    state: {
                        items: [{ id: 'item1' }],
                        environment: {},
                        globals: {},
                        vaultSecrets: {},
                        collectionVariables: {},
                        _variables: {},
                        cursor: { current: sinon.stub().returns({}) }
                    },
                    queue: sinon.stub(),
                    triggers: sinon.stub(),
                    aborted: false,
                    host: { dispose: sinon.stub() }
                };
                mgr = new PartitionManager(mockRun);
                mgr.spawn();
                mgr.options = mockRun.options;
                sinon.stub(mgr, '_processPartition').callsArgWith(1, null);
            });

            it('writes when partition.stopped is false (happy path)', function (done) {
                mgr.runSinglePartition(0, null, function () {
                    var p = mgr.partitions[0],
                        VariableScope = require('postman-collection').VariableScope,
                        fakeResult = { _variables: new VariableScope() };

                    mgr.updatePartitionVariables(0, fakeResult);
                    expect(p.variables._variables).to.not.equal(fakeResult._variables);
                    // It should be a new VariableScope wrapping the result
                    expect(p.variables._variables).to.be.instanceOf(VariableScope);
                    done();
                });
            });

            it('DROPS write when partition.stopped is true (race guard)', function (done) {
                mgr.runSinglePartition(0, null, function () {
                    var p = mgr.partitions[0],
                        VariableScope = require('postman-collection').VariableScope,
                        beforeStop = p.variables._variables;

                    mgr.stopSinglePartition(0, function () {
                        // re-clone happened — capture the post-stop scope
                        var afterReset = p.variables._variables,
                            fakeLateWrite = { _variables: new VariableScope() };

                        expect(afterReset).to.not.equal(beforeStop);

                        // simulate a script-result handler firing AFTER stop:
                        mgr.updatePartitionVariables(0, fakeLateWrite);

                        // The freshly-reset scope MUST be untouched.
                        expect(p.variables._variables).to.equal(afterReset);
                        done();
                    });
                });
            });

            it('handles non-existent partition index without error', function () {
                expect(function () {
                    mgr.updatePartitionVariables(99, { _variables: {} });
                }).to.not.throw();
            });
        });

        describe('Change 5 — cr block early-returns in custom mode', function () {
            it('fires iteration trigger ONCE and returns next() without queuing more work', function () {
                var next = sinon.spy(),
                    crCoords = Object.assign({}, baseCoords, { cr: true });

                parallelProc.call(ctx, {
                    coords: crCoords,
                    static: true,
                    start: false
                }, next);

                expect(ctx.triggers.iteration.callCount).to.equal(1);
                // beforeIteration MUST NOT fire — perftest's startParallelIteration
                // will queue the next loop, which carries its own beforeIteration.
                expect(ctx.triggers.beforeIteration.callCount).to.equal(0);
                // No auto-loop: queueDelay must not run.
                expect(ctx.queueDelay.callCount).to.equal(0);
                // Early return.
                expect(next.callCount).to.equal(1);
            });

            it('preserves auto-loop in runtime-managed mode (regression)', function () {
                var next = sinon.spy(),
                    crCoords = Object.assign({}, baseCoords, {
                        cr: true,
                        iteration: 1,
                        partitionCycles: 5     // not at end of partition
                    });

                ctx.isCustomParallelIterations = false;
                parallelProc.call(ctx, {
                    coords: crCoords,
                    static: true,
                    start: false
                }, next);

                expect(ctx.triggers.iteration.callCount).to.equal(1);
                expect(ctx.triggers.beforeIteration.callCount).to.equal(1);
                expect(ctx.queueDelay.callCount).to.equal(1);
            });
        });

        describe('Change 9 — eof trigger payload normalization', function () {
            it('uses payload.coords ("loop just completed") in custom mode', function () {
                var next = sinon.spy(),
                    // payload.coords = the loop that just ended
                    payloadCoords = {
                        iteration: 2,
                        position: 1,
                        partitionIndex: 0,
                        partitionCycles: 1,
                        cr: false,
                        eof: true,
                        empty: false
                    },
                    // coords = post-rollover snapshot from whatnext (iteration+1)
                    snapshotCoords = Object.assign({}, payloadCoords, {
                        iteration: 3
                    });

                ctx.isCustomParallelIterations = true;
                // wire whatnext to return the post-rollover snapshot
                partition.cursor.whatnext.returns(snapshotCoords);

                parallelProc.call(ctx, {
                    coords: payloadCoords,
                    static: false,
                    start: false
                }, next);

                expect(ctx.triggers.iteration.callCount).to.equal(1);
                // In custom mode, the trigger must carry payload.coords
                // (iteration === 2, the loop that just completed), NOT
                // the post-rollover snapshot (iteration === 3).
                var arg = ctx.triggers.iteration.firstCall.args[1];

                expect(arg.iteration).to.equal(2);
            });

            it('preserves post-rollover coords in runtime-managed mode (regression)', function () {
                var next = sinon.spy(),
                    payloadCoords = {
                        iteration: 2,
                        position: 1,
                        partitionIndex: 0,
                        partitionCycles: 5,
                        cr: false,
                        eof: true,
                        empty: false
                    },
                    snapshotCoords = Object.assign({}, payloadCoords, {
                        iteration: 3
                    });

                ctx.isCustomParallelIterations = false;
                partition.cursor.whatnext.returns(snapshotCoords);

                parallelProc.call(ctx, {
                    coords: payloadCoords,
                    static: false,
                    start: false
                }, next);

                expect(ctx.triggers.iteration.callCount).to.equal(1);
                // Newman/desktop mode: preserve the existing post-rollover
                // behavior at the eof site. Trigger carries the snapshot
                // coords (iteration === 3).
                var arg = ctx.triggers.iteration.firstCall.args[1];

                expect(arg.iteration).to.equal(3);
            });
        });
    });

    describe('event.command sandbox-cursor sentinel transform — Change 7', function () {
        it('exposes a helper for the cycles → -1 sentinel transform', function () {
            expect(eventCommand._applySandboxCursorSentinel).to.be.a('function');
        });

        it('replaces cycles with -1 in custom mode without mutating input', function () {
            var scriptCursor = {
                    position: 0,
                    iteration: 4,
                    cycles: Number.MAX_SAFE_INTEGER,
                    partitionIndex: 0
                },
                transformed = eventCommand._applySandboxCursorSentinel(scriptCursor, true);

            expect(transformed).to.not.equal(scriptCursor);
            expect(transformed.cycles).to.equal(-1);
            // every other field preserved
            expect(transformed.position).to.equal(0);
            expect(transformed.iteration).to.equal(4);
            expect(transformed.partitionIndex).to.equal(0);
            // input untouched
            expect(scriptCursor.cycles).to.equal(Number.MAX_SAFE_INTEGER);
        });

        it('returns the cursor unchanged in runtime-managed mode', function () {
            var scriptCursor = {
                    position: 0,
                    iteration: 2,
                    cycles: 4,
                    partitionIndex: 0
                },
                transformed = eventCommand._applySandboxCursorSentinel(scriptCursor, false);

            expect(transformed).to.equal(scriptCursor);
            expect(transformed.cycles).to.equal(4);
        });
    });
});
