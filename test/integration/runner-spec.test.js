var _ = require('lodash'),
    expect = require('expect.js'),
    runtime = require('../../index'),
    sdk = require('postman-collection');

/* global describe, it */
describe('Runner', function () {
    describe('Set Next Request', function () {
        it('should be able to jump to the middle of a collection', function (mochaDone) {
            var runner = new runtime.Runner({
                    run: {
                        stopOnError: true
                    }
                }),
                rawCollection = require('../../example/set-next-request-middle.json'),
                collection = new sdk.Collection(rawCollection),
                testables = {
                    iterationsStarted: [],
                    iterationsComplete: [],
                    itemsStarted: {},
                    itemsComplete: {},
                },  // populate during the run, and then perform tests on it, at the end.

                /**
                 * Since each callback runs in a separate callstack, this helper function
                 * ensures that any errors are forwarded to mocha
                 *
                 * @param func
                 */
                check = function (func) {
                    try { func(); }
                    catch (e) { mochaDone(e); }
                };

            runner.run(collection, {
                iterationCount: 2
            }, function (err, run) {
                var runStore = {};  // Used for validations *during* the run. Cursor increments, etc.

                expect(err).to.be(null);
                run.start({
                    start: function (err, cursor) {
                        check(function () {
                            expect(err).to.be(null);
                            expect(cursor).to.have.property('position', 0);
                            expect(cursor).to.have.property('iteration', 0);
                            expect(cursor).to.have.property('length', 3);
                            expect(cursor).to.have.property('cycles', 2);
                            expect(cursor).to.have.property('eof', false);
                            expect(cursor).to.have.property('empty', false);
                            expect(cursor).to.have.property('bof', true);
                            expect(cursor).to.have.property('cr', false);
                            expect(cursor).to.have.property('ref');

                            // Set this to true, and verify at the end, so that the test will fail even if this
                            // callback is never called.
                            testables.started = true;
                        });
                    },
                    beforeIteration: function (err, cursor){
                        check(function () {
                            expect(err).to.be(null);

                            testables.iterationsStarted.push(cursor.iteration);
                            runStore.iteration = cursor.iteration;
                        });
                    },
                    iteration: function (err, cursor) {
                        check(function () {
                            expect(err).to.be(null);
                            expect(cursor.iteration).to.eql(runStore.iteration);

                            testables.iterationsComplete.push(cursor.iteration);
                        });
                    },
                    beforeItem: function (err, cursor, item) {
                        check(function () {
                            expect(err).to.be(null);

                            testables.itemsStarted[cursor.iteration] = testables.itemsStarted[cursor.iteration] || [];
                            testables.itemsStarted[cursor.iteration].push(item);
                            runStore.position = cursor.position;
                            runStore.ref = cursor.ref;
                        });
                    },
                    item: function (err, cursor, item) {
                        check(function () {
                            expect(err).to.be(null);
                            expect(cursor.position).to.eql(runStore.position);
                            expect(cursor.ref).to.eql(runStore.ref);

                            testables.itemsComplete[cursor.iteration] = testables.itemsComplete[cursor.iteration] || [];
                            testables.itemsComplete[cursor.iteration].push(item);
                        });
                    },
                    beforePrerequest: function (err, cursor, events, item) {
                        check(function () {
                            expect(err).to.be(null);

                            // Sanity
                            expect(cursor.iteration).to.eql(runStore.iteration);
                            expect(cursor.position).to.eql(runStore.position);
                            expect(cursor.ref).to.eql(runStore.ref);

                            expect(events.length).to.be(0);
                        });
                    },
                    prerequest: function (err, cursor, results, item) {
                        check(function () {
                            expect(err).to.be(null);

                            // Sanity
                            expect(cursor.iteration).to.eql(runStore.iteration);
                            expect(cursor.position).to.eql(runStore.position);
                            expect(cursor.ref).to.eql(runStore.ref);

                            // This collection has no pre-request scripts
                            expect(results.length).to.be(0);
                        });
                    },
                    beforeTest: function (err, cursor, events, item) {
                        check(function () {
                            expect(err).to.be(null);

                            // Sanity
                            expect(cursor.iteration).to.eql(runStore.iteration);
                            expect(cursor.position).to.eql(runStore.position);
                            expect(cursor.ref).to.eql(runStore.ref);

                            // This collection has no pre-request scripts
                            expect(events.length).to.be(1);
                        });
                    },
                    test: function (err, cursor, results, item) {
                        check(function () {
                            expect(err).to.be(null);

                            // Sanity
                            expect(cursor.iteration).to.eql(runStore.iteration);
                            expect(cursor.position).to.eql(runStore.position);
                            expect(cursor.ref).to.eql(runStore.ref);

                            // This collection has no pre-request scripts
                            expect(results.length).to.be(1);

                            var result = results[0];
                            expect(result.error).to.be(undefined);

                            var scriptResult = results[0];
                            expect(scriptResult.result.masked.scriptType).to.eql('test');
                        });
                    },
                    beforeRequest: function (err, cursor, request, item) {
                        check(function () {
                            expect(err).to.be(null);

                            // Sanity
                            expect(cursor.iteration).to.eql(runStore.iteration);
                            expect(cursor.position).to.eql(runStore.position);
                            expect(cursor.ref).to.eql(runStore.ref);
                        });
                    },
                    request: function (err, cursor, response, request, item) {
                        expect(err).to.be(null);

                        // Sanity
                        expect(cursor.iteration).to.eql(runStore.iteration);
                        expect(cursor.position).to.eql(runStore.position);
                        expect(cursor.ref).to.eql(runStore.ref);

                        expect(response.code).to.be(200);
                    },
                    done: function () {
                        expect(testables.started).to.be(true);

                        // Ensure that we ran (and completed two iterations)
                        expect(testables.iterationsStarted).to.eql([0, 1]);
                        expect(testables.iterationsComplete).to.eql([0, 1]);

                        // Expect the end position to be correct
                        expect(runStore.iteration).to.be(1);
                        expect(runStore.position).to.be(2);
                        console.log(testables);
                        console.log(runStore);
                        mochaDone();
                    }
                });
            });
        });
    });
});
