var _ = require('lodash'),
    expect = require('expect.js'),
    runtime = require('../../index'),
    sdk = require('postman-collection');

/* global describe, it */
describe('Option', function () {
    describe('Stop On Error', function () {
        it('should gracefully stop an iteration on HTTP errors', function (mochaDone) {
            var errored = false,
                runner = new runtime.Runner(),
                rawCollection = {
                    'variables': [],
                    'info': {
                        'name': 'test',
                        '_postman_id': 'cd9e83b1-03dd-18ae-ff02-574414594a87',
                        'description': '',
                        'schema': 'https://schema.getpostman.com/json/collection/v2.0.0/collection.json'
                    },
                    'item': [
                        {
                            'name': 'Request Methods',
                            // eslint-disable-next-line max-len
                            'description': 'HTTP has multiple request "verbs", such as `GET`, `PUT`, `POST`, `DELETE`,\n`PATCH`, `HEAD`, etc. \n\nAn HTTP Method (verb) defines how a request should be interpreted by a server. \nThe endpoints in this section demonstrate various HTTP Verbs. Postman supports \nall the HTTP Verbs, including some rarely used ones, such as `PROPFIND`, `UNLINK`, \netc.\n\nFor details about HTTP Verbs, refer to [RFC 2616](http://www.w3.org/Protocols/rfc2616/rfc2616-sec9.html#sec9)\n',
                            'item': [
                                {
                                    'name': 'First Request',
                                    'event': [
                                        {
                                            'listen': 'test',
                                            'script': {
                                                'type': 'text/javascript',
                                                // eslint-disable-next-line max-len
                                                'exec': 'tests["Body contains headers"] = responseBody.has("headers");\ntests["Body contains args"] = responseBody.has("args");\ntests["Body contains url"] = responseBody.has("url");\n\nvar data = JSON.parse(responseBody)\n\ntests["Args key contains argument passed as url parameter"] = \'test\' in data.args'
                                            }
                                        }
                                    ],
                                    'request': {
                                        'url': 'https://postman-echo.com/get?test=123',
                                        'method': 'GET'
                                    }
                                },
                                {
                                    'name': 'Second Request',
                                    'event': [
                                        {
                                            'listen': 'prerequest',
                                            'script': {
                                                'type': 'text/javascript',
                                                'exec': 'console.log(\'yo\', \'I am running!\');'
                                            }
                                        },
                                        {
                                            'listen': 'test',
                                            'script': {
                                                'type': 'text/javascript',
                                                'exec': ';'
                                            }
                                        }
                                    ],
                                    'request': {
                                        'url': 'https://somenonexistantdomain/get?test=123',
                                        'method': 'GET'
                                    }
                                },
                                {
                                    'name': 'Third Request',
                                    'event': [
                                        {
                                            'listen': 'test',
                                            'script': {
                                                'type': 'text/javascript',
                                                'exec': ';'
                                            }
                                        }
                                    ],
                                    'request': {
                                        'url': 'https://postman-echo.com/get?test=123',
                                        'method': 'GET'
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
                stopOnError: true
            }, function (err, run) {
                var runStore = {}; // Used for validations *during* the run. Cursor increments, etc.

                expect(err).to.be(null);
                run.start({
                    console: function (cursor, level, msg1, msg2) {
                        check(function () {
                            expect(cursor.ref).to.eql(runStore.ref);
                            expect(level).to.be('log');
                            expect(msg1).to.be('yo');
                            expect(msg2).to.be('I am running!');
                            testables.console = true;
                        });
                    },
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

                            expect(item.name).to.not.be('Third Request');
                        });
                    },
                    item: function (err, cursor, item) {
                        check(function () {
                            expect(err).to.be(null);
                            expect(cursor.position).to.eql(runStore.position);
                            expect(cursor.ref).to.eql(runStore.ref);

                            testables.itemsComplete[cursor.iteration] = testables.itemsComplete[cursor.iteration] || [];
                            testables.itemsComplete[cursor.iteration].push(item);

                            expect(item.name).to.not.be('Third Request');
                        });
                    },
                    beforePrerequest: function (err, cursor, events, item) {
                        check(function () {
                            expect(err).to.be(null);

                            // Sanity
                            expect(cursor.iteration).to.eql(runStore.iteration);
                            expect(cursor.position).to.eql(runStore.position);
                            expect(cursor.ref).to.eql(runStore.ref);

                            if (item.name === 'Second Request') {
                                expect(events.length).to.be(1);
                            }
                            else {
                                expect(events.length).to.be(0);
                            }

                            expect(item.name).to.not.be('Third Request');
                        });
                    },
                    prerequest: function (err, cursor, results, item) {
                        check(function () {
                            // Sanity
                            expect(cursor.iteration).to.eql(runStore.iteration);
                            expect(cursor.position).to.eql(runStore.position);
                            expect(cursor.ref).to.eql(runStore.ref);

                            expect(err).to.be(null);

                            expect(item.name).to.not.be('Third Request');
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

                            expect(item.name).to.not.be('Third Request');
                        });
                    },
                    test: function (err, cursor, results, item) {
                        check(function () {
                            expect(err).to.be(null);

                            // Sanity
                            expect(cursor.iteration).to.eql(runStore.iteration);
                            expect(cursor.position).to.eql(runStore.position);
                            expect(cursor.ref).to.eql(runStore.ref);

                            var result = results[0],
                                scriptResult = results[0];
                            expect(result.error).to.be(undefined);

                            expect(scriptResult.result.target).to.eql('test');

                            // This should never be called for the
                            // second request.
                            if (cursor.iteration === 1) {
                                expect(item.name).to.not.be('Second Request');
                            }

                            expect(item.name).to.not.be('Third Request');
                        });
                    },
                    beforeRequest: function (err, cursor, request, item) {
                        check(function () {
                            expect(err).to.be(null);

                            // Sanity
                            expect(cursor.iteration).to.eql(runStore.iteration);
                            expect(cursor.position).to.eql(runStore.position);
                            expect(cursor.ref).to.eql(runStore.ref);

                            expect(item.name).to.not.be('Third Request');
                        });
                    },
                    request: function (err, cursor, response, request, item) {
                        check(function () {
                            // Sanity
                            expect(cursor.iteration).to.eql(runStore.iteration);
                            expect(cursor.position).to.eql(runStore.position);
                            expect(cursor.ref).to.eql(runStore.ref);

                            expect(request).to.be.ok();
                            expect(request.url.toString()).to.be.ok();

                            if (item.name === 'Second Request') {
                                expect(err.message).to.be('getaddrinfo ENOTFOUND somenonexistantdomain ' +
                                    'somenonexistantdomain:443');
                                return;
                            }
                            expect(err).to.be(null);
                            expect(response.code).to.be(200);

                            expect(item.name).to.not.be('Third Request');
                        });
                    },
                    done: function (err) {
                        expect(err).to.be(null);

                        expect(testables.started).to.be(true);
                        expect(testables.console).to.be(true);

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
                        expect(testables.itemsStarted[1].length).to.be(2);
                        expect(testables.itemsComplete[1].length).to.be(2);
                        expect(_.map(testables.itemsStarted[1], 'name')).to.eql([
                            'First Request', 'Second Request'
                        ]);
                        expect(_.map(testables.itemsComplete[1], 'name')).to.eql([
                            'First Request', 'Second Request'
                        ]);

                        !errored && mochaDone();
                    }
                });
            });
        });
    });
});
