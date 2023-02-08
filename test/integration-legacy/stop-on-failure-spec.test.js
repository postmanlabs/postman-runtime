var _ = require('lodash'),
    expect = require('chai').expect,
    runtime = require('../../index'),
    sdk = require('postman-collection');

describe('Option', function () {
    describe('Stop On Failure', function () {
        it('should be able to stop a run when there are test failures', function (mochaDone) {
            var errored = false,
                runner = new runtime.Runner(),
                rawCollection = {
                    variables: [],
                    info: {
                        name: 'test',
                        _postman_id: 'cd9e83b1-03dd-18ae-ff02-574414594a87',
                        description: '',
                        schema: 'https://schema.getpostman.com/json/collection/v2.0.0/collection.json'
                    },
                    item: [
                        {
                            name: 'Request Methods',
                            // eslint-disable-next-line max-len
                            description: 'HTTP has multiple request "verbs", such as `GET`, `PUT`, `POST`, `DELETE`,\n`PATCH`, `HEAD`, etc. \n\nAn HTTP Method (verb) defines how a request should be interpreted by a server. \nThe endpoints in this section demonstrate various HTTP Verbs. Postman supports \nall the HTTP Verbs, including some rarely used ones, such as `PROPFIND`, `UNLINK`, \netc.\n\nFor details about HTTP Verbs, refer to [RFC 2616](http://www.w3.org/Protocols/rfc2616/rfc2616-sec9.html#sec9)\n',
                            item: [
                                {
                                    name: 'First Request',
                                    event: [
                                        {
                                            listen: 'test',
                                            script: {
                                                type: 'text/javascript',
                                                // eslint-disable-next-line max-len
                                                exec: 'tests[\'fail\'] = false;\ntests["Body contains headers"] = responseBody.has("headers");\ntests["Body contains args"] = responseBody.has("args");\ntests["Body contains url"] = responseBody.has("url");\n\nvar data = JSON.parse(responseBody)\n\ntests["Args key contains argument passed as url parameter"] = \'test\' in data.args'
                                            }
                                        }
                                    ],
                                    request: {
                                        url: 'https://postman-echo.com/get?test=1',
                                        method: 'GET'
                                    }
                                },
                                {
                                    name: 'Second Request',
                                    event: [
                                        {
                                            listen: 'test',
                                            script: {
                                                type: 'text/javascript',
                                                exec: ';'
                                            }
                                        }
                                    ],
                                    request: {
                                        url: 'https://postman-echo.com/get?test=2',
                                        method: 'GET'
                                    }
                                },
                                {
                                    name: 'Third Request',
                                    event: [
                                        {
                                            listen: 'test',
                                            script: {
                                                type: 'text/javascript',
                                                exec: ';'
                                            }
                                        }
                                    ],
                                    request: {
                                        url: 'https://postman-echo.com/get?test=3',
                                        method: 'GET'
                                    }
                                }
                            ]
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
                stopOnFailure: true
            }, function (err, run) {
                var runStore = {}; // Used for validations *during* the run. Cursor increments, etc.

                expect(err).to.be.null;
                run.start({
                    start (err, cursor) {
                        check(function () {
                            expect(err).to.be.null;
                            expect(cursor).to.deep.include({
                                position: 0,
                                iteration: 0,
                                length: 3,
                                cycles: 2,
                                eof: false,
                                empty: false,
                                bof: true,
                                cr: false
                            });
                            expect(cursor).to.have.property('ref');

                            // Set this to true, and verify at the end, so that the test will fail even if this
                            // callback is never called.
                            testables.started = true;
                        });
                    },
                    beforeIteration (err, cursor) {
                        check(function () {
                            expect(err).to.be.null;

                            testables.iterationsStarted.push(cursor.iteration);
                            runStore.iteration = cursor.iteration;
                        });
                    },
                    iteration (err, cursor) {
                        check(function () {
                            expect(err).to.be.null;
                            expect(cursor).to.have.property('iteration', runStore.iteration);

                            testables.iterationsComplete.push(cursor.iteration);
                        });
                    },
                    beforeItem (err, cursor, item) {
                        check(function () {
                            expect(err).to.be.null;

                            testables.itemsStarted[cursor.iteration] = testables.itemsStarted[cursor.iteration] || [];
                            testables.itemsStarted[cursor.iteration].push(item);
                            runStore.position = cursor.position;
                            runStore.ref = cursor.ref;
                        });
                    },
                    item (err, cursor, item) {
                        check(function () {
                            expect(err).to.be.null;
                            expect(cursor).to.deep.include({
                                position: runStore.position,
                                ref: runStore.ref
                            });

                            testables.itemsComplete[cursor.iteration] = testables.itemsComplete[cursor.iteration] || [];
                            testables.itemsComplete[cursor.iteration].push(item);
                        });
                    },
                    beforePrerequest (err, cursor, events) {
                        check(function () {
                            expect(err).to.be.null;

                            // Sanity
                            expect(cursor).to.deep.include({
                                iteration: runStore.iteration,
                                position: runStore.position,
                                ref: runStore.ref
                            });

                            // This collection has no pre-request scripts
                            expect(events).to.be.empty;
                        });
                    },
                    prerequest (err, cursor, results) {
                        check(function () {
                            // Sanity
                            expect(cursor).to.deep.include({
                                iteration: runStore.iteration,
                                position: runStore.position,
                                ref: runStore.ref
                            });

                            expect(results).to.be.empty;
                            expect(err).to.be.null;
                        });
                    },
                    beforeTest (err, cursor, events) {
                        check(function () {
                            expect(err).to.be.null;
                            // Sanity
                            expect(cursor).to.deep.include({
                                iteration: runStore.iteration,
                                position: runStore.position,
                                ref: runStore.ref
                            });

                            // This collection has no pre-request scripts
                            expect(events).to.have.lengthOf(1);
                        });
                    },
                    test (err, cursor, results) {
                        check(function () {
                            expect(err).to.be.null;
                            // Sanity
                            expect(cursor).to.deep.include({
                                iteration: runStore.iteration,
                                position: runStore.position,
                                ref: runStore.ref
                            });

                            var scriptResult = results[0];

                            expect(scriptResult).to.deep.nested.include({
                                'result.target': 'test'
                            });
                        });
                    },
                    beforeRequest (err, cursor) {
                        check(function () {
                            expect(err).to.be.null;
                            // Sanity
                            expect(cursor).to.deep.include({
                                iteration: runStore.iteration,
                                position: runStore.position,
                                ref: runStore.ref
                            });
                        });
                    },
                    request (err, cursor, response, request) {
                        check(function () {
                            expect(err).to.be.null;

                            expect(request.url.toString()).to.be.ok;

                            // Sanity
                            expect(cursor).to.deep.include({
                                iteration: runStore.iteration,
                                position: runStore.position,
                                ref: runStore.ref
                            });

                            expect(response).to.have.property('code', 200);
                            expect(request).to.be.ok;
                        });
                    },
                    done (error) {
                        // Should Error
                        expect(error).to.be.null;

                        expect(testables).to.have.property('started', true);

                        // We started the first iteration and encountered a failure in the first request
                        expect(testables).to.deep.include({
                            iterationsStarted: [0],
                            iterationsComplete: [0]
                        });

                        // First iteration
                        expect(testables.itemsStarted[0]).to.have.lengthOf(1);
                        expect(testables.itemsComplete[0]).to.have.lengthOf(1);
                        expect(_.map(testables.itemsStarted[0], 'name')).to.eql([
                            'First Request'
                        ]);
                        expect(_.map(testables.itemsComplete[0], 'name')).to.eql([
                            'First Request'
                        ]);

                        // No further iterations
                        expect(testables.itemsStarted[1]).to.be.undefined;

                        // Expect the end position to be correct
                        expect(runStore).to.deep.include({
                            iteration: 0,
                            position: 0
                        });

                        !errored && mochaDone();
                    }
                });
            });
        });
        it('should be able to stop a run when there are script errors', function (mochaDone) {
            var errored = false,
                runner = new runtime.Runner(),
                rawCollection = {
                    variables: [],
                    info: {
                        name: 'test',
                        _postman_id: 'cd9e83b1-03dd-18ae-ff02-574414594a87',
                        description: '',
                        schema: 'https://schema.getpostman.com/json/collection/v2.0.0/collection.json'
                    },
                    item: [
                        {
                            name: 'Request Methods',
                            // eslint-disable-next-line max-len
                            description: 'HTTP has multiple request "verbs", such as `GET`, `PUT`, `POST`, `DELETE`,\n`PATCH`, `HEAD`, etc. \n\nAn HTTP Method (verb) defines how a request should be interpreted by a server. \nThe endpoints in this section demonstrate various HTTP Verbs. Postman supports \nall the HTTP Verbs, including some rarely used ones, such as `PROPFIND`, `UNLINK`, \netc.\n\nFor details about HTTP Verbs, refer to [RFC 2616](http://www.w3.org/Protocols/rfc2616/rfc2616-sec9.html#sec9)\n',
                            item: [
                                {
                                    name: 'First Request',
                                    event: [
                                        {
                                            listen: 'test',
                                            script: {
                                                type: 'text/javascript',
                                                // eslint-disable-next-line max-len
                                                exec: 'tests["Body contains headers"] = responseBody.has("headers");\ntests["Body contains args"] = responseBody.has("args");\ntests["Body contains url"] = responseBody.has("url");\n\nvar data = JSON.parse(responseBody)\n\ntests["Args key contains argument passed as url parameter"] = \'test\' in data.args'
                                            }
                                        }
                                    ],
                                    request: {
                                        url: 'https://postman-echo.com/get?test=123',
                                        method: 'GET'
                                    }
                                },
                                {
                                    name: 'Second Request',
                                    event: [
                                        {
                                            listen: 'prerequest',
                                            script: {
                                                type: 'text/javascript',
                                                exec: 'if (iteration === 1) { throw new Error(\'omg!\'); }'
                                            }
                                        },
                                        {
                                            listen: 'test',
                                            script: {
                                                type: 'text/javascript',
                                                exec: ';'
                                            }
                                        }
                                    ],
                                    request: {
                                        url: 'https://postman-echo.com/get?test=123',
                                        method: 'GET'
                                    }
                                },
                                {
                                    name: 'Third Request',
                                    event: [
                                        {
                                            listen: 'test',
                                            script: {
                                                type: 'text/javascript',
                                                exec: ';'
                                            }
                                        }
                                    ],
                                    request: {
                                        url: 'https://postman-echo.com/get?test=123',
                                        method: 'GET'
                                    }
                                }
                            ]
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
                iterationCount: 3,
                stopOnFailure: true
            }, function (err, run) {
                var runStore = {}; // Used for validations *during* the run. Cursor increments, etc.

                expect(err).to.be.null;
                run.start({
                    start (err, cursor) {
                        check(function () {
                            expect(err).to.be.null;
                            expect(cursor).to.deep.include({
                                position: 0,
                                iteration: 0,
                                length: 3,
                                cycles: 3,
                                eof: false,
                                empty: false,
                                bof: true,
                                cr: false
                            });
                            expect(cursor).to.have.property('ref');

                            // Set this to true, and verify at the end, so that the test will fail even if this
                            // callback is never called.
                            testables.started = true;
                        });
                    },
                    beforeIteration (err, cursor) {
                        check(function () {
                            expect(err).to.be.null;

                            testables.iterationsStarted.push(cursor.iteration);
                            runStore.iteration = cursor.iteration;
                        });
                    },
                    iteration (err, cursor) {
                        check(function () {
                            expect(err).to.be.null;
                            expect(cursor).to.have.property('iteration', runStore.iteration);

                            testables.iterationsComplete.push(cursor.iteration);
                        });
                    },
                    beforeItem (err, cursor, item) {
                        check(function () {
                            expect(err).to.be.null;

                            testables.itemsStarted[cursor.iteration] = testables.itemsStarted[cursor.iteration] || [];
                            testables.itemsStarted[cursor.iteration].push(item);
                            runStore.position = cursor.position;
                            runStore.ref = cursor.ref;
                        });
                    },
                    item (err, cursor, item) {
                        check(function () {
                            expect(err).to.be.null;
                            expect(cursor).to.deep.include({
                                position: runStore.position,
                                ref: runStore.ref
                            });

                            testables.itemsComplete[cursor.iteration] = testables.itemsComplete[cursor.iteration] || [];
                            testables.itemsComplete[cursor.iteration].push(item);
                        });
                    },
                    beforePrerequest (err, cursor, events, item) {
                        check(function () {
                            expect(err).to.be.null;

                            // Sanity
                            expect(cursor).to.deep.include({
                                iteration: runStore.iteration,
                                position: runStore.position,
                                ref: runStore.ref
                            });

                            if (item.name === 'Second Request') {
                                expect(events).to.have.lengthOf(1);
                            }
                            else {
                                expect(events).to.be.empty;
                            }
                        });
                    },
                    prerequest (err, cursor, results, item) {
                        check(function () {
                            // Sanity
                            expect(cursor).to.deep.include({
                                iteration: runStore.iteration,
                                position: runStore.position,
                                ref: runStore.ref
                            });

                            // The second request throws in the second iteration.
                            if (cursor.iteration === 1 && item.name === 'Second Request') {
                                expect(results[0].error).to.be.ok;
                                expect(results[0]).to.deep.nested.include({
                                    'error.message': 'omg!'
                                });

                                return;
                            }
                            expect(err).to.be.null;
                        });
                    },
                    beforeTest (err, cursor, events, item) {
                        check(function () {
                            expect(err).to.be.null;

                            // Sanity
                            expect(cursor).to.deep.include({
                                iteration: runStore.iteration,
                                position: runStore.position,
                                ref: runStore.ref
                            });

                            // This collection has no pre-request scripts
                            expect(events).to.have.lengthOf(1);

                            // Since pre-request throws an error in the second
                            // iteration, this should never be called for the
                            // second request.
                            if (cursor.iteration === 1) {
                                expect(item.name).to.not.equal('Second Request');
                            }
                        });
                    },
                    test (err, cursor, results, item) {
                        check(function () {
                            expect(err).to.be.null;

                            // Sanity
                            expect(cursor).to.deep.include({
                                iteration: runStore.iteration,
                                position: runStore.position,
                                ref: runStore.ref
                            });

                            var result = results[0],
                                scriptResult = results[0];

                            expect(result.error).to.be.undefined;

                            expect(scriptResult).to.deep.nested.include({
                                'result.target': 'test'
                            });

                            // Since pre-request throws an error in the second
                            // iteration, this should never be called for the
                            // second request.
                            if (cursor.iteration === 1) {
                                expect(item.name).to.not.equal('Second Request');
                            }
                        });
                    },
                    beforeRequest (err, cursor, request, item) {
                        check(function () {
                            expect(err).to.be.null;

                            // Sanity
                            expect(cursor).to.deep.include({
                                iteration: runStore.iteration,
                                position: runStore.position,
                                ref: runStore.ref
                            });

                            // Since pre-request throws an error in the second
                            // iteration, this should never be called for the
                            // second request.
                            if (cursor.iteration === 1) {
                                expect(item.name).to.not.equal('Second Request');
                            }
                        });
                    },
                    request (err, cursor, response, request, item) {
                        check(function () {
                            expect(err).to.be.null;

                            expect(request.url.toString()).to.be.ok;

                            // Sanity
                            expect(cursor).to.deep.include({
                                iteration: runStore.iteration,
                                position: runStore.position,
                                ref: runStore.ref
                            });

                            expect(response).to.have.property('code', 200);
                            expect(request).to.be.ok;

                            // Since pre-request throws an error in the second
                            // iteration, this should never be called for the
                            // second request.
                            if (cursor.iteration === 1) {
                                expect(item.name).to.not.equal('Second Request');
                            }
                        });
                    },
                    done (err) {
                        expect(err).to.be.null;

                        expect(testables).to.have.property('started', true);

                        // Ensure that we ran (and completed three iterations)
                        // The second iteration should be stopped at the second request.
                        expect(testables).to.deep.include({
                            iterationsStarted: [0, 1],
                            iterationsComplete: [0, 1]
                        });

                        // First iteration
                        expect(testables.itemsStarted[0]).to.have.lengthOf(3);
                        expect(testables.itemsComplete[0]).to.have.lengthOf(3);
                        expect(_.map(testables.itemsStarted[0], 'name')).to.eql([
                            'First Request', 'Second Request', 'Third Request'
                        ]);
                        expect(_.map(testables.itemsComplete[0], 'name')).to.eql([
                            'First Request', 'Second Request', 'Third Request'
                        ]);

                        // Second Iteration
                        expect(testables.itemsStarted[1]).to.have.lengthOf(2);
                        expect(testables.itemsComplete[1]).to.have.lengthOf(2);
                        expect(_.map(testables.itemsStarted[1], 'name')).to.eql([
                            'First Request', 'Second Request'
                        ]);
                        expect(_.map(testables.itemsComplete[1], 'name')).to.eql([
                            'First Request', 'Second Request'
                        ]);

                        // Third iteration
                        expect(testables.itemsStarted[2]).to.be.undefined;
                        expect(testables.itemsComplete[2]).to.be.undefined;

                        !errored && mochaDone();
                    }
                });
            });
        });
        it('should be able to stop a run when there are request errors', function (mochaDone) {
            var errored = false,
                runner = new runtime.Runner(),
                rawCollection = {
                    variables: [],
                    info: {
                        name: 'test',
                        _postman_id: 'cd9e83b1-03dd-18ae-ff02-574414594a87',
                        description: '',
                        schema: 'https://schema.getpostman.com/json/collection/v2.0.0/collection.json'
                    },
                    item: [
                        {
                            name: 'Request Methods',
                            // eslint-disable-next-line max-len
                            description: 'HTTP has multiple request "verbs", such as `GET`, `PUT`, `POST`, `DELETE`,\n`PATCH`, `HEAD`, etc. \n\nAn HTTP Method (verb) defines how a request should be interpreted by a server. \nThe endpoints in this section demonstrate various HTTP Verbs. Postman supports \nall the HTTP Verbs, including some rarely used ones, such as `PROPFIND`, `UNLINK`, \netc.\n\nFor details about HTTP Verbs, refer to [RFC 2616](http://www.w3.org/Protocols/rfc2616/rfc2616-sec9.html#sec9)\n',
                            item: [
                                {
                                    name: 'First Request',
                                    event: [
                                        {
                                            listen: 'test',
                                            script: {
                                                type: 'text/javascript',
                                                // eslint-disable-next-line max-len
                                                exec: 'tests["Body contains headers"] = responseBody.has("headers");\ntests["Body contains args"] = responseBody.has("args");\ntests["Body contains url"] = responseBody.has("url");\n\nvar data = JSON.parse(responseBody)\n\ntests["Args key contains argument passed as url parameter"] = \'test\' in data.args'
                                            }
                                        }
                                    ],
                                    request: {
                                        url: 'https://postman-echo.com/get?test=123',
                                        method: 'GET'
                                    }
                                },
                                {
                                    name: 'Second Request',
                                    event: [
                                        {
                                            listen: 'prerequest',
                                            script: {
                                                type: 'text/javascript',
                                                exec: 'if (iteration === 1) { throw new Error(\'omg!\'); }'
                                            }
                                        },
                                        {
                                            listen: 'test',
                                            script: {
                                                type: 'text/javascript',
                                                exec: ';'
                                            }
                                        }
                                    ],
                                    request: {
                                        url: 'https://somenonexistantdomainnamehere/get?test=123',
                                        method: 'GET'
                                    }
                                },
                                {
                                    name: 'Third Request',
                                    event: [
                                        {
                                            listen: 'test',
                                            script: {
                                                type: 'text/javascript',
                                                exec: ';'
                                            }
                                        }
                                    ],
                                    request: {
                                        url: 'https://postman-echo.com/get?test=123',
                                        method: 'GET'
                                    }
                                }
                            ]
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
                iterationCount: 3,
                stopOnFailure: true
            }, function (err, run) {
                var runStore = {}; // Used for validations *during* the run. Cursor increments, etc.

                expect(err).to.be.null;
                run.start({
                    start (err, cursor) {
                        check(function () {
                            expect(err).to.be.null;
                            expect(cursor).to.deep.include({
                                position: 0,
                                iteration: 0,
                                length: 3,
                                cycles: 3,
                                eof: false,
                                empty: false,
                                bof: true,
                                cr: false
                            });
                            expect(cursor).to.have.property('ref');

                            // Set this to true, and verify at the end, so that the test will fail even if this
                            // callback is never called.
                            testables.started = true;
                        });
                    },
                    beforeIteration (err, cursor) {
                        check(function () {
                            expect(err).to.be.null;

                            testables.iterationsStarted.push(cursor.iteration);
                            runStore.iteration = cursor.iteration;
                        });
                    },
                    iteration (err, cursor) {
                        check(function () {
                            expect(err).to.be.null;
                            expect(cursor).to.have.property('iteration', runStore.iteration);

                            testables.iterationsComplete.push(cursor.iteration);
                        });
                    },
                    beforeItem (err, cursor, item) {
                        check(function () {
                            expect(err).to.be.null;

                            testables.itemsStarted[cursor.iteration] = testables.itemsStarted[cursor.iteration] || [];
                            testables.itemsStarted[cursor.iteration].push(item);
                            runStore.position = cursor.position;
                            runStore.ref = cursor.ref;
                        });
                    },
                    item (err, cursor, item) {
                        check(function () {
                            expect(err).to.be.null;
                            expect(cursor).to.deep.include({
                                position: runStore.position,
                                ref: runStore.ref
                            });

                            testables.itemsComplete[cursor.iteration] = testables.itemsComplete[cursor.iteration] || [];
                            testables.itemsComplete[cursor.iteration].push(item);
                        });
                    },
                    beforePrerequest (err, cursor, events, item) {
                        check(function () {
                            expect(err).to.be.null;

                            // Sanity
                            expect(cursor).to.deep.include({
                                iteration: runStore.iteration,
                                position: runStore.position,
                                ref: runStore.ref
                            });

                            if (item.name === 'Second Request') {
                                expect(events).to.have.lengthOf(1);
                            }
                            else {
                                expect(events).to.be.empty;
                            }
                        });
                    },
                    prerequest (err, cursor, results, item) {
                        check(function () {
                            // Sanity
                            expect(cursor).to.deep.include({
                                iteration: runStore.iteration,
                                position: runStore.position,
                                ref: runStore.ref
                            });

                            // The second request throws in the second iteration.
                            if (cursor.iteration === 1 && item.name === 'Second Request') {
                                expect(results[0].error).to.be.ok;
                                expect(results).to.deep.nested.include({
                                    'error.message': 'omg!'
                                });

                                return;
                            }
                            expect(err).to.be.null;
                        });
                    },
                    beforeTest (err, cursor, events, item) {
                        check(function () {
                            expect(err).to.be.null;

                            // Sanity
                            expect(cursor).to.deep.include({
                                iteration: runStore.iteration,
                                position: runStore.position,
                                ref: runStore.ref
                            });

                            // This collection has no pre-request scripts
                            expect(events).to.have.lengthOf(1);

                            // Since pre-request throws an error in the second
                            // iteration, this should never be called for the
                            // second request.
                            if (cursor.iteration === 1) {
                                expect(item.name).to.not.equal('Second Request');
                            }
                        });
                    },
                    test (err, cursor, results, item) {
                        check(function () {
                            expect(err).to.be.null;

                            // Sanity
                            expect(cursor).to.deep.include({
                                iteration: runStore.iteration,
                                position: runStore.position,
                                ref: runStore.ref
                            });

                            var result = results[0],
                                scriptResult = results[0];

                            expect(result.error).to.be.undefined;

                            expect(scriptResult).to.deep.nested.include({
                                'result.target': 'test'
                            });

                            // Since pre-request throws an error in the second
                            // iteration, this should never be called for the
                            // second request.
                            if (cursor.iteration === 1) {
                                expect(item.name).to.not.equal('Second Request');
                            }
                        });
                    },
                    beforeRequest (err, cursor, request, item) {
                        check(function () {
                            expect(err).to.be.null;

                            // Sanity
                            expect(cursor).to.deep.include({
                                iteration: runStore.iteration,
                                position: runStore.position,
                                ref: runStore.ref
                            });

                            // Since pre-request throws an error in the second
                            // iteration, this should never be called for the
                            // second request.
                            if (cursor.iteration === 1) {
                                expect(item.name).to.not.equal('Second Request');
                            }
                        });
                    },
                    request (err, cursor, response, request, item) {
                        check(function () {
                            // The second request fails
                            if (item.name === 'Second Request') {
                                expect(err).to.be.ok;
                                expect(err).to.have.property('message');

                                // @note nodeVersionDiscrepancy
                                expect(err.message).to.be.oneOf([
                                    // eslint-disable-next-line max-len
                                    'getaddrinfo ENOTFOUND somenonexistantdomainnamehere somenonexistantdomainnamehere:443',
                                    'getaddrinfo ENOTFOUND somenonexistantdomainnamehere',

                                    // eslint-disable-next-line max-len
                                    'getaddrinfo EAI_AGAIN somenonexistantdomainnamehere somenonexistantdomainnamehere:443',
                                    'getaddrinfo EAI_AGAIN somenonexistantdomainnamehere'
                                ]);
                            }
                            else {
                                expect(err).to.be.null;
                            }

                            expect(request.url.toString()).to.be.ok;

                            // Sanity
                            expect(cursor).to.deep.include({
                                iteration: runStore.iteration,
                                position: runStore.position,
                                ref: runStore.ref
                            });

                            expect(request).to.be.ok;
                        });
                    },
                    done (err) {
                        expect(err).to.be.null;

                        expect(testables).to.deep.include({
                            started: true
                        });

                        // Ensure that we ran (and completed three iterations)
                        // The second iteration should be stopped at the second request.
                        expect(testables).to.deep.include({
                            iterationsStarted: [0],
                            iterationsComplete: [0]
                        });

                        // First iteration
                        expect(testables.itemsStarted[0]).to.have.lengthOf(2);
                        expect(testables.itemsComplete[0]).to.have.lengthOf(2);
                        expect(_.map(testables.itemsStarted[0], 'name')).to.eql([
                            'First Request', 'Second Request'
                        ]);
                        expect(_.map(testables.itemsComplete[0], 'name')).to.eql([
                            'First Request', 'Second Request'
                        ]);

                        // Second Iteration
                        // Third iteration
                        expect(testables.itemsStarted[1]).to.be.undefined;
                        expect(testables.itemsComplete[1]).to.be.undefined;

                        // Third iteration
                        expect(testables.itemsStarted[2]).to.be.undefined;
                        expect(testables.itemsComplete[2]).to.be.undefined;

                        !errored && mochaDone();
                    }
                });
            });
        });
    });
});
