/**
 * Streaming iteration data — consumer-agnostic contract.
 *
 * The runner accepts iteration data either as a materialised array or as a
 * streaming source — an async-iterable of rows that also exposes a `length` —
 * so it never has to buffer a large data set. This test feeds the streaming form
 * directly (a plain async generator tagged with a length) with no CLI and no
 * dataset-engine-sdk involved — exactly what the SDK's `iterationSource()` builds.
 */

var _ = require('lodash'),
    Runner = require('../../../index.js').Runner,
    Collection = require('postman-collection').Collection,

    collection = {
        item: [{
            event: [{
                listen: 'prerequest',
                script: {
                    exec: `
                        pm.test('row matches iteration', function () {
                            pm.expect(pm.iterationData.get('n')).to.equal(pm.info.iteration);
                        });
                    `
                }
            }],
            // localhost:1 refuses instantly — keeps the test offline and fast; the
            // prerequest assertion (what we check) runs before the request anyway.
            request: { url: 'http://localhost:1/noop', method: 'GET' }
        }]
    };

// Build the generic streaming source a consumer would hand to runner.run():
// an async generator tagged with its length.
function streamingData (rows, declaredLength) {
    var gen = (async function *() {
        for (var i = 0; i < rows.length; i++) { yield rows[i]; }
    }());

    gen.length = arguments.length > 1 ? declaredLength : rows.length;

    return gen;
}

// A source that shares nothing with an async generator: a plain object whose
// `[Symbol.asyncIterator]()` hands back a *fresh* manual iterator on every call,
// and whose release hook is a consumer-supplied `return()` rather than a
// generator's `finally`. Both differences are load-bearing:
//   - a generator returns *itself* from `[Symbol.asyncIterator]()`, so the
//     generator-based tests structurally cannot notice the runner asking for a
//     second iterator. Here a second call is observable — and handing the same
//     source to two consumers is exactly what corrupted a run before nested
//     requests stopped inheriting it.
//   - `Run#_closeIterationData` invokes `return()` directly, which is a different
//     mechanism from resuming a suspended generator into its `finally`.
// Counters let the assertions state what the runner is allowed to do to a source.
function handRolledSource (rows) {
    var source = {
        length: rows.length,
        iteratorsCreated: 0,
        rowsRead: 0,
        returnCalls: 0
    };

    source[Symbol.asyncIterator] = function () {
        var i = 0;

        source.iteratorsCreated += 1;

        return {
            next () {
                if (i >= rows.length) { return Promise.resolve({ value: undefined, done: true }); }

                source.rowsRead += 1;

                return Promise.resolve({ value: rows[i++], done: false });
            },
            return () {
                source.returnCalls += 1;

                return Promise.resolve({ value: undefined, done: true });
            }
        };
    };

    return source;
}

describe('streaming iteration data', function () {
    describe('serial run over a streaming source', function () {
        var testrun,
            // The runner pulls one row per iteration (no batching on this path),
            // so a modest count proves serial streaming + order without making
            // CI run hundreds of real requests (which timed out the hook).
            TOTAL = 50,
            rows = [];

        before(function (done) {
            for (var i = 0; i < TOTAL; i++) { rows.push({ n: i }); }

            this.run({
                collection: collection,
                data: streamingData(rows)
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

        it('should derive the iteration count from the streamed length', function () {
            expect(testrun.iteration.callCount).to.equal(TOTAL);
        });

        it('should feed each iteration its row in order', function () {
            // sample the head, a couple mid-stream, and the tail
            [0, 1, 25, TOTAL - 1].forEach(function (i) {
                expect(testrun.assertion.getCall(i).args[1][0]).to.deep.include({
                    name: 'row matches iteration',
                    passed: true
                });
            });
        });
    });

    describe('over-run past the streamed rows (iterationCount > length)', function () {
        var testrun;

        before(function (done) {
            this.run({
                collection: collection,
                iterationCount: 4,
                data: streamingData([{ n: 0 }, { n: 1 }])
            }, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        it('should run the requested number of iterations', function () {
            expect(testrun.iteration.callCount).to.equal(4);
        });

        it('should reuse the last row for iterations beyond the stream', function () {
            // iterations 2 and 3 have no row -> last row ({n:1}); the script
            // asserts n === iteration, so those assertions fail (2 !== 1) but the
            // run still completes — mirroring the array path's data[length-1].
            expect(testrun.assertion.getCall(0).args[1][0]).to.include({ passed: true });
            expect(testrun.assertion.getCall(1).args[1][0]).to.include({ passed: true });
            expect(testrun.assertion.getCall(2).args[1][0]).to.include({ passed: false });
        });
    });

    describe('releasing the streaming source', function () {
        it('should call cancel once the run completes', function (done) {
            var cancelled = 0,
                // A real consumer (the SDK's iterationSource) releases the engine
                // cursor in the generator's finally; the run must trigger it on
                // teardown via the iterator's return() so it never outlives the run.
                source = (async function *() {
                    try {
                        yield { n: 0 };
                        yield { n: 1 };
                    }
                    finally { cancelled += 1; }
                }());

            source.length = 2;

            this.run({
                collection: collection,
                data: source
            }, function (err) {
                expect(err).to.not.exist;
                // Release is async now: the iterator's return() resumes the
                // generator into its finally (cancel) on the next tick, so assert
                // after it — unlike the old synchronous close().
                setImmediate(function () {
                    expect(cancelled).to.equal(1);
                    done();
                });
            });
        });
    });

    describe('multi-item collection over a streaming source', function () {
        // Regression: the row is pulled once per iteration but `waterfall` runs once
        // per *item*, so every item after the first takes the already-pulled
        // short-circuit. That path used to return a non-promise, which blew up on
        // `.catch` and double-called the instruction callback — survived only because
        // the callback was already sealed, while spraying stack traces to stderr on
        // every item of every iteration.
        var testrun,
            consoleErrors = [],
            realConsoleError = console.error,
            TOTAL = 3;

        before(function (done) {
            console.error = function () {
                consoleErrors.push(Array.prototype.slice.call(arguments).join(' '));
            };

            this.run({
                collection: {
                    item: [
                        _.cloneDeep(collection.item[0]),
                        _.cloneDeep(collection.item[0])
                    ]
                },
                data: streamingData([{ n: 0 }, { n: 1 }, { n: 2 }])
            }, function (err, results) {
                console.error = realConsoleError;
                testrun = results;
                done(err);
            });
        });

        after(function () {
            console.error = realConsoleError;
        });

        it('should complete the run successfully', function () {
            expect(testrun).to.be.ok;
            expect(testrun.done.getCall(0).args[0]).to.not.exist;
            expect(testrun.iteration.callCount).to.equal(TOTAL);
        });

        it('should feed both items of an iteration the same row', function () {
            // 2 items x 3 iterations, every one asserting n === pm.info.iteration
            expect(testrun.assertion.callCount).to.equal(TOTAL * 2);

            for (var i = 0; i < TOTAL * 2; i++) {
                expect(testrun.assertion.getCall(i).args[1][0]).to.deep.include({
                    name: 'row matches iteration',
                    passed: true
                });
            }
        });

        it('should not double-call the instruction callback', function () {
            expect(consoleErrors.join('\n')).to.not.contain('called twice');
        });
    });

    describe('nested request (pm.execution.runRequest) during a streaming run', function () {
        // Regression: the nested run inherits the parent's state, and an async
        // generator's `[Symbol.asyncIterator]()` returns *itself*. The child used to
        // derive an iterator from the same object — stealing the parent's rows — and
        // release the shared cursor on its own teardown, so every iteration after the
        // first silently saw iteration 0's row.
        var testrun,
            cancelled = 0,
            TOTAL = 3;

        before(function (done) {
            var i,
                rows = [],
                source;

            for (i = 0; i < TOTAL; i++) { rows.push({ n: i }); }

            source = (async function *() {
                try {
                    for (var j = 0; j < rows.length; j++) { yield rows[j]; }
                }
                finally { cancelled += 1; }
            }());

            source.length = rows.length;

            this.run({
                collection: {
                    item: [{
                        event: [{
                            listen: 'prerequest',
                            script: {
                                exec: `
                                    pm.test('row matches iteration', function () {
                                        pm.expect(pm.iterationData.get('n')).to.equal(pm.info.iteration);
                                    });
                                    await pm.execution.runRequest('nested-request-id');
                                    pm.test('row survives the nested request', function () {
                                        pm.expect(pm.iterationData.get('n')).to.equal(pm.info.iteration);
                                    });
                                `
                            }
                        }],
                        request: global.servers.http
                    }]
                },
                data: source,
                script: {
                    requestResolver (_requestId, _context, callback) {
                        callback(null, {
                            item: {
                                id: 'nested-request-id',
                                request: global.servers.http
                            }
                        });
                    }
                }
            }, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        it('should complete the run successfully', function () {
            expect(testrun).to.be.ok;
            expect(testrun.done.getCall(0).args[0]).to.not.exist;
            expect(testrun.iteration.callCount).to.equal(TOTAL);
        });

        it('should keep feeding each iteration its own row', function () {
            // the assertion after the `await` arrives as a separate async batch, so
            // flatten every outcome rather than assuming one call per iteration
            var i,
                outcomes = [];

            for (i = 0; i < testrun.assertion.callCount; i++) {
                outcomes = outcomes.concat(testrun.assertion.getCall(i).args[1]);
            }

            expect(outcomes).to.have.lengthOf(TOTAL * 2);
            outcomes.forEach(function (outcome) {
                expect(outcome).to.include({ passed: true });
            });
        });

        it('should not release the source until the parent run ends', function (done) {
            // the nested runs tore down long ago; only the parent's teardown releases
            setImmediate(function () {
                expect(cancelled).to.equal(1);
                done();
            });
        });
    });

    describe('hand-rolled async iterable (no generator involved)', function () {
        // Pins the contract as documented — an async-iterable plus a length — rather
        // than the one shape the dataset SDK happens to produce.
        var testrun,
            source,
            TOTAL = 3;

        before(function (done) {
            var i,
                rows = [];

            for (i = 0; i < TOTAL; i++) { rows.push({ n: i }); }
            source = handRolledSource(rows);

            this.run({
                collection: collection,
                data: source
            }, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        it('should complete the run and derive the count from length', function () {
            expect(testrun).to.be.ok;
            expect(testrun.done.getCall(0).args[0]).to.not.exist;
            expect(testrun.iteration.callCount).to.equal(TOTAL);
        });

        it('should feed each iteration its row in order', function () {
            expect(testrun.assertion.callCount).to.equal(TOTAL);

            for (var i = 0; i < TOTAL; i++) {
                expect(testrun.assertion.getCall(i).args[1][0]).to.deep.include({
                    name: 'row matches iteration',
                    passed: true
                });
            }
        });

        it('should obtain exactly one iterator for the whole run', function () {
            // more than one means some code path is re-deriving from the source, which
            // for a fresh-iterator source re-reads from row 0 and opens a second cursor
            expect(source.iteratorsCreated).to.equal(1);
        });

        it('should read one row per iteration and no more', function () {
            expect(source.rowsRead).to.equal(TOTAL);
        });

        it('should release through the consumer-supplied return()', function (done) {
            // release is async, so assert after the teardown tick
            setImmediate(function () {
                expect(source.returnCalls).to.equal(1);
                done();
            });
        });
    });

    describe('source that ends before its declared length', function () {
        var testrun;

        before(function (done) {
            // declares 4 rows, yields 2 — a dead cursor or a truncated result
            this.run({
                collection: collection,
                data: streamingData([{ n: 0 }, { n: 1 }], 4)
            }, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        it('should fail the run rather than silently repeating the last row', function () {
            var err = testrun.done.getCall(0).args[0];

            expect(err).to.be.an('error');
            expect(err.message).to.match(/iteration data source ended after 2 of 4 rows/);
        });
    });

    describe('empty source (length 0)', function () {
        // `length: 0` passes the length check, so the derived `iterationCount` is 0 and
        // `Cursor` clamps it back up to a single cycle. One iteration with an empty row
        // is therefore the expected outcome — the same shape the array path produces for
        // `data: []`, which normalises to `[{}]`. Pinned because the alternative
        // (running zero iterations, or failing) would be a silent behaviour split
        // between the two forms of iteration data.
        var testrun,
            source;

        before(function (done) {
            source = handRolledSource([]);

            this.run({
                collection: {
                    item: [{
                        event: [{
                            listen: 'prerequest',
                            script: {
                                exec: `
                                    pm.test('iteration data is empty', function () {
                                        pm.expect(pm.iterationData.toObject()).to.eql({});
                                    });
                                `
                            }
                        }],
                        request: { url: 'http://localhost:1/noop', method: 'GET' }
                    }]
                },
                data: source
            }, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        it('should complete the run', function () {
            expect(testrun).to.be.ok;
            expect(testrun.done.getCall(0).args[0]).to.not.exist;
        });

        it('should run a single iteration with an empty row', function () {
            expect(testrun.iteration.callCount).to.equal(1);
            expect(testrun.assertion.getCall(0).args[1][0]).to.deep.include({
                name: 'iteration data is empty',
                passed: true
            });
        });

        it('should not read any rows, and still release the source', function (done) {
            setImmediate(function () {
                expect(source.rowsRead).to.equal(0);
                expect(source.returnCalls).to.equal(1);
                done();
            });
        });
    });

    describe('source without a declared length', function () {
        // Driven through Runner directly, as with the parallel guard below: run()
        // rejects before a Run exists, which the shared harness does not model.
        it('should be rejected when no iterationCount is given either', function (done) {
            var runner = new Runner(),
                source = streamingData([{ n: 0 }, { n: 1 }]);

            delete source.length;

            runner.run(new Collection(collection), { data: source }, function (err) {
                expect(err).to.be.an('error');
                expect(err.message).to.match(/requires a numeric `length`/);
                done();
            });
        });

        describe('driven by an explicit iterationCount instead', function () {
            // The escape hatch for a source that cannot know its own count — a Node
            // object-mode stream, say. Deliberately runs one iteration past the two
            // rows: with no declared length there is nothing to measure the source
            // against, so exhausting it is legal and must not trip the truncation error
            // that a short *declared* source does.
            var testrun,
                released = 0;

            before(function (done) {
                var source = (async function *() {
                    try {
                        yield { n: 0 };
                        yield { n: 1 };
                    }
                    finally { released += 1; }
                }());

                this.run({
                    collection: collection,
                    iterationCount: 3,
                    data: source
                }, function (err, results) {
                    testrun = results;
                    done(err);
                });
            });

            it('should complete the run and honour the given count', function () {
                expect(testrun).to.be.ok;
                expect(testrun.done.getCall(0).args[0]).to.not.exist;
                expect(testrun.iteration.callCount).to.equal(3);
            });

            it('should feed the streamed rows, then reuse the last one', function () {
                expect(testrun.assertion.getCall(0).args[1][0]).to.include({ passed: true });
                expect(testrun.assertion.getCall(1).args[1][0]).to.include({ passed: true });
                // no row for iteration 2 -> last row ({ n: 1 }), so n !== iteration
                expect(testrun.assertion.getCall(2).args[1][0]).to.include({ passed: false });
            });

            it('should still release the source', function (done) {
                setImmediate(function () {
                    expect(released).to.equal(1);
                    done();
                });
            });
        });
    });

    describe('parallel run over a streaming source', function () {
        // Driven through Runner directly: the guard rejects the run before it
        // starts, and the shared bootstrap harness assumes run() always succeeds.
        it('should be rejected — streaming is serial-only', function (done) {
            var runner = new Runner();

            runner.run(new Collection(collection), {
                maxConcurrency: 2,
                data: streamingData([{ n: 0 }, { n: 1 }])
            }, function (err) {
                expect(err).to.be.an('error');
                expect(err.message).to.match(/streaming iteration data is not supported with parallel/i);
                done();
            });
        });
    });
});
