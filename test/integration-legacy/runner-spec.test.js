var _ = require('lodash'),
    expect = require('expect.js'),
    runtime = require('../../index'),
    sdk = require('postman-collection');

/* global describe, it */
describe('Runner', function () {
    describe('Set Next Request', function () {
        it('should be able to jump to the middle of a collection', function (mochaDone) {
            var errored = false,
                runner = new runtime.Runner(),
                rawCollection = {
                    'variables': [],
                    'info': {
                        'name': 'NewmanSetNextRequest',
                        '_postman_id': 'd6f7bb29-2258-4e1b-9576-b2315cf5b77e',
                        'description': '',
                        'schema': 'https://schema.getpostman.com/json/collection/v2.0.0/collection.json'
                    },
                    'item': [
                        {
                            'id': 'bf0a6006-c987-253a-525d-9f6be7071210',
                            'name': 'post',
                            'event': [
                                {
                                    'listen': 'test',
                                    'script': {
                                        'type': 'text/javascript',
                                        // eslint-disable-next-line max-len
                                        'exec': 'postman.setEnvironmentVariable(\'method\', \'get\');\npostman.setEnvironmentVariable(\'count\', \'1\');\nconsole.log(\'Environment is now: \', environment);\npostman.setNextRequest(\'method\');'
                                    }
                                }
                            ],
                            'request': {
                                'url': 'https://postman-echo.com/post',
                                'method': 'POST',
                                'header': [],
                                'body': {
                                    'mode': 'formdata',
                                    'formdata': []
                                },
                                'description': ''
                            },
                            'response': []
                        },
                        {
                            'id': '5c822123-4bb4-62df-4aa5-ef509a84de8e',
                            'name': 'html',
                            'event': [
                                {
                                    'listen': 'test',
                                    'script': {
                                        'type': 'text/javascript',
                                        // eslint-disable-next-line max-len
                                        'exec': 'var count = _.parseInt(postman.getEnvironmentVariable(\'count\'));\ncount++;\npostman.setEnvironmentVariable(\'count\', String(count));\n\nif (responseCode.code === 200) {\n    postman.setEnvironmentVariable(\'method\', \'headers\');\n    console.log(\'Setting next request to "method"\');\n    postman.setNextRequest(\'method\');\n}'
                                    }
                                }
                            ],
                            'request': {
                                'url': 'https://postman-echo.com/type/html',
                                'method': 'GET',
                                'header': [],
                                'body': {
                                    'mode': 'formdata',
                                    'formdata': []
                                },
                                'description': ''
                            },
                            'response': []
                        },
                        {
                            'id': 'b6dda40c-4045-fcc3-df78-97e27564db8f',
                            'name': 'method',
                            'event': [
                                {
                                    'listen': 'test',
                                    'script': {
                                        'type': 'text/javascript',
                                        // eslint-disable-next-line max-len
                                        'exec': 'var jsonData = JSON.parse(responseBody);\nvar count = _.parseInt(postman.getEnvironmentVariable(\'count\'));\ncount++;\npostman.setEnvironmentVariable(\'count\', String(count));\n\nif (jsonData.url === \'https://postman-echo.com/get\') {\n    console.log(\'Setting next request to "html"\');\n    postman.setNextRequest(\'html\');\n}\nelse if (!jsonData.url && jsonData.headers) {\n    console.log(\'Ending here.\'); tests[\'Success\'] = _.parseInt(postman.getEnvironmentVariable(\'count\')) === 4\n    postman.setNextRequest(null);\n}\nelse {\n    console.log(\'Not setting next request.. \', responseBody);\n}'
                                    }
                                }
                            ],
                            'request': {
                                'url': 'https://postman-echo.com/{{method}}',
                                'method': 'GET',
                                'header': [],
                                'body': {
                                    'mode': 'formdata',
                                    'formdata': []
                                },
                                'description': ''
                            },
                            'response': []
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
                iterationCount: 2
            }, function (err, run) {
                var runStore = {}; // Used for validations *during* the run. Cursor increments, etc.

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
                    prerequest: function (err, cursor, results) {
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
                    beforeTest: function (err, cursor, events) {
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
                    test: function (err, cursor, results) {
                        check(function () {
                            expect(err).to.be(null);

                            // Sanity
                            expect(cursor.iteration).to.eql(runStore.iteration);
                            expect(cursor.position).to.eql(runStore.position);
                            expect(cursor.ref).to.eql(runStore.ref);

                            // This collection has no pre-request scripts
                            expect(results.length).to.be(1);

                            var result = results[0],
                                scriptResult = results[0];
                            expect(result.error).to.be(undefined);

                            expect(scriptResult.result.target).to.eql('test');
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
                            expect(err).to.be(null);

                            expect(request.url.toString()).to.be.ok();

                            // Sanity
                            expect(cursor.iteration).to.eql(runStore.iteration);
                            expect(cursor.position).to.eql(runStore.position);
                            expect(cursor.ref).to.eql(runStore.ref);

                            expect(response.code).to.be(200);
                            expect(response.status).to.be('OK');
                            expect(request).to.be.ok();
                        });
                    },
                    done: function (err) {
                        check(function () {
                            expect(err).to.be(null);

                            expect(testables.started).to.be(true);

                            // Ensure that we ran (and completed two iterations)
                            expect(testables.iterationsStarted).to.eql([0, 1]);
                            expect(testables.iterationsComplete).to.eql([0, 1]);

                            expect(testables.itemsStarted[0].length).to.be(4);
                            expect(testables.itemsComplete[0].length).to.be(4);
                            expect(_.map(testables.itemsStarted[0], 'name')).to.eql([
                                'post', 'method', 'html', 'method'
                            ]);
                            expect(_.map(testables.itemsComplete[0], 'name')).to.eql([
                                'post', 'method', 'html', 'method'
                            ]);

                            expect(testables.itemsStarted[1].length).to.be(4);
                            expect(testables.itemsComplete[1].length).to.be(4);
                            expect(_.map(testables.itemsStarted[1], 'name')).to.eql([
                                'post', 'method', 'html', 'method'
                            ]);
                            expect(_.map(testables.itemsComplete[1], 'name')).to.eql([
                                'post', 'method', 'html', 'method'
                            ]);

                            // Expect the end position to be correct
                            expect(runStore.iteration).to.be(1);
                            expect(runStore.position).to.be(2);
                            !errored && mochaDone();
                        });
                    }
                });
            });
        });
    });
});
