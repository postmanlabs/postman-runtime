/**
 * Streaming iteration data — consumer-agnostic contract.
 *
 * The runner accepts iteration data either as a materialised array or as a
 * streaming source — an async-iterable of rows that also exposes a `length` —
 * so it never has to buffer a large data set. This test feeds the streaming form
 * directly (a plain async generator tagged with a length) with no CLI and no
 * dataset-engine-sdk involved — exactly what the SDK's `iterationSource()` builds.
 */

var Runner = require('../../../index.js').Runner,
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
function streamingData (rows) {
    var gen = (async function *() {
        for (var i = 0; i < rows.length; i++) { yield rows[i]; }
    }());

    gen.length = rows.length;

    return gen;
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
