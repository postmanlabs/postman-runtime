var _ = require('lodash'),
    expect = require('expect.js'),
    runtime = require('../../index'),
    sdk = require('postman-collection'),
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
            "name": "post",
            "event": [
                {
                    "listen": "test",
                    "script": {
                        "type": "text/javascript",
                        "exec": "postman.setEnvironmentVariable('method', 'get');\npostman.setEnvironmentVariable('count', '1');\nconsole.log('Environment is now: ', environment);\npostman.setNextRequest('method');"
                    }
                }
            ],
            "request": {
                "url": "httpbin.org/post",
                "method": "POST",
                "header": [],
                "body": {
                    "mode": "formdata",
                    "formdata": []
                },
                "description": ""
            },
            "response": []
        },
        {
            "id": "5c822123-4bb4-62df-4aa5-ef509a84de8e",
            "name": "html",
            "event": [
                {
                    "listen": "test",
                    "script": {
                        "type": "text/javascript",
                        "exec": "var count = _.parseInt(postman.getEnvironmentVariable('count'));\ncount++;\npostman.setEnvironmentVariable('count', String(count));\n\nif (responseCode.code === 200) {\n    postman.setEnvironmentVariable('method', 'headers');\n    console.log('Setting next request to \"method\"');\n    postman.setNextRequest('method');\n}"
                    }
                }
            ],
            "request": {
                "url": "http://httpbin.org/html",
                "method": "GET",
                "header": [],
                "body": {
                    "mode": "formdata",
                    "formdata": []
                },
                "description": ""
            },
            "response": []
        },
        {
            "id": "b6dda40c-4045-fcc3-df78-97e27564db8f",
            "name": "method",
            "event": [
                {
                    "listen": "test",
                    "script": {
                        "type": "text/javascript",
                        "exec": "var jsonData = JSON.parse(responseBody);\nvar count = _.parseInt(postman.getEnvironmentVariable('count'));\ncount++;\npostman.setEnvironmentVariable('count', String(count));\n\nif (jsonData.url === 'http://httpbin.org/get') {\n    console.log('Setting next request to \"html\"');\n    postman.setNextRequest('html');\n}\nelse if (!jsonData.url && jsonData.headers) {\n    console.log('Ending shit here.'); tests['Success'] = _.parseInt(postman.getEnvironmentVariable('count')) === 4\n    postman.setNextRequest(null);\n}\nelse {\n    console.log('Not setting next request.. ', responseBody);\n}"
                    }
                }
            ],
            "request": {
                "url": "httpbin.org/{{method}}",
                "method": "GET",
                "header": [],
                "body": {
                    "mode": "formdata",
                    "formdata": []
                },
                "description": ""
            },
            "response": []
        }
    ]
};

/* global describe, it */
describe('Runner', function () {
    describe('Set Next Request', function () {
        it('should be able to jump to the middle of a collection', function (mochaDone) {
            var runner = new runtime.Runner({
                    run: {
                        stopOnError: true
                    }
                }),
                collection = new sdk.Collection(rawCollection),
                testables = {
                    iterationsStarted: [],
                    iterationsComplete: [],
                    itemsStarted: [],
                    itemsComplete: [],
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

                            testables.itemsStarted.push(item);
                            runStore.position = cursor.position;
                        });
                    },
                    item: function (err, cursor, item) {
                        check(function () {
                            expect(err).to.be(null);
                            expect(cursor.position).to.eql(runStore.position);

                            testables.iterationsComplete.push(item);
                        });
                    },
                    beforePrerequest: function (err, cursor, events, item) {
                        check(function () {
                            expect(err).to.be(null);

                            // Sanity
                            expect(cursor.iteration).to.eql(runStore.iteration);
                            expect(cursor.position).to.eql(runStore.position);

                            // This collection has no pre-request scripts
                            // todo: fix this
                            // expect(events.length).to.be(0);
                        });
                    },
                    prerequest: function (err, cursor, results, item) {
                        check(function () {
                            expect(err).to.be(null);

                            // Sanity
                            expect(cursor.iteration).to.eql(runStore.iteration);
                            expect(cursor.position).to.eql(runStore.position);

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

                            // This collection has no pre-request scripts
                            expect(results.length).to.be(1);

                            var result = results[0];
                            expect(result.error).to.be(undefined);

                            var scriptResult = results[0];
                            expect(scriptResult.result.masked.scriptType).to.eql('test');
                        });
                    },
                    done: function () {
                        mochaDone();
                    }
                });
            });
        });
    });
});
