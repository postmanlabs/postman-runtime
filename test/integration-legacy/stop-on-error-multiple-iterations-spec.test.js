var _ = require('lodash'),
    expect = require('expect.js'),
    runtime = require('../../index'),
    sdk = require('postman-collection');

/* global describe, it */
describe('Option', function () {
    describe('Stop On Error', function () {
        it('should gracefully stop in the middle of multiple iterations', function (mochaDone) {
            var errored = false,
                runner = new runtime.Runner(),
                rawCollection = {
                    'variables': [],
                    'info': {
                        'name': 'Collection',
                        '_postman_id': '3a61d579-d55d-da37-1ffe-c24950fca3ec',
                        'description': '',
                        'schema': 'https://schema.getpostman.com/json/collection/v2.0.0/collection.json'
                    },
                    'item': [
                        {
                            'name': 'First Request',
                            'event': [
                                {
                                    'listen': 'test',
                                    'script': {
                                        'type': 'text/javascript',
                                        'exec': 'if (iteration === 1) { throw new Error(\'fail\') };'
                                    }
                                }
                            ],
                            'request': 'http://postman-echo.com/get'
                        },
                        {
                            'name': 'Second Request',
                            'event': [
                                {
                                    'listen': 'test',
                                    'script': {
                                        'type': 'text/javascript',
                                        'exec': 'tests["Status code is 200"] = responseCode.code === 200;'
                                    }
                                }
                            ],
                            'request': {
                                'url': 'https://postman-echo.com/get',
                                'method': 'GET'
                            }
                        }
                    ]
                },
                collection = new sdk.Collection(rawCollection),
                testables = {
                    iterationsStarted: [],
                    iterationsComplete: [],
                    itemsStarted: {},
                    itemsComplete: {}
                }, // populate during the run, and then perform tests on it, at the end.

                /**
                 * Since each callback runs in a separate callstack, this helper function
                 * ensures that any errors are forwarded to mocha
                 *
                 * @param func
                 */
                check = function (func) {
                    try { func(); }
                    catch (e) { (errored = true) && mochaDone(e); }
                };

            runner.run(collection, {
                iterationCount: 2,
                stopOnError: true
            }, function (err, run) {
                var runStore = {}; // Used for validations *during* the run. Cursor increments, etc.

                expect(err).to.be(null);
                run.start({
                    start: function (err, cursor) {
                        check(function () {
                            expect(err).to.be(null);
                            expect(cursor).to.have.property('position', 0);
                            expect(cursor).to.have.property('iteration', 0);
                            expect(cursor).to.have.property('length', 2);
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
                    beforeIteration: function (err, cursor) {
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
                    beforePrerequest: function (err, cursor, events) {
                        check(function () {
                            expect(err).to.be(null);

                            // Sanity
                            expect(cursor.iteration).to.eql(runStore.iteration);
                            expect(cursor.position).to.eql(runStore.position);
                            expect(cursor.ref).to.eql(runStore.ref);

                            expect(events.length).to.be(0);
                        });
                    },
                    prerequest: function (err, cursor) {
                        check(function () {
                            // Sanity
                            expect(cursor.iteration).to.eql(runStore.iteration);
                            expect(cursor.position).to.eql(runStore.position);
                            expect(cursor.ref).to.eql(runStore.ref);

                            expect(err).to.be(null);
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

                            // This should never be called for the
                            // second request.
                            if (cursor.iteration === 1) {
                                expect(item.name).to.not.be('Second Request');
                            }
                        });
                    },
                    test: function (err, cursor, results, item) {
                        check(function () {
                            expect(err).to.be(null);

                            // Sanity
                            expect(cursor.iteration).to.eql(runStore.iteration);
                            expect(cursor.position).to.eql(runStore.position);
                            expect(cursor.ref).to.eql(runStore.ref);

                            var scriptResult = results[0];
                            expect(scriptResult.result.target).to.eql('test');

                            if (cursor.iteration === 1 && item.name === 'First Request') {
                                expect(scriptResult.error).to.have.property('message', 'fail');
                                return;
                            }
                            expect(scriptResult.error).to.be(undefined);
                        });
                    },
                    beforeRequest: function (err, cursor) {
                        check(function () {
                            expect(err).to.be(null);

                            // Sanity
                            expect(cursor.iteration).to.eql(runStore.iteration);
                            expect(cursor.position).to.eql(runStore.position);
                            expect(cursor.ref).to.eql(runStore.ref);
                        });
                    },
                    request: function (err, cursor, response, request) {
                        check(function () {
                            // Sanity
                            expect(cursor.iteration).to.eql(runStore.iteration);
                            expect(cursor.position).to.eql(runStore.position);
                            expect(cursor.ref).to.eql(runStore.ref);

                            expect(request).to.be.ok();
                            expect(request.url.toString()).to.be.ok();

                            expect(err).to.be(null);
                            expect(response.code).to.be(200);
                        });
                    },
                    done: function (err) {
                        expect(err).to.be(null);
                        expect(testables.started).to.be(true);

                        // Ensure that we ran (and completed three iterations)
                        // The second iteration should be stopped at the second request.
                        expect(testables.iterationsStarted).to.eql([0, 1]);
                        expect(testables.iterationsComplete).to.eql([0, 1]);

                        // First iteration
                        expect(testables.itemsStarted[0].length).to.be(2);
                        expect(testables.itemsComplete[0].length).to.be(2);
                        expect(_.map(testables.itemsStarted[0], 'name')).to.eql([
                            'First Request', 'Second Request'
                        ]);
                        expect(_.map(testables.itemsComplete[0], 'name')).to.eql([
                            'First Request', 'Second Request'
                        ]);

                        // Second Iteration
                        expect(testables.itemsStarted[1].length).to.be(1);
                        expect(testables.itemsComplete[1].length).to.be(1);
                        expect(_.map(testables.itemsStarted[1], 'name')).to.eql([
                            'First Request'
                        ]);
                        expect(_.map(testables.itemsComplete[1], 'name')).to.eql([
                            'First Request'
                        ]);

                        !errored && mochaDone();
                    }
                });
            });
        });
    });
});
