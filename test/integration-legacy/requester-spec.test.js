var _ = require('lodash'),
    request = require('postman-request'),
    expect = require('expect.js'),
    runtime = require('../../index'),
    zlib = require('zlib'),
    sdk = require('postman-collection');

/* global describe, it */
describe('Requester', function () {
    describe('Option Redirect', function () {
        it('should be able to avoid redirects', function (mochaDone) {
            var errored = false,
                runner = new runtime.Runner(),
                rawCollection = {
                    "variables": [],
                    "info": {
                        "name": "NewmanSetNextRequest",
                        "_postman_id": "d6f7bb29-2258-4e1b-9576-b2315cf5b77e",
                        "description": "",
                        "schema": "https://schema.getpostman.com/json/collection/v2.0.0/collection.json"
                    },
                    "item": [
                        {
                            "id": "bf0a6006-c987-253a-525d-9f6be7071210",
                            "name": "First Request",
                            "event": [
                                {
                                    "listen": "test",
                                    "script": {
                                        "type": "text/javascript",
                                        "exec": "tests['worked'] = responseCode.code === 302;"
                                    }
                                }
                            ],
                            "request": {
                                "url": "https://postman-echo.com/redirect-to?url=https://postman-echo.com/get",
                                "method": "GET"
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
                },  // populate during the run, and then perform tests on it, at the end.

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
                iterationCount: 1,
                requester: {
                    followRedirects: false
                }
            }, function (err, run) {
                var runStore = {};  // Used for validations *during* the run. Cursor increments, etc.

                expect(err).to.be(null);
                run.start({
                    start: function (err, cursor) {
                        check(function () {
                            expect(err).to.be(null);
                            expect(cursor).to.have.property('position', 0);
                            expect(cursor).to.have.property('iteration', 0);
                            expect(cursor).to.have.property('length', 1);
                            expect(cursor).to.have.property('cycles', 1);
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
                            expect(scriptResult.result.target).to.eql('test');
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
                        check(function () {
                            expect(err).to.be(null);

                            expect(request.url.toString()).to.be.ok();

                            // Sanity
                            expect(cursor.iteration).to.eql(runStore.iteration);
                            expect(cursor.position).to.eql(runStore.position);
                            expect(cursor.ref).to.eql(runStore.ref);

                            expect(response.code).to.be(302);
                            expect(request).to.be.ok();
                        });
                    },
                    done: function (err) {
                        check(function () {
                            expect(err).to.be(null);
                            !errored && mochaDone();
                        });
                    }
                });
            });
        });

        it('should follow redirects by default', function (mochaDone) {
            var errored = false,
                runner = new runtime.Runner(),
                rawCollection = {
                    "variables": [],
                    "info": {
                        "name": "NewmanSetNextRequest",
                        "_postman_id": "d6f7bb29-2258-4e1b-9576-b2315cf5b77e",
                        "description": "",
                        "schema": "https://schema.getpostman.com/json/collection/v2.0.0/collection.json"
                    },
                    "item": [
                        {
                            "id": "bf0a6006-c987-253a-525d-9f6be7071210",
                            "name": "First Request",
                            "event": [
                                {
                                    "listen": "test",
                                    "script": {
                                        "type": "text/javascript",
                                        "exec": "tests['worked'] = responseCode.code === 302;"
                                    }
                                }
                            ],
                            "request": {
                                "url": "https://postman-echo.com/redirect-to?url=https://postman-echo.com/get",
                                "method": "GET"
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
                },  // populate during the run, and then perform tests on it, at the end.

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
                iterationCount: 1
                // This is set to true by default, so commented out
                // requester: {
                //     followRedirects: true
                // }
            }, function (err, run) {
                var runStore = {};  // Used for validations *during* the run. Cursor increments, etc.

                expect(err).to.be(null);
                run.start({
                    start: function (err, cursor) {
                        check(function () {
                            expect(err).to.be(null);
                            expect(cursor).to.have.property('position', 0);
                            expect(cursor).to.have.property('iteration', 0);
                            expect(cursor).to.have.property('length', 1);
                            expect(cursor).to.have.property('cycles', 1);
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
                            expect(scriptResult.result.target).to.eql('test');
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
                        check(function () {
                            expect(err).to.be(null);

                            expect(request.url.toString()).to.be.ok();

                            // Sanity
                            expect(cursor.iteration).to.eql(runStore.iteration);
                            expect(cursor.position).to.eql(runStore.position);
                            expect(cursor.ref).to.eql(runStore.ref);

                            expect(response.code).to.be(200);
                            expect(request).to.be.ok();
                        });
                    },
                    done: function (err) {
                        check(function () {
                            expect(err).to.be(null);
                            !errored && mochaDone();
                        });
                    }
                });
            });
        });
    });

    describe('Empty Request body', function () {
        it('should not send the request body if it is empty in the raw mode', function (mochaDone) {
            var errored = false,
                runner = new runtime.Runner(),
                rawCollection = {
                    "variables": [],
                    "info": {
                        "name": "EmptyRawBody",
                        "_postman_id": "d6f7bb29-2258-4e1b-9576-b2315cf5b77e",
                        "schema": "https://schema.getpostman.com/json/collection/v2.0.0/collection.json"
                    },
                    "item": [
                        {
                            "id": "bf0a6006-c987-253a-525d-9f6be7071210",
                            "name": "First Request",
                            "request": {
                                "url": "http://postman-echo.com/post",
                                "method": "POST",
                                "body": {
                                    "mode": "raw",
                                    "raw": ""
                                }
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
                },  // populate during the run, and then perform tests on it, at the end.

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
                iterationCount: 1,
                requester: {
                    followRedirects: false
                }
            }, function (err, run) {
                var runStore = {};  // Used for validations *during* the run. Cursor increments, etc.

                expect(err).to.be(null);
                run.start({
                    start: function (err, cursor) {
                        check(function () {
                            expect(err).to.be(null);
                            expect(cursor).to.have.property('position', 0);
                            expect(cursor).to.have.property('iteration', 0);
                            expect(cursor).to.have.property('length', 1);
                            expect(cursor).to.have.property('cycles', 1);
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
                            expect(results).to.be.empty();
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
                            expect(events).to.be.empty();
                        });
                    },
                    test: function (err, cursor, results, item) {
                        check(function () {
                            expect(err).to.be(null);

                            // Sanity
                            expect(cursor.iteration).to.eql(runStore.iteration);
                            expect(cursor.position).to.eql(runStore.position);
                            expect(cursor.ref).to.eql(runStore.ref);
                            expect(results).to.be.empty();
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
                        check(function () {
                            expect(err).to.be(null);

                            expect(request.url.toString()).to.be.ok();

                            // Sanity
                            expect(cursor.iteration).to.eql(runStore.iteration);
                            expect(cursor.position).to.eql(runStore.position);
                            expect(cursor.ref).to.eql(runStore.ref);

                            expect(response.code).to.be(200);
                            expect(request).to.be.ok();

                            var body = response.json();
                            expect(body.args).to.be.empty();
                            expect(body.data).to.be.empty();
                            expect(body.files).to.be.empty();
                            expect(body.form).to.be.empty();
                        });
                    },
                    done: function (err) {
                        check(function () {
                            expect(err).to.be(null);
                            !errored && mochaDone();
                        });
                    }
                });
            });
        });

        it('should not send the request body if it is empty in the urlencoded mode', function (mochaDone) {
            var errored = false,
                runner = new runtime.Runner(),
                rawCollection = {
                    "variables": [],
                    "info": {
                        "name": "EmptyRawBody",
                        "_postman_id": "d6f7bb29-2258-4e1b-9576-b2315cf5b77e",
                        "schema": "https://schema.getpostman.com/json/collection/v2.0.0/collection.json"
                    },
                    "item": [
                        {
                            "id": "bf0a6006-c987-253a-525d-9f6be7071210",
                            "name": "First Request",
                            "request": {
                                "url": "http://postman-echo.com/post",
                                "method": "POST",
                                "body": {
                                    "mode": "urlencoded",
                                    "urlencoded": []
                                }
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
                },  // populate during the run, and then perform tests on it, at the end.

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
                iterationCount: 1,
                requester: {
                    followRedirects: false
                }
            }, function (err, run) {
                var runStore = {};  // Used for validations *during* the run. Cursor increments, etc.

                expect(err).to.be(null);
                run.start({
                    start: function (err, cursor) {
                        check(function () {
                            expect(err).to.be(null);
                            expect(cursor).to.have.property('position', 0);
                            expect(cursor).to.have.property('iteration', 0);
                            expect(cursor).to.have.property('length', 1);
                            expect(cursor).to.have.property('cycles', 1);
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
                            expect(results).to.be.empty();
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
                            expect(events).to.be.empty();
                        });
                    },
                    test: function (err, cursor, results, item) {
                        check(function () {
                            expect(err).to.be(null);

                            // Sanity
                            expect(cursor.iteration).to.eql(runStore.iteration);
                            expect(cursor.position).to.eql(runStore.position);
                            expect(cursor.ref).to.eql(runStore.ref);
                            expect(results).to.be.empty();
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
                        check(function () {
                            expect(err).to.be(null);

                            expect(request.url.toString()).to.be.ok();

                            // Sanity
                            expect(cursor.iteration).to.eql(runStore.iteration);
                            expect(cursor.position).to.eql(runStore.position);
                            expect(cursor.ref).to.eql(runStore.ref);

                            expect(response.code).to.be(200);
                            expect(request).to.be.ok();

                            var body = response.json();
                            expect(body.args).to.be.empty();
                            expect(body.data).to.be.empty();
                            expect(body.files).to.be.empty();
                            expect(body.form).to.be.empty();
                        });
                    },
                    done: function (err) {
                        check(function () {
                            expect(err).to.be(null);
                            !errored && mochaDone();
                        });
                    }
                });
            });
        });
        it('should not send the request body if it is empty in the formdata mode', function (mochaDone) {
            var errored = false,
                runner = new runtime.Runner(),
                rawCollection = {
                    "variables": [],
                    "info": {
                        "name": "EmptyRawBody",
                        "_postman_id": "d6f7bb29-2258-4e1b-9576-b2315cf5b77e",
                        "schema": "https://schema.getpostman.com/json/collection/v2.0.0/collection.json"
                    },
                    "item": [
                        {
                            "id": "bf0a6006-c987-253a-525d-9f6be7071210",
                            "name": "First Request",
                            "request": {
                                "url": "http://postman-echo.com/post",
                                "method": "POST",
                                "body": {
                                    "mode": "formdata",
                                    "formdata": []
                                }
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
                },  // populate during the run, and then perform tests on it, at the end.

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
                iterationCount: 1,
                requester: {
                    followRedirects: false
                }
            }, function (err, run) {
                var runStore = {};  // Used for validations *during* the run. Cursor increments, etc.

                expect(err).to.be(null);
                run.start({
                    start: function (err, cursor) {
                        check(function () {
                            expect(err).to.be(null);
                            expect(cursor).to.have.property('position', 0);
                            expect(cursor).to.have.property('iteration', 0);
                            expect(cursor).to.have.property('length', 1);
                            expect(cursor).to.have.property('cycles', 1);
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
                            expect(results).to.be.empty();
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
                            expect(events).to.be.empty();
                        });
                    },
                    test: function (err, cursor, results, item) {
                        check(function () {
                            expect(err).to.be(null);

                            // Sanity
                            expect(cursor.iteration).to.eql(runStore.iteration);
                            expect(cursor.position).to.eql(runStore.position);
                            expect(cursor.ref).to.eql(runStore.ref);
                            expect(results).to.be.empty();
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
                        check(function () {
                            expect(err).to.be(null);

                            expect(request.url.toString()).to.be.ok();

                            // Sanity
                            expect(cursor.iteration).to.eql(runStore.iteration);
                            expect(cursor.position).to.eql(runStore.position);
                            expect(cursor.ref).to.eql(runStore.ref);

                            expect(response.code).to.be(200);
                            expect(request).to.be.ok();

                            var body = response.json();
                            expect(body.args).to.be.empty();
                            expect(body.data).to.be.empty();
                            expect(body.files).to.be.empty();
                            expect(body.form).to.be.empty();
                        });
                    },
                    done: function (err) {
                        check(function () {
                            expect(err).to.be(null);
                            !errored && mochaDone();
                        });
                    }
                });
            });
        });
    });

    it('should support multiple headers with the same name', function (mochaDone) {
        var errored = false,
            runner = new runtime.Runner(),
            rawCollection = {
                "variables": [],
                "info": {
                    "name": "TestCollection",
                    "_postman_id": "d6f7bb29-2258-4e1b-9576-b2315cf5b77e",
                    "description": "",
                    "schema": "https://schema.getpostman.com/json/collection/v2.0.0/collection.json"
                },
                "item": [
                    {
                        "id": "bf0a6006-c987-253a-525d-9f6be7071210",
                        "name": "First Request",
                        "request": {
                            "url": "http://postman-echo.com/headers",
                            "method": "GET",
                            "header": [
                                {
                                    "key": "xx",
                                    "value": "yy"
                                },
                                {
                                    "key": "xx",
                                    "value": "zz"
                                }
                            ]
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
            },  // populate during the run, and then perform tests on it, at the end.

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
            iterationCount: 1,
            requester: {
                followRedirects: false
            }
        }, function (err, run) {
            var runStore = {};  // Used for validations *during* the run. Cursor increments, etc.

            expect(err).to.be(null);
            run.start({
                start: function (err, cursor) {
                    check(function () {
                        expect(err).to.be(null);
                        expect(cursor).to.have.property('position', 0);
                        expect(cursor).to.have.property('iteration', 0);
                        expect(cursor).to.have.property('length', 1);
                        expect(cursor).to.have.property('cycles', 1);
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
                beforeTest: function (err, cursor) {
                    check(function () {
                        expect(err).to.be(null);

                        // Sanity
                        expect(cursor.iteration).to.eql(runStore.iteration);
                        expect(cursor.position).to.eql(runStore.position);
                        expect(cursor.ref).to.eql(runStore.ref);
                    });
                },
                test: function (err, cursor) {
                    check(function () {
                        expect(err).to.be(null);

                        // Sanity
                        expect(cursor.iteration).to.eql(runStore.iteration);
                        expect(cursor.position).to.eql(runStore.position);
                        expect(cursor.ref).to.eql(runStore.ref);
                    });
                },
                beforeRequest: function (err, cursor, request) {
                    check(function () {
                        expect(err).to.be(null);

                        expect(request.headers.count()).to.be(2);

                        // Sanity
                        expect(cursor.iteration).to.eql(runStore.iteration);
                        expect(cursor.position).to.eql(runStore.position);
                        expect(cursor.ref).to.eql(runStore.ref);
                    });
                },
                request: function (err, cursor, response, request) {
                    check(function () {
                        expect(err).to.be(null);

                        expect(request.url.toString()).to.be.ok();

                        // Sanity
                        expect(cursor.iteration).to.eql(runStore.iteration);
                        expect(cursor.position).to.eql(runStore.position);
                        expect(cursor.ref).to.eql(runStore.ref);

                        var body = response.json();
                        expect(body).to.have.property('headers');
                        expect(body.headers).to.have.property('xx', 'yy, zz');
                        expect(response.code).to.be(200);
                        expect(request).to.be.ok();
                    });
                },
                done: function (err) {
                    check(function () {
                        expect(err).to.be(null);
                        !errored && mochaDone();
                    });
                }
            });
        });
    });

    it('should upload multiple formdata parameters with the same name', function (mochaDone) {
        var errored = false,
            runner = new runtime.Runner(),
            rawCollection = {
                "variables": [],
                "info": {
                    "name": "TestCollection",
                    "_postman_id": "d6f7bb29-2258-4e1b-9576-b2315cf5b77e",
                    "description": "",
                    "schema": "https://schema.getpostman.com/json/collection/v2.0.0/collection.json"
                },
                "item": [
                    {
                        "id": "bf0a6006-c987-253a-525d-9f6be7071210",
                        "name": "First Request",
                        "request": {
                            "url": "https://postman-echo.com/post",
                            "method": "POST",
                            "body": {
                                "mode": "formdata",
                                "formdata": [
                                    {
                                        "key": "xx",
                                        "value": "yy"
                                    },
                                    {
                                        "key": "xx",
                                        "value": "zz"
                                    }
                                ]
                            }
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
            },  // populate during the run, and then perform tests on it, at the end.

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
            iterationCount: 1,
            requester: {
                followRedirects: false
            }
        }, function (err, run) {
            var runStore = {};  // Used for validations *during* the run. Cursor increments, etc.

            expect(err).to.be(null);
            run.start({
                start: function (err, cursor) {
                    check(function () {
                        expect(err).to.be(null);
                        expect(cursor).to.have.property('position', 0);
                        expect(cursor).to.have.property('iteration', 0);
                        expect(cursor).to.have.property('length', 1);
                        expect(cursor).to.have.property('cycles', 1);
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
                beforeTest: function (err, cursor) {
                    check(function () {
                        expect(err).to.be(null);

                        // Sanity
                        expect(cursor.iteration).to.eql(runStore.iteration);
                        expect(cursor.position).to.eql(runStore.position);
                        expect(cursor.ref).to.eql(runStore.ref);
                    });
                },
                test: function (err, cursor) {
                    check(function () {
                        expect(err).to.be(null);

                        // Sanity
                        expect(cursor.iteration).to.eql(runStore.iteration);
                        expect(cursor.position).to.eql(runStore.position);
                        expect(cursor.ref).to.eql(runStore.ref);
                    });
                },
                beforeRequest: function (err, cursor, request) {
                    check(function () {
                        expect(err).to.be(null);

                        expect(request.headers.count()).to.be(0);

                        // Sanity
                        expect(cursor.iteration).to.eql(runStore.iteration);
                        expect(cursor.position).to.eql(runStore.position);
                        expect(cursor.ref).to.eql(runStore.ref);
                    });
                },
                request: function (err, cursor, response, request) {
                    check(function () {
                        expect(err).to.be(null);

                        expect(request.url.toString()).to.be.ok();

                        // Sanity
                        expect(cursor.iteration).to.eql(runStore.iteration);
                        expect(cursor.position).to.eql(runStore.position);
                        expect(cursor.ref).to.eql(runStore.ref);

                        var body = response.json();
                        expect(body.form).to.have.property('xx');
                        expect(body.form.xx).to.eql(['yy', 'zz']);
                        expect(response.code).to.be(200);
                        expect(request).to.be.ok();
                    });
                },
                done: function (err) {
                    check(function () {
                        expect(err).to.be(null);
                        !errored && mochaDone();
                    });
                }
            });
        });
    });

    describe('File Handling', function () {
        it('should upload a file if a file resolver is provided', function (mochaDone) {
            var errored = false,
                runner = new runtime.Runner(),
                fakeFileResolver = {
                    createReadStream: function () {
                        return "fake-file-content"
                    }
                },
                rawCollection = {
                    "variables": [],
                    "info": {
                        "name": "EmptyRawBody",
                        "_postman_id": "d6f7bb29-2258-4e1b-9576-b2315cf5b77e",
                        "schema": "https://schema.getpostman.com/json/collection/v2.0.0/collection.json"
                    },
                    "item": [
                        {
                            "id": "bf0a6006-c987-253a-525d-9f6be7071210",
                            "name": "First Request",
                            "request": {
                                "url": "http://postman-echo.com/post",
                                "method": "POST",
                                "body": {
                                    "mode": "formdata",
                                    "formdata": [
                                        {
                                            "key": "myfile",
                                            "type": "file",
                                            "src": "/some/path"
                                        }
                                    ]
                                }
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
                },  // populate during the run, and then perform tests on it, at the end.

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
                iterationCount: 1,
                requester: {
                    followRedirects: false,
                },
                fileResolver: fakeFileResolver
            }, function (err, run) {
                var runStore = {};  // Used for validations *during* the run. Cursor increments, etc.

                expect(err).to.be(null);
                run.start({
                    start: function (err, cursor) {
                        check(function () {
                            expect(err).to.be(null);
                            expect(cursor).to.have.property('position', 0);
                            expect(cursor).to.have.property('iteration', 0);
                            expect(cursor).to.have.property('length', 1);
                            expect(cursor).to.have.property('cycles', 1);
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
                            expect(results).to.be.empty();
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
                            expect(events).to.be.empty();
                        });
                    },
                    test: function (err, cursor, results, item) {
                        check(function () {
                            expect(err).to.be(null);

                            // Sanity
                            expect(cursor.iteration).to.eql(runStore.iteration);
                            expect(cursor.position).to.eql(runStore.position);
                            expect(cursor.ref).to.eql(runStore.ref);
                            expect(results).to.be.empty();
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
                        check(function () {
                            expect(err).to.be(null);

                            expect(request.url.toString()).to.be.ok();

                            // Sanity
                            expect(cursor.iteration).to.eql(runStore.iteration);
                            expect(cursor.position).to.eql(runStore.position);
                            expect(cursor.ref).to.eql(runStore.ref);

                            expect(response.code).to.be(200);
                            expect(request).to.be.ok();

                            var body = response.json();
                            expect(body.args).to.be.empty();
                            expect(body.data).to.be.empty();
                            expect(body.files).to.be.empty();
                            expect(body.form).to.be.eql({ myfile: 'fake-file-content' });
                        });
                    },
                    done: function (err) {
                        check(function () {
                            expect(err).to.be(null);
                            !errored && mochaDone();
                        });
                    }
                });
            });
        });

        it('should not upload a file if no file resolver is provided', function (mochaDone) {
            var errored = false,
                runner = new runtime.Runner(),
                rawCollection = {
                    "variables": [],
                    "info": {
                        "name": "EmptyRawBody",
                        "_postman_id": "d6f7bb29-2258-4e1b-9576-b2315cf5b77e",
                        "schema": "https://schema.getpostman.com/json/collection/v2.0.0/collection.json"
                    },
                    "item": [
                        {
                            "id": "bf0a6006-c987-253a-525d-9f6be7071210",
                            "name": "First Request",
                            "request": {
                                "url": "http://postman-echo.com/post",
                                "method": "POST",
                                "body": {
                                    "mode": "formdata",
                                    "formdata": [
                                        {
                                            "key": "myfile",
                                            "type": "file",
                                            "src": "/some/path"
                                        }
                                    ]
                                }
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
                },  // populate during the run, and then perform tests on it, at the end.

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
                iterationCount: 1,
                requester: {
                    followRedirects: false
                }
            }, function (err, run) {
                var runStore = {};  // Used for validations *during* the run. Cursor increments, etc.

                expect(err).to.be(null);
                run.start({
                    console: function (cursor, level, message) {
                        check(function () {
                            // Sanity
                            expect(cursor.iteration).to.eql(runStore.iteration);
                            expect(cursor.position).to.eql(runStore.position);
                            expect(cursor.ref).to.eql(runStore.ref);

                            expect(level).to.be('warn');
                            expect(message).to.be('unable to load form file for upload: "/some/path"');
                        });
                    },
                    start: function (err, cursor) {
                        check(function () {
                            expect(err).to.be(null);
                            expect(cursor).to.have.property('position', 0);
                            expect(cursor).to.have.property('iteration', 0);
                            expect(cursor).to.have.property('length', 1);
                            expect(cursor).to.have.property('cycles', 1);
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
                            expect(results).to.be.empty();
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
                            expect(events).to.be.empty();
                        });
                    },
                    test: function (err, cursor, results, item) {
                        check(function () {
                            expect(err).to.be(null);

                            // Sanity
                            expect(cursor.iteration).to.eql(runStore.iteration);
                            expect(cursor.position).to.eql(runStore.position);
                            expect(cursor.ref).to.eql(runStore.ref);
                            expect(results).to.be.empty();
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
                        check(function () {
                            expect(err).to.be(null);

                            expect(request.url.toString()).to.be.ok();

                            // Sanity
                            expect(cursor.iteration).to.eql(runStore.iteration);
                            expect(cursor.position).to.eql(runStore.position);
                            expect(cursor.ref).to.eql(runStore.ref);

                            expect(response.code).to.be(200);
                            expect(request).to.be.ok();

                            var body = response.json();
                            expect(body.args).to.be.empty();
                            expect(body.data).to.be.empty();
                            expect(body.files).to.be.empty();
                            expect(body.form).to.be.empty();
                        });
                    },
                    done: function (err) {
                        check(function () {
                            expect(err).to.be(null);
                            !errored && mochaDone();
                        });
                    }
                });
            });
        });

        it('should upload multiple files multiple if files are provided', function (mochaDone) {
            var errored = false,
                runner = new runtime.Runner(),
                rawCollection = {
                    "variables": [],
                    "info": {
                        "name": "EmptyRawBody",
                        "_postman_id": "d6f7bb29-2258-4e1b-9576-b2315cf5b77e",
                        "schema": "https://schema.getpostman.com/json/collection/v2.0.0/collection.json"
                    },
                    "item": [
                        {
                            "id": "bf0a6006-c987-253a-525d-9f6be7071210",
                            "name": "First Request",
                            "request": {
                                "url": "http://postman-echo.com/post",
                                "method": "POST",
                                "body": {
                                    "mode": "formdata",
                                    "formdata": [
                                        {
                                            "key": "files",
                                            "type": "file",
                                            "src": require('path').join(__dirname, 'data', 'one.txt')
                                        },
                                        {
                                            "key": "files",
                                            "type": "file",
                                            "src": require('path').join(__dirname, 'data', 'two.txt')
                                        }
                                    ]
                                }
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
                },  // populate during the run, and then perform tests on it, at the end.

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
                iterationCount: 1,
                requester: {
                    followRedirects: false,
                },
                fileResolver: require('fs')
            }, function (err, run) {
                var runStore = {};  // Used for validations *during* the run. Cursor increments, etc.

                expect(err).to.be(null);
                run.start({
                    console: function () {
                        check(function () {
                            throw new Error('Console should not be called!');
                        });
                    },
                    start: function (err, cursor) {
                        check(function () {
                            expect(err).to.be(null);
                            expect(cursor).to.have.property('position', 0);
                            expect(cursor).to.have.property('iteration', 0);
                            expect(cursor).to.have.property('length', 1);
                            expect(cursor).to.have.property('cycles', 1);
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
                            expect(results).to.be.empty();
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
                            expect(events).to.be.empty();
                        });
                    },
                    test: function (err, cursor, results, item) {
                        check(function () {
                            expect(err).to.be(null);

                            // Sanity
                            expect(cursor.iteration).to.eql(runStore.iteration);
                            expect(cursor.position).to.eql(runStore.position);
                            expect(cursor.ref).to.eql(runStore.ref);
                            expect(results).to.be.empty();
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
                        check(function () {
                            expect(err).to.be(null);

                            expect(request.url.toString()).to.be.ok();

                            // Sanity
                            expect(cursor.iteration).to.eql(runStore.iteration);
                            expect(cursor.position).to.eql(runStore.position);
                            expect(cursor.ref).to.eql(runStore.ref);

                            expect(response.code).to.be(200);
                            expect(request).to.be.ok();

                            var body = response.json();
                            expect(body.args).to.be.empty();
                            expect(body.data).to.be.empty();
                            expect(body.files).to.have.property('one.txt');
                            expect(body.files).to.have.property('two.txt');
                            expect(body.form).to.be.empty();
                        });
                    },
                    done: function (err) {
                        check(function () {
                            expect(err).to.be(null);
                            !errored && mochaDone();
                        });
                    }
                });
            });
        });

        it('should upload a mixture of file and string formdata parameters', function (mochaDone) {
            var errored = false,
                runner = new runtime.Runner(),
                rawCollection = {
                    "variables": [],
                    "info": {
                        "name": "EmptyRawBody",
                        "_postman_id": "d6f7bb29-2258-4e1b-9576-b2315cf5b77e",
                        "schema": "https://schema.getpostman.com/json/collection/v2.0.0/collection.json"
                    },
                    "item": [
                        {
                            "id": "bf0a6006-c987-253a-525d-9f6be7071210",
                            "name": "First Request",
                            "request": {
                                "url": "http://postman-echo.com/post",
                                "method": "POST",
                                "body": {
                                    "mode": "formdata",
                                    "formdata": [
                                        {
                                            "key": "files",
                                            "type": "file",
                                            "src": require('path').join(__dirname, 'data', 'one.txt')
                                        },
                                        {
                                            "key": "myParam",
                                            "value": "myValue"
                                        }
                                    ]
                                }
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
                },  // populate during the run, and then perform tests on it, at the end.

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
                iterationCount: 1,
                requester: {
                    followRedirects: false,
                },
                fileResolver: require('fs')
            }, function (err, run) {
                var runStore = {};  // Used for validations *during* the run. Cursor increments, etc.

                expect(err).to.be(null);
                run.start({
                    console: function () {
                        check(function () {
                            throw new Error('Console should not be called!');
                        });
                    },
                    start: function (err, cursor) {
                        check(function () {
                            expect(err).to.be(null);
                            expect(cursor).to.have.property('position', 0);
                            expect(cursor).to.have.property('iteration', 0);
                            expect(cursor).to.have.property('length', 1);
                            expect(cursor).to.have.property('cycles', 1);
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
                            expect(results).to.be.empty();
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
                            expect(events).to.be.empty();
                        });
                    },
                    test: function (err, cursor, results, item) {
                        check(function () {
                            expect(err).to.be(null);

                            // Sanity
                            expect(cursor.iteration).to.eql(runStore.iteration);
                            expect(cursor.position).to.eql(runStore.position);
                            expect(cursor.ref).to.eql(runStore.ref);
                            expect(results).to.be.empty();
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
                        check(function () {
                            expect(err).to.be(null);

                            expect(request.url.toString()).to.be.ok();

                            // Sanity
                            expect(cursor.iteration).to.eql(runStore.iteration);
                            expect(cursor.position).to.eql(runStore.position);
                            expect(cursor.ref).to.eql(runStore.ref);

                            expect(response.code).to.be(200);
                            expect(request).to.be.ok();

                            var body = response.json();
                            expect(body.args).to.be.empty();
                            expect(body.data).to.be.empty();
                            expect(body.files).to.have.property('one.txt');
                            expect(body.form).to.have.property('myParam', 'myValue');
                        });
                    },
                    done: function (err) {
                        check(function () {
                            expect(err).to.be(null);
                            !errored && mochaDone();
                        });
                    }
                });
            });
        });

        it('should upload a binary data file', function (mochaDone) {
            var errored = false,
                runner = new runtime.Runner(),
                path = require('path'),
                rawCollection = {
                    "variables": [],
                    "info": {
                        "name": "EmptyRawBody",
                        "_postman_id": "d6f7bb29-2258-4e1b-9576-b2315cf5b77e",
                        "schema": "https://schema.getpostman.com/json/collection/v2.0.0/collection.json"
                    },
                    "item": [
                        {
                            "id": "bf0a6006-c987-253a-525d-9f6be7071210",
                            "name": "First Request",
                            "request": {
                                "url": "https://postman-echo.com/post",
                                "method": "POST",
                                "body": {
                                    "mode": "formdata",
                                    "formdata": [
                                        {
                                            "key": "file",
                                            "type": "file",
                                            "src": path.join(__dirname, 'data', 'binary-file.png')
                                        }
                                    ]
                                }
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
                },  // populate during the run, and then perform tests on it, at the end.

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
                iterationCount: 1,
                requester: {
                    followRedirects: false
                },
                fileResolver: require('fs')
            }, function (err, run) {
                var runStore = {};  // Used for validations *during* the run. Cursor increments, etc.

                expect(err).to.be(null);
                run.start({
                    console: function () {
                        check(function () {
                            throw new Error('Console should not be called!');
                        });
                    },
                    start: function (err, cursor) {
                        check(function () {
                            expect(err).to.be(null);
                            expect(cursor).to.have.property('position', 0);
                            expect(cursor).to.have.property('iteration', 0);
                            expect(cursor).to.have.property('length', 1);
                            expect(cursor).to.have.property('cycles', 1);
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
                            expect(results).to.be.empty();
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
                            expect(events).to.be.empty();
                        });
                    },
                    test: function (err, cursor, results, item) {
                        check(function () {
                            expect(err).to.be(null);

                            // Sanity
                            expect(cursor.iteration).to.eql(runStore.iteration);
                            expect(cursor.position).to.eql(runStore.position);
                            expect(cursor.ref).to.eql(runStore.ref);
                            expect(results).to.be.empty();
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
                        check(function () {
                            expect(err).to.be(null);

                            expect(request.url.toString()).to.be.ok();

                            // Sanity
                            expect(cursor.iteration).to.eql(runStore.iteration);
                            expect(cursor.position).to.eql(runStore.position);
                            expect(cursor.ref).to.eql(runStore.ref);

                            expect(response.code).to.be(200);
                            expect(request).to.be.ok();

                            var body = response.json();
                            expect(body.args).to.be.empty();
                            expect(_.startsWith(body.files['binary-file.png'], 'data:application/octet-stream;base64')).to.be(true);
                        });
                    },
                    done: function (err) {
                        check(function () {
                            expect(err).to.be(null);
                            !errored && mochaDone();
                        });
                    }
                });
            });
        });

        it('should not upload a binary data file if path is absent', function (mochaDone) {
            var errored = false,
                runner = new runtime.Runner(),
                path = require('path'),
                rawCollection = {
                    "variables": [],
                    "info": {
                        "name": "EmptyRawBody",
                        "_postman_id": "d6f7bb29-2258-4e1b-9576-b2315cf5b77e",
                        "schema": "https://schema.getpostman.com/json/collection/v2.0.0/collection.json"
                    },
                    "item": [
                        {
                            "id": "bf0a6006-c987-253a-525d-9f6be7071210",
                            "name": "First Request",
                            "request": {
                                "url": "https://postman-echo.com/post",
                                "method": "POST",
                                "body": {
                                    "mode": "file",
                                    "file": {}
                                }
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
                },  // populate during the run, and then perform tests on it, at the end.

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
                iterationCount: 1,
                requester: {
                    followRedirects: false
                },
                fileResolver: require('fs')
            }, function (err, run) {
                var runStore = {};  // Used for validations *during* the run. Cursor increments, etc.

                expect(err).to.be(null);
                run.start({
                    console: function (cursor, level, message) {
                        check(function () {
                            expect(level).be('warn');
                            expect(message).be('unable to load raw file for upload: "undefined"');
                        });
                    },
                    start: function (err, cursor) {
                        check(function () {
                            expect(err).to.be(null);
                            expect(cursor).to.have.property('position', 0);
                            expect(cursor).to.have.property('iteration', 0);
                            expect(cursor).to.have.property('length', 1);
                            expect(cursor).to.have.property('cycles', 1);
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
                            expect(results).to.be.empty();
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
                            expect(events).to.be.empty();
                        });
                    },
                    test: function (err, cursor, results, item) {
                        check(function () {
                            expect(err).to.be(null);

                            // Sanity
                            expect(cursor.iteration).to.eql(runStore.iteration);
                            expect(cursor.position).to.eql(runStore.position);
                            expect(cursor.ref).to.eql(runStore.ref);
                            expect(results).to.be.empty();
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
                        check(function () {
                            expect(err).to.be(null);

                            expect(request.url.toString()).to.be.ok();

                            // Sanity
                            expect(cursor.iteration).to.eql(runStore.iteration);
                            expect(cursor.position).to.eql(runStore.position);
                            expect(cursor.ref).to.eql(runStore.ref);

                            expect(response.code).to.be(200);
                            expect(request).to.be.ok();

                            var body = response.json();
                            expect(body.args).to.be.empty();
                            expect(body.data).to.be.empty();
                            expect(body.files).to.be.empty();
                            expect(body.form).to.be.empty();
                        });
                    },
                    done: function (err) {
                        check(function () {
                            expect(err).to.be(null);
                            !errored && mochaDone();
                        });
                    }
                });
            });
        });
    });

    describe('Path Variables', function () {
        it('should be resolved before sending the request', function (mochaDone) {
            var errored = false,
                runner = new runtime.Runner(),
                rawCollection = {
                    "variables": [],
                    "info": {
                        "name": "EmptyRawBody",
                        "_postman_id": "d6f7bb29-2258-4e1b-9576-b2315cf5b77e",
                        "schema": "https://schema.getpostman.com/json/collection/v2.0.0/collection.json"
                    },
                    "item": [
                        {
                            "id": "bf0a6006-c987-253a-525d-9f6be7071210",
                            "name": "First Request",
                            "request": {
                                "url": {
                                    "host": [
                                        "postman-echo",
                                        "com"
                                    ],
                                    "path": [
                                        "status",
                                        ":code"
                                    ],
                                    "variable": [
                                        {
                                            "id": "code",
                                            "value": "201"
                                        }
                                    ]
                                },
                                "method": "GET"
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
                },  // populate during the run, and then perform tests on it, at the end.

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
                iterationCount: 1,
                requester: {
                    followRedirects: false
                }
            }, function (err, run) {
                var runStore = {};  // Used for validations *during* the run. Cursor increments, etc.

                expect(err).to.be(null);
                run.start({
                    start: function (err, cursor) {
                        check(function () {
                            expect(err).to.be(null);
                            expect(cursor).to.have.property('position', 0);
                            expect(cursor).to.have.property('iteration', 0);
                            expect(cursor).to.have.property('length', 1);
                            expect(cursor).to.have.property('cycles', 1);
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
                            expect(results).to.be.empty();
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
                            expect(events).to.be.empty();
                        });
                    },
                    test: function (err, cursor, results, item) {
                        check(function () {
                            expect(err).to.be(null);

                            // Sanity
                            expect(cursor.iteration).to.eql(runStore.iteration);
                            expect(cursor.position).to.eql(runStore.position);
                            expect(cursor.ref).to.eql(runStore.ref);
                            expect(results).to.be.empty();
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
                        check(function () {
                            expect(err).to.be(null);

                            expect(request.url.toString()).to.be.ok();

                            // Sanity
                            expect(cursor.iteration).to.eql(runStore.iteration);
                            expect(cursor.position).to.eql(runStore.position);
                            expect(cursor.ref).to.eql(runStore.ref);

                            expect(response.code).to.be(201);
                            expect(request).to.be.ok();
                        });
                    },
                    done: function (err) {
                        check(function () {
                            expect(err).to.be(null);
                            !errored && mochaDone();
                        });
                    }
                });
            });
        });
    });

    describe('Client side SSL', function () {
        var port,
            fs = require('fs'),
            path = require('path');

        beforeEach('Start HTTPS server', function (done) {
            var https = require('https'),
                server = https.createServer({
                    key: fs.readFileSync(path.join(__dirname, 'data', 'server-key.pem')),
                    cert: fs.readFileSync(path.join(__dirname, 'data', 'server-crt.pem')),
                    ca: fs.readFileSync(path.join(__dirname, 'data', 'ca-crt.pem')),
                    requestCert: true,
                    rejectUnauthorized: false
                });

            server.on('request', function (req, res) {
                if (req.client.authorized) {
                    res.writeHead(200, { 'Content-Type': 'text/plain' });
                    res.end('authorized\n');
                } else {
                    res.writeHead(401, { 'Content-Type': 'text/plain' });
                    res.end('unauthorized\n');
                }
            });

            server.on('listening', function () {
                port = server.address().port;
                done();
            });

            server.listen(0, 'localhost');
        });

        it('should not send the client certificate if certificate manager is not provided', function (mochaDone) {
            var errored = false,
                runner = new runtime.Runner(),
                rawCollection = {
                    "variables": [],
                    "info": {
                        "name": "NewmanSetNextRequest",
                        "_postman_id": "d6f7bb29-2258-4e1b-9576-b2315cf5b77e",
                        "description": "",
                        "schema": "https://schema.getpostman.com/json/collection/v2.0.0/collection.json"
                    },
                    "item": [
                        {
                            "id": "bf0a6006-c987-253a-525d-9f6be7071210",
                            "name": "First Request",
                            "event": [
                                {
                                    "listen": "test",
                                    "script": {
                                        "type": "text/javascript",
                                        "exec": "tests['worked'] = responseCode.code === 302;"
                                    }
                                }
                            ],
                            "request": {
                                "url": "https://localhost:" + port + '/',
                                "method": "GET"
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
                },  // populate during the run, and then perform tests on it, at the end.

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
                iterationCount: 1,
                requester: {
                    followRedirects: false,
                    strictSSL: false
                }
            }, function (err, run) {
                var runStore = {};  // Used for validations *during* the run. Cursor increments, etc.

                expect(err).to.be(null);
                run.start({
                    start: function (err, cursor) {
                        check(function () {
                            expect(err).to.be(null);
                            expect(cursor).to.have.property('position', 0);
                            expect(cursor).to.have.property('iteration', 0);
                            expect(cursor).to.have.property('length', 1);
                            expect(cursor).to.have.property('cycles', 1);
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
                        check(function () {
                            expect(err).to.be(null);

                            expect(request.url.toString()).to.be.ok();

                            // Sanity
                            expect(cursor.iteration).to.eql(runStore.iteration);
                            expect(cursor.position).to.eql(runStore.position);
                            expect(cursor.ref).to.eql(runStore.ref);

                            expect(response.code).to.be(401);
                            expect(response.text()).to.be('unauthorized\n');
                            expect(request).to.be.ok();
                        });
                    },
                    done: function (err) {
                        check(function () {
                            expect(err).to.be(null);
                            !errored && mochaDone();
                        });
                    }
                });
            });
        });
    });

    describe('Cookies', function () {
        it('should be available in the sandbox', function (mochaDone) {
            var errored = false,
                runner = new runtime.Runner(),
                rawCollection = {
                    "variables": [],
                    "info": {
                        "name": "NewmanSetNextRequest",
                        "_postman_id": "d6f7bb29-2258-4e1b-9576-b2315cf5b77e",
                        "description": "",
                        "schema": "https://schema.getpostman.com/json/collection/v2.0.0/collection.json"
                    },
                    "item": [
                        {
                            "id": "bf0a6006-c987-253a-525d-9f6be7071210",
                            "name": "First Request",
                            "event": [
                                {
                                    "listen": "test",
                                    "script": {
                                        "type": "text/javascript",
                                        "exec": [
                                            "tests['Cookie A'] = postman.getResponseCookie('a') && postman.getResponseCookie('a').value === 'one';",
                                            "tests['Cookie b'] = postman.getResponseCookie('b') && postman.getResponseCookie('b').value === 'two';",
                                        ]
                                    }
                                }
                            ],
                            "request": {
                                "url": "https://postman-echo.com/cookies/set?A=one&b=two",
                                "method": "GET"
                            }
                        }
                    ]
                },
                cookieJar = request.jar(),
                collection = new sdk.Collection(rawCollection),
                testables = {
                    iterationsStarted: [],
                    iterationsComplete: [],
                    itemsStarted: {},
                    itemsComplete: {}
                },  // populate during the run, and then perform tests on it, at the end.

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
                iterationCount: 1,
                requester: {
                    cookieJar: cookieJar
                }
            }, function (err, run) {
                var runStore = {};  // Used for validations *during* the run. Cursor increments, etc.

                expect(err).to.be(null);
                run.start({
                    start: function (err, cursor) {
                        check(function () {
                            expect(err).to.be(null);
                            expect(cursor).to.have.property('position', 0);
                            expect(cursor).to.have.property('iteration', 0);
                            expect(cursor).to.have.property('length', 1);
                            expect(cursor).to.have.property('cycles', 1);
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

                            var scriptResult = results[0];
                            expect(scriptResult.error).to.be(undefined);
                            expect(scriptResult.result.target).to.eql('test');

                            expect(scriptResult.result.tests).to.be.ok();

                            _.forOwn(scriptResult.result.tests, function (result, test) {
                                expect(result).to.be.ok();
                            });
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
                        check(function () {
                            expect(err).to.be(null);

                            expect(request.url.toString()).to.be.ok();

                            // Sanity
                            expect(cursor.iteration).to.eql(runStore.iteration);
                            expect(cursor.position).to.eql(runStore.position);
                            expect(cursor.ref).to.eql(runStore.ref);

                            expect(response.code).to.be(200);
                            expect(request).to.be.ok();
                        });
                    },
                    done: function (err) {
                        check(function () {
                            expect(err).to.be(null);
                            !errored && mochaDone();
                        });
                    }
                });
            });
        });
    });

    describe('Sent headers', function () {
        it('should return all sent headers', function (mochaDone) {
            var errored = false,
                runner = new runtime.Runner(),
                rawCollection = {
                    "variables": [],
                    "info": {
                        "name": "NewmanSetNextRequest",
                        "_postman_id": "d6f7bb29-2258-4e1b-9576-b2315cf5b77e",
                        "description": "",
                        "schema": "https://schema.getpostman.com/json/collection/v2.0.0/collection.json"
                    },
                    "item": [
                        {
                            "id": "bf0a6006-c987-253a-525d-9f6be7071210",
                            "name": "First Request",
                            "event": [
                                {
                                    "listen": "test",
                                    "script": {
                                        "type": "text/javascript",
                                        "exec": "tests['worked'] = responseCode.code === 302;"
                                    }
                                }
                            ],
                            "request": {
                                "url": "https://postman-echo.com/cookies",
                                "method": "GET"
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
                },  // populate during the run, and then perform tests on it, at the end.

                /**
                 * Since each callback runs in a separate callstack, this helper function
                 * ensures that any errors are forwarded to mocha
                 *
                 * @param func
                 */
                check = function (func) {
                    try { func(); }
                    catch (e) { (errored = true) && mochaDone(e); }
                },

                cookieJar = request.jar();

            cookieJar.setCookie('yo=hello', 'https://postman-echo.com/cookies');

            runner.run(collection, {
                iterationCount: 1,
                requester: {
                    cookieJar: cookieJar
                }
            }, function (err, run) {
                var runStore = {};  // Used for validations *during* the run. Cursor increments, etc.

                expect(err).to.be(null);
                run.start({
                    start: function (err, cursor) {
                        check(function () {
                            expect(err).to.be(null);
                            expect(cursor).to.have.property('position', 0);
                            expect(cursor).to.have.property('iteration', 0);
                            expect(cursor).to.have.property('length', 1);
                            expect(cursor).to.have.property('cycles', 1);
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
                            expect(scriptResult.result.target).to.eql('test');
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
                        check(function () {
                            expect(err).to.be(null);

                            expect(request.url.toString()).to.be.ok();

                            // Sanity
                            expect(cursor.iteration).to.eql(runStore.iteration);
                            expect(cursor.position).to.eql(runStore.position);
                            expect(cursor.ref).to.eql(runStore.ref);

                            expect(request.headers.one('User-Agent')).to.have.property('key', 'User-Agent');
                            expect(request.headers.one('Accept')).to.have.property('key', 'Accept');
                            expect(request.headers.one('Accept')).to.have.property('value', '*/*');
                            expect(request.headers.one('Host')).to.have.property('key', 'Host');
                            expect(request.headers.one('Host')).to.have.property('value', 'postman-echo.com');
                            expect(request.headers.one('Cookie')).to.have.property('key', 'cookie');
                            expect(request.headers.one('Cookie')).to.have.property('value', 'yo=hello');
                            expect(request.headers.one('Accept-Encoding')).to.have.property('key', 'accept-encoding');
                            expect(request.headers.one('Accept-Encoding')).to.have.property('value', 'gzip, deflate');
                        });
                    },
                    done: function (err) {
                        check(function () {
                            expect(err).to.be(null);
                            !errored && mochaDone();
                        });
                    }
                });
            });
        });
    });

    describe('Encoding', function () {
        describe('Raw Deflate', function () {
            var port,
                fs = require('fs'),
                path = require('path'),
                server;

            before('Start HTTPS server', function (done) {
                var https = require('https');

                server = https.createServer({
                    key: fs.readFileSync(path.join(__dirname, 'data', 'server-key.pem')),
                    cert: fs.readFileSync(path.join(__dirname, 'data', 'server-crt.pem'))
                });

                server.on('request', function (req, res) {
                    res.statusCode = 200;
                    res.setHeader('Content-Type', 'text/plain');
                    res.setHeader('Content-Encoding', 'deflate');
                    zlib.deflateRaw('thisisadeflatedresponse', function (err, buffer) {
                        res.end(buffer);
                    });
                });

                server.on('listening', function () {
                    port = server.address().port;
                    done();
                });

                server.listen(0, 'localhost');
            });

            after('Stop HTTPS server', function (done) {
                server.close();
                done();
            });

            it('should handle raw deflate responses', function (mochaDone) {
                var errored = false,
                    runner = new runtime.Runner(),
                    rawCollection = {
                        "variables": [],
                        "info": {
                            "name": "Raw deflate",
                            "_postman_id": "d6f7bb29-2258-4e1b-9576-b2315cf5b77e",
                            "description": "",
                            "schema": "https://schema.getpostman.com/json/collection/v2.0.0/collection.json"
                        },
                        "item": [
                            {
                                "id": "bf0a6006-c987-253a-525d-9f6be7071210",
                                "name": "First Request",
                                "request": {
                                    "url": "https://localhost:" + port + '/',
                                    "method": "GET"
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
                    },  // populate during the run, and then perform tests on it, at the end.

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
                    iterationCount: 1,
                    requester: {
                        followRedirects: false,
                        strictSSL: false
                    }
                }, function (err, run) {
                    var runStore = {};  // Used for validations *during* the run. Cursor increments, etc.

                    expect(err).to.be(null);
                    run.start({
                        start: function (err, cursor) {
                            check(function () {
                                expect(err).to.be(null);
                                expect(cursor).to.have.property('position', 0);
                                expect(cursor).to.have.property('iteration', 0);
                                expect(cursor).to.have.property('length', 1);
                                expect(cursor).to.have.property('cycles', 1);
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
                            });
                        },
                        test: function (err, cursor, results, item) {
                            check(function () {
                                expect(err).to.be(null);

                                // Sanity
                                expect(cursor.iteration).to.eql(runStore.iteration);
                                expect(cursor.position).to.eql(runStore.position);
                                expect(cursor.ref).to.eql(runStore.ref);
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
                            check(function () {
                                expect(err).to.be(null);

                                expect(request.url.toString()).to.be.ok();

                                // Sanity
                                expect(cursor.iteration).to.eql(runStore.iteration);
                                expect(cursor.position).to.eql(runStore.position);
                                expect(cursor.ref).to.eql(runStore.ref);

                                expect(response.code).to.be(200);
                                expect(response.text()).to.be('thisisadeflatedresponse');
                                expect(request).to.be.ok();
                            });
                        },
                        done: function (err) {
                            check(function () {
                                expect(err).to.be(null);
                                !errored && mochaDone();
                            });
                        }
                    });
                });
            });
        });

        describe('Deflate', function () {
            var port,
                server,
                fs = require('fs'),
                path = require('path');

            before('Start HTTPS server', function (done) {
                var https = require('https');

                server = https.createServer({
                    key: fs.readFileSync(path.join(__dirname, 'data', 'server-key.pem')),
                    cert: fs.readFileSync(path.join(__dirname, 'data', 'server-crt.pem'))
                });

                server.on('request', function (req, res) {
                    res.statusCode = 200;
                    res.setHeader('Content-Type', 'text/plain');
                    res.setHeader('Content-Encoding', 'deflate');
                    zlib.deflate('thisisadeflatedresponsetoo', function (err, buffer) {
                        res.end(buffer);
                    });
                });

                server.on('listening', function () {
                    port = server.address().port;
                    done();
                });

                server.listen(0, 'localhost');
            });

            after('Stop HTTPS server', function (done) {
                server.close(); // todo: wait for the server connections to drain
                done();
            });

            it('should handle deflate responses', function (mochaDone) {
                var errored = false,
                    runner = new runtime.Runner(),
                    rawCollection = {
                        "variables": [],
                        "info": {
                            "name": "Deflate",
                            "_postman_id": "d6f7bb29-2258-4e1b-9576-b2315cf5b77e",
                            "description": "",
                            "schema": "https://schema.getpostman.com/json/collection/v2.0.0/collection.json"
                        },
                        "item": [
                            {
                                "id": "bf0a6006-c987-253a-525d-9f6be7071210",
                                "name": "First Request",
                                "request": {
                                    "url": "https://localhost:" + port + '/',
                                    "method": "GET"
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
                    },  // populate during the run, and then perform tests on it, at the end.

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
                    iterationCount: 1,
                    requester: {
                        followRedirects: false,
                        strictSSL: false
                    }
                }, function (err, run) {
                    var runStore = {};  // Used for validations *during* the run. Cursor increments, etc.

                    expect(err).to.be(null);
                    run.start({
                        start: function (err, cursor) {
                            check(function () {
                                expect(err).to.be(null);
                                expect(cursor).to.have.property('position', 0);
                                expect(cursor).to.have.property('iteration', 0);
                                expect(cursor).to.have.property('length', 1);
                                expect(cursor).to.have.property('cycles', 1);
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
                            });
                        },
                        test: function (err, cursor, results, item) {
                            check(function () {
                                expect(err).to.be(null);

                                // Sanity
                                expect(cursor.iteration).to.eql(runStore.iteration);
                                expect(cursor.position).to.eql(runStore.position);
                                expect(cursor.ref).to.eql(runStore.ref);
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
                            check(function () {
                                expect(err).to.be(null);

                                expect(request.url.toString()).to.be.ok();

                                // Sanity
                                expect(cursor.iteration).to.eql(runStore.iteration);
                                expect(cursor.position).to.eql(runStore.position);
                                expect(cursor.ref).to.eql(runStore.ref);

                                expect(response.code).to.be(200);
                                expect(response.text()).to.be('thisisadeflatedresponsetoo');
                                expect(request).to.be.ok();
                            });
                        },
                        done: function (err) {
                            check(function () {
                                expect(err).to.be(null);
                                !errored && mochaDone();
                            });
                        }
                    });
                });
            });
        });

        describe('GZip', function () {
            var port,
                server,
                fs = require('fs'),
                path = require('path');

            before('Start HTTPS server', function (done) {
                var https = require('https');

                server = https.createServer({
                    key: fs.readFileSync(path.join(__dirname, 'data', 'server-key.pem')),
                    cert: fs.readFileSync(path.join(__dirname, 'data', 'server-crt.pem'))
                });

                server.on('request', function (req, res) {
                    res.statusCode = 200;
                    res.setHeader('Content-Type', 'text/plain');
                    res.setHeader('Content-Encoding', 'gzip');
                    zlib.gzip('thisisagzippedresponse', function (err, buffer) {
                        res.end(buffer);
                    });
                });

                server.on('listening', function () {
                    port = server.address().port;
                    done();
                });

                server.listen(0, 'localhost');
            });

            after('Stop HTTPS server', function (done) {
                server.close();
                done();
            });

            it('should handle gzip responses', function (mochaDone) {
                var errored = false,
                    runner = new runtime.Runner(),
                    rawCollection = {
                        "variables": [],
                        "info": {
                            "name": "NewmanSetNextRequest",
                            "_postman_id": "d6f7bb29-2258-4e1b-9576-b2315cf5b77e",
                            "description": "",
                            "schema": "https://schema.getpostman.com/json/collection/v2.0.0/collection.json"
                        },
                        "item": [
                            {
                                "id": "bf0a6006-c987-253a-525d-9f6be7071210",
                                "name": "First Request",
                                "event": [
                                    {
                                        "listen": "test",
                                        "script": {
                                            "type": "text/javascript",
                                            "exec": "tests['worked'] = responseCode.code === 302;"
                                        }
                                    }
                                ],
                                "request": {
                                    "url": "https://localhost:" + port + '/',
                                    "method": "GET"
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
                    },  // populate during the run, and then perform tests on it, at the end.

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
                    iterationCount: 1,
                    requester: {
                        followRedirects: false,
                        strictSSL: false
                    }
                }, function (err, run) {
                    var runStore = {};  // Used for validations *during* the run. Cursor increments, etc.

                    expect(err).to.be(null);
                    run.start({
                        start: function (err, cursor) {
                            check(function () {
                                expect(err).to.be(null);
                                expect(cursor).to.have.property('position', 0);
                                expect(cursor).to.have.property('iteration', 0);
                                expect(cursor).to.have.property('length', 1);
                                expect(cursor).to.have.property('cycles', 1);
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
                            check(function () {
                                expect(err).to.be(null);

                                expect(request.url.toString()).to.be.ok();

                                // Sanity
                                expect(cursor.iteration).to.eql(runStore.iteration);
                                expect(cursor.position).to.eql(runStore.position);
                                expect(cursor.ref).to.eql(runStore.ref);

                                expect(response.code).to.be(200);
                                expect(response.text()).to.be('thisisagzippedresponse');
                                expect(request).to.be.ok();
                            });
                        },
                        done: function (err) {
                            check(function () {
                                expect(err).to.be(null);
                                !errored && mochaDone();
                            });
                        }
                    });
                });
            });
        });
    });
});
