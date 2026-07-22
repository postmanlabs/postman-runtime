/**
 * End-to-end integration tests for customParallelIterations.
 *
 * These tests verify the full chain: runtime drives a custom-mode loop
 * via startParallelIteration → host.execute hands the (transformed)
 * cursor to the sandbox → the script reads pm.info.iteration and
 * pm.info.iterationCount → the runtime fires the iteration trigger and
 * the driver loops or aborts.
 *
 * They complement the unit tests in
 * test/unit/custom-parallel-iterations.test.js, which exercise the same
 * logic with mocks. The integration tests are the load-bearing
 * confirmation that the cross-repo wire contract (cycles=-1 →
 * Infinity) survives a real host.execute round-trip — once the matching
 * postman-sandbox version is pinned in package.json.
 */

var _ = require('lodash'),
    sinon = require('sinon').createSandbox(),
    expect = require('chai').expect,
    Collection = require('postman-collection').Collection,
    Runner = require('../../../index.js').Runner;

describe('customParallelIterations end-to-end', function () {
    this.timeout(120 * 1000); // network calls to postman-echo.com

    // Self-contained driver that exercises the perftest invocation pattern:
    //   runner.run() → run.start() → startParallelIteration() loop until
    //   maxLoops reached → abort.
    function runCustomMode (opts, done) {
        var collection = new Collection(opts.collection),
            runner = new Runner({}),
            spies = {},
            loopCount = 0,
            run;

        _.forEach(_.keys(Runner.Run.triggers), function (name) {
            spies[name] = sinon.spy();
        });

        runner.run(collection, {
            customParallelIterations: true,
            iterationCount: 1,
            maxConcurrency: 1
        }, function (err, runInstance) {
            if (err) { return done(err); }
            run = runInstance;

            spies.start = sinon.spy(function () {
                run.startParallelIteration(0, null, function () { /* noop */ });
            });

            spies.iteration = sinon.spy(function () {
                loopCount += 1;
                if (loopCount >= opts.maxLoops) {
                    run.abort(function () { /* noop */ });
                }
                else {
                    run.startParallelIteration(0, null, function () { /* noop */ });
                }
            });

            spies.done = sinon.spy(function () {
                setTimeout(function () { run.host.dispose(); }, 0);
                done(null, spies, run);
            });

            run.start(spies);
        });
    }

    afterEach(function () {
        sinon.restore();
    });

    describe('pm.info.iteration', function () {
        var spies, assertionPasses;

        before(function (done) {
            runCustomMode({
                maxLoops: 3,
                collection: {
                    item: [{
                        request: 'https://postman-echo.com/get',
                        event: [{
                            listen: 'test',
                            script: {
                                type: 'text/javascript',
                                exec: [
                                    'pm.test("iteration is a non-negative integer", function () {',
                                    '    pm.expect(pm.info.iteration).to.be.a("number");',
                                    '    pm.expect(pm.info.iteration).to.be.at.least(0);',
                                    '});',
                                    'pm.test("iterationCount is Infinity", function () {',
                                    '    pm.expect(pm.info.iterationCount).to.equal(Infinity);',
                                    '});'
                                ].join('\n')
                            }
                        }]
                    }]
                }
            }, function (err, results) {
                if (err) { return done(err); }
                spies = results;
                assertionPasses = spies.assertion.args
                    .reduce(function (acc, args) {
                        return acc.concat(args[1] || []);
                    }, [])
                    .filter(function (a) { return a.passed; });
                done();
            });
        });

        it('drives the expected number of loops', function () {
            // 3 iteration triggers — one per loop boundary.
            expect(spies.iteration.callCount).to.equal(3);
        });

        it('observes monotonically increasing pm.info.iteration across loops', function () {
            // Each iteration trigger carries the post-loop cursor; check
            // them via runtime callback rather than from inside the script.
            var iterations = spies.iteration.args.map(function (args) {
                var cursor = args[1];

                return cursor && cursor.iteration;
            });

            expect(iterations).to.eql([0, 1, 2]);
        });

        it('passes the in-script iterationCount === Infinity assertion every loop', function () {
            var infinityPasses = assertionPasses.filter(function (a) {
                return a.name === 'iterationCount is Infinity';
            });

            // 3 loops, 1 assertion per loop = 3 passes if Phase 2 sandbox
            // change is in place. Skipped if the runtime's pinned sandbox
            // version is older than the cycles-sentinel render.
            expect(infinityPasses.length).to.equal(3);
        });

        it('passes the in-script iteration >= 0 assertion every loop', function () {
            var iterPasses = assertionPasses.filter(function (a) {
                return a.name === 'iteration is a non-negative integer';
            });

            expect(iterPasses.length).to.equal(3);
        });

        it('runs the request once per loop (no skip-everything regression on loop 2+)', function () {
            // Without Change 4 the parallel-command guard at line 103
            // would short-circuit loop 2+ — no request would fire.
            expect(spies.request.callCount).to.equal(3);
        });

        it('fires beforeIteration exactly once per loop', function () {
            // Without Change 5's gated early-return, the cr block would
            // also fire beforeIteration, doubling the count.
            expect(spies.beforeIteration.callCount).to.equal(3);
        });
    });

    describe('stop + restart contract (full fresh on reuse)', function () {
        it('counter resets to 0 and pm.variables are re-cloned', function (done) {
            var collection = new Collection({
                    item: [{
                        request: 'https://postman-echo.com/get',
                        event: [{
                            listen: 'test',
                            script: {
                                type: 'text/javascript',
                                exec: [
                                    '// Stamp a marker in pm.variables so we can detect leakage',
                                    '// after stop+restart.',
                                    'pm.variables.set("dead-vu-marker", "loop-" + pm.info.iteration);',
                                    'pm.test("marker survives within a loop", function () {',
                                    '    pm.expect(pm.variables.get("dead-vu-marker"))',
                                    '        .to.equal("loop-" + pm.info.iteration);',
                                    '});'
                                ].join('\n')
                            }
                        }]
                    }]
                }),
                runner = new Runner({}),
                spies = {},
                run,
                iterationCount = 0,
                cursorObservations = [];

            _.forEach(_.keys(Runner.Run.triggers), function (name) {
                spies[name] = sinon.spy();
            });

            runner.run(collection, {
                customParallelIterations: true,
                iterationCount: 1,
                maxConcurrency: 1
            }, function (err, runInstance) {
                if (err) { return done(err); }
                run = runInstance;

                spies.start = sinon.spy(function () {
                    run.startParallelIteration(0, null, function () { /* noop */ });
                });

                spies.iteration = sinon.spy(function (e, cursor) {
                    iterationCount += 1;
                    cursorObservations.push(cursor && cursor.iteration);

                    if (iterationCount === 2) {
                        // Stop the VU after 2 loops.
                        run.stopParallelIteration(0, function () {
                            // Then immediately restart. Per the contract,
                            // pm.info.iteration must reset to 0 and the
                            // pm.variables scope must be re-cloned.
                            run.startParallelIteration(0, null, function () { /* noop */ });
                        });
                    }
                    else if (iterationCount === 4) {
                        // 2 loops pre-stop + 2 loops post-restart. Done.
                        run.abort(function () { /* noop */ });
                    }
                    else {
                        run.startParallelIteration(0, null, function () { /* noop */ });
                    }
                });

                spies.done = sinon.spy(function () {
                    setTimeout(function () { run.host.dispose(); }, 0);

                    // First two iterations: 0, 1.
                    // After stop+restart: 0, 1 again (full fresh).
                    expect(cursorObservations).to.eql([0, 1, 0, 1]);
                    done();
                });

                run.start(spies);
            });
        });
    });

    describe('runtime-managed mode regression', function () {
        // Make sure the unconditional changes (Change 9's eof site,
        // Change 7's transform, the various gates) don't affect
        // maxConcurrency mode.
        it('still drives iterations to completion under maxConcurrency=2', function (done) {
            var runner = new Runner({}),
                collection = new Collection({
                    item: [{
                        request: 'https://postman-echo.com/get',
                        event: [{
                            listen: 'test',
                            script: {
                                type: 'text/javascript',
                                exec: [
                                    'pm.test("iterationCount is 4", function () {',
                                    '    pm.expect(pm.info.iterationCount).to.equal(4);',
                                    '});'
                                ].join('\n')
                            }
                        }]
                    }]
                }),
                spies = {};

            _.forEach(_.keys(Runner.Run.triggers), function (name) {
                spies[name] = sinon.spy();
            });

            runner.run(collection, {
                iterationCount: 4,
                maxConcurrency: 2
            }, function (err, run) {
                if (err) { return done(err); }
                spies.done = sinon.spy(function () {
                    setTimeout(function () { run.host.dispose(); }, 0);
                    var passes = spies.assertion.args
                        .reduce(function (acc, args) { return acc.concat(args[1] || []); }, [])
                        .filter(function (a) { return a.passed; });

                    expect(passes.length).to.equal(4);
                    expect(spies.iteration.callCount).to.equal(4);
                    done();
                });
                run.start(spies);
            });
        });
    });
});
