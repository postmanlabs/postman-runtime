var _ = require('lodash'),
    expect = require('chai').expect,
    runtime = require('../../index'),
    sdk = require('postman-collection');

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

                expect(err).to.be.null;
                run.start({
                    start: function (err, cursor) {
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
                    beforeIteration: function (err, cursor) {
                        check(function () {
                            expect(err).to.be.null;

                            testables.iterationsStarted.push(cursor.iteration);
                            runStore.iteration = cursor.iteration;
                        });
                    },
                    iteration: function (err, cursor) {
                        check(function () {
                            expect(err).to.be.null;
                            expect(cursor).to.have.property('iteration', runStore.iteration);

                            testables.iterationsComplete.push(cursor.iteration);
                        });
                    },
                    beforeItem: function (err, cursor, item) {
                        check(function () {
                            expect(err).to.be.null;

                            testables.itemsStarted[cursor.iteration] = testables.itemsStarted[cursor.iteration] || [];
                            testables.itemsStarted[cursor.iteration].push(item);
                            runStore.position = cursor.position;
                            runStore.ref = cursor.ref;
                        });
                    },
                    item: function (err, cursor, item) {
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
                    beforePrerequest: function (err, cursor, events) {
                        check(function () {
                            expect(err).to.be.null;

                            // Sanity
                            expect(cursor).to.deep.include({
                                iteration: runStore.iteration,
                                position: runStore.position,
                                ref: runStore.ref
                            });

                            expect(events).to.be.empty;
                        });
                    },
                    prerequest: function (err, cursor, results) {
                        check(function () {
                            expect(err).to.be.null;

                            // Sanity
                            expect(cursor).to.deep.include({
                                iteration: runStore.iteration,
                                position: runStore.position,
                                ref: runStore.ref
                            });

                            // This collection has no pre-request scripts
                            expect(results).to.be.empty;
                        });
                    },
                    beforeTest: function (err, cursor, events) {
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
                    test: function (err, cursor, results) {
                        check(function () {
                            expect(err).to.be.null;

                            // Sanity
                            expect(cursor).to.deep.include({
                                iteration: runStore.iteration,
                                position: runStore.position,
                                ref: runStore.ref
                            });

                            // This collection has no pre-request scripts
                            expect(results).to.have.lengthOf(1);

                            var result = results[0],
                                scriptResult = results[0];

                            expect(result.error).to.be.undefined;

                            expect(scriptResult).to.deep.nested.include({
                                'result.target': 'test'
                            });
                        });
                    },
                    beforeRequest: function (err, cursor) {
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
                    request: function (err, cursor, response, request) {
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
                            expect(response).to.have.property('status', 'OK');
                            expect(request).to.be.ok;
                        });
                    },
                    done: function (err) {
                        check(function () {
                            expect(err).to.be.null;

                            expect(testables).to.have.property('started', true);

                            // Ensure that we ran (and completed two iterations)
                            expect(testables).to.deep.include({
                                iterationsStarted: [0, 1],
                                iterationsComplete: [0, 1]
                            });

                            expect(testables.itemsStarted[0]).to.have.lengthOf(4);
                            expect(testables.itemsComplete[0]).to.have.lengthOf(4);
                            expect(_.map(testables.itemsStarted[0], 'name')).to.eql([
                                'post', 'method', 'html', 'method'
                            ]);
                            expect(_.map(testables.itemsComplete[0], 'name')).to.eql([
                                'post', 'method', 'html', 'method'
                            ]);

                            expect(testables.itemsStarted[1]).to.have.lengthOf(4);
                            expect(testables.itemsComplete[1]).to.have.lengthOf(4);
                            expect(_.map(testables.itemsStarted[1], 'name')).to.eql([
                                'post', 'method', 'html', 'method'
                            ]);
                            expect(_.map(testables.itemsComplete[1], 'name')).to.eql([
                                'post', 'method', 'html', 'method'
                            ]);

                            // Expect the end position to be correct
                            expect(runStore).to.deep.include({
                                iteration: 1,
                                position: 2
                            });
                            !errored && mochaDone();
                        });
                    }
                });
            });
        });
    });
});
