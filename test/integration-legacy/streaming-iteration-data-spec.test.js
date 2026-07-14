var expect = require('chai').expect,
    runtime = require('../../index'),
    sdk = require('postman-collection');

describe('Streaming iteration data', function () {
    // Exercises the streaming iteration-data path end to end through the runner:
    // a lazy async row source with a known length drives per-iteration data
    // through the sliding-window IterationDataStream, and the source is released
    // (cancel) when the run ends.
    it('should stream a row per iteration and release the source on completion', function (mochaDone) {
        var cancelled = 0,
            errored = false,
            rows = [{ n: 0 }, { n: 1 }, { n: 2 }],
            iterationsSeen = [],
            assertions = [],
            runner = new runtime.Runner(),
            collection = new sdk.Collection({
                info: {
                    name: 'streaming-iteration-data',
                    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
                },
                item: [{
                    name: 'request',
                    event: [{
                        listen: 'prerequest',
                        script: {
                            type: 'text/javascript',
                            exec: 'pm.test("row matches iteration", function () {' +
                                ' pm.expect(pm.iterationData.get("n")).to.equal(pm.info.iteration); });'
                        }
                    }],
                    // localhost:1 refuses instantly — keeps the test offline and fast; the
                    // iteration-data machinery runs before the request regardless.
                    request: { url: 'http://localhost:1/noop', method: 'GET' }
                }]
            }),

            onCancel = function () { cancelled += 1; },

            // The generic streaming descriptor any consumer hands to runner.run().
            data = {
                __streamingIterationData: true,
                length: rows.length,
                rows: (async function *() {
                    for (var i = 0; i < rows.length; i++) { yield rows[i]; }
                }()),
                cancel: onCancel
            },

            check = function (fn) {
                try { fn(); }
                catch (e) { errored = true; mochaDone(e); }
            };

        runner.run(collection, { data }, function (err, run) {
            expect(err).to.be.null;

            run.start({
                iteration (err, cursor) {
                    check(function () {
                        expect(err).to.be.null;
                        iterationsSeen.push(cursor.iteration);
                    });
                },
                assertion (cursor, results) {
                    assertions.push(results[0]);
                },
                done (err) {
                    if (errored) { return; }
                    check(function () {
                        expect(err).to.be.null;
                        // iteration count is derived from the streamed length
                        expect(iterationsSeen).to.eql([0, 1, 2]);
                        // each iteration received its own row, in order
                        expect(assertions).to.have.lengthOf(3);
                        assertions.forEach(function (a) { expect(a).to.include({ passed: true }); });
                        // the source cursor is released exactly once when the run ends
                        expect(cancelled).to.equal(1);
                    });
                    !errored && mochaDone();
                }
            });
        });
    });
});
