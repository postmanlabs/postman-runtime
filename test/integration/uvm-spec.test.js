var _ = require('lodash'),
    expect = require('expect.js'),
    request = require('request'),
    runtime = require('../../index'),
    sdk = require('postman-collection');

/* global describe, it */
describe('UVM', function () {
    describe('Libraries and functions', function () {
        it('should be available', function (mochaDone) {
            var runner = new runtime.Runner(),
                rawCollection = {
                    "variables": [],
                    "info": {
                        "name": "Testing general sandbox functionality",
                        "_postman_id": "37a82a6b-1af6-18f5-442d-2e973fa34214",
                        "description": "",
                        "schema": "https://schema.getpostman.com/json/collection/v2.0.0/collection.json"
                    },
                    "item": [
                        {
                            "name": "r1",
                            "event": [
                                {
                                    "listen": "test",
                                    "script": {
                                        "type": "text/javascript",
                                        "exec": "try {\n    var jsonObject = xml2Json(responseBody);\n    console.log(jsonObject);\n    tests[\"xml2Json\"]=true;\n}\ncatch(e) {\n    console.log(\"xml2Json not supported\");\n    tests[\"xml2Json\"]=false;\n}\n\n\ntry {\n    console.log(postman.getResponseHeader(\"Content-Length\"));\n    tests[\"GetResponseHeader\"]=true;\n} catch(e) {\n    console.log(\"getResponseHeader not supported\");\n    tests[\"GetResponseHeader\"]=false;\n}\n\n\ntry {\n    var mykookie = postman.getResponseCookie(\"hi\");\n    tests[\"GetResponseCookie\"]=mykookie.value ==='hello';\n} catch(e) {\n    console.log(\"getResponseCookie not supported\");\n    tests[\"GetResponseCookie\"]=false;\n}\n\ntry {\n    console.log(\"RESCOOK: \" , responseCookies);\n} catch(e) {\n    console.log(\"responseCookies not supported\");\n}\n\ntests[\"Correct global\"] = globals.g1==\"0\";\n\nconsole.log(\"Request: \" + JSON.stringify(request));\nconsole.log(\"Environment: \" + JSON.stringify(environment));\nconsole.log(\"Globals: \" + JSON.stringify(globals));\nconsole.log(\"Response hedaers: \" + JSON.stringify(responseHeaders));\nconsole.log(\"Response body: \" + JSON.stringify(responseBody));\nconsole.log(\"Response time: \" + JSON.stringify(responseTime));\nconsole.log(\"Response code: \" + JSON.stringify(responseCode));\n\n\ntry {\n    console.log(postman.clearEnvironmentVariables());\n} catch(e) {\n    console.log(\"clearEnvironmentVariables not supported\");\n}\n\ntry {\n    console.log(postman.clearGlobalVariables());\n} catch(e) {\n    console.log(\"clearGlobalVariables not supported\");\n}\n\npostman.setGlobalVariable(\"g1\", \"0\");\npostman.setEnvironmentVariable(\"e1\", \"0\");\n\ntry {\n    _.each([1], function(v) {tests['Lodash working'] = true;});\n}\ncatch(e) {\n    tests['Lodash working'] = false;\n}\n\n\nvar newString=\"diabetes\";\ntests[\"SugarJS working\"]=newString.has(\"betes\");\n\ntests[\"tv4 present\"] = (typeof tv4.validate === \"function\");\n\ntests[\"CryptoJS md5\"] = (CryptoJS.MD5(\"jasonpurse\") == \"288d14f08b5ad40da43dbe06467729c9\");"
                                    }
                                },
                                {
                                    "listen": "prerequest",
                                    "script": {
                                        "type": "text/javascript",
                                        "exec": "postman.setGlobalVariable(\"g1\", \"0\");"
                                    }
                                }
                            ],
                            "request": {
                                "url": "httpbin.org/xml",
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
                            "name": "r2",
                            "event": [
                                {
                                    "listen": "test",
                                    "script": {
                                        "type": "text/javascript",
                                        "exec": "tests[\"Status code is 200\"] = responseCode.code === 200;\n\nconsole.log(\"Request for Post: \" + JSON.stringify(request));\n\nvar jsonData = JSON.parse(responseBody);\ntests[\"Correct GUID: \" + jsonData.form.guid] = jsonData.form.guid.length === 36;\ntests[\"Correct Random: \" + jsonData.form.randomInt] = parseInt(jsonData.form.randomInt)>1;\ntests[\"Correct Timestamp: \" + jsonData.form.timestamp] = parseInt(jsonData.form.timestamp)>1000\n\ntests[\"Correct global\"] = jsonData.form.global == \"0\";\ntests[\"Correct global2\"] = jsonData.form.global == globals.g1;\ntests[\"Correct envVar\"] = jsonData.form.envValue == \"0\";\ntests[\"Correct envVar2\"] = jsonData.form.envValue == environment.e1;"
                                    }
                                }
                            ],
                            "request": {
                                "url": "httpbin.org/post",
                                "method": "POST",
                                "header": [],
                                "body": {
                                    "mode": "formdata",
                                    "formdata": [
                                        {
                                            "key": "k1",
                                            "value": "v1",
                                            "type": "text",
                                            "enabled": true
                                        },
                                        {
                                            "key": "k2",
                                            "value": "v2",
                                            "type": "text",
                                            "enabled": true
                                        },
                                        {
                                            "key": "guid",
                                            "value": "{{$guid}}",
                                            "type": "text",
                                            "enabled": true
                                        },
                                        {
                                            "key": "timestamp",
                                            "value": "{{$timestamp}}",
                                            "type": "text",
                                            "enabled": true
                                        },
                                        {
                                            "key": "randomInt",
                                            "value": "{{$randomInt}}",
                                            "type": "text",
                                            "enabled": true
                                        },
                                        {
                                            "key": "global",
                                            "value": "{{g1}}",
                                            "type": "text",
                                            "enabled": true
                                        },
                                        {
                                            "key": "envValue",
                                            "value": "{{e1}}",
                                            "type": "text",
                                            "enabled": true
                                        }
                                    ]
                                },
                                "description": ""
                            },
                            "response": []
                        },
                        {
                            "name": "r3",
                            "event": [
                                {
                                    "listen": "test",
                                    "script": {
                                        "type": "text/javascript",
                                        "exec": "tests[\"Status code is 200\"] = responseCode.code === 200;"
                                    }
                                }
                            ],
                            "request": {
                                "url": "httpbin.org/put",
                                "method": "PUT",
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
                            "name": "r4",
                            "event": [
                                {
                                    "listen": "test",
                                    "script": {
                                        "type": "text/javascript",
                                        "exec": "tests[\"Status code is 200\"] = responseCode.code === 200;"
                                    }
                                }
                            ],
                            "request": {
                                "url": "httpbin.org/patch",
                                "method": "PATCH",
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
                            "name": "delete",
                            "event": [
                                {
                                    "listen": "test",
                                    "script": {
                                        "type": "text/javascript",
                                        "exec": "tests[\"Status code is 200\"] = responseCode.code === 200;"
                                    }
                                }
                            ],
                            "request": {
                                "url": "httpbin.org/delete",
                                "method": "DELETE",
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
                            "name": "head",
                            "event": [
                                {
                                    "listen": "test",
                                    "script": {
                                        "type": "text/javascript",
                                        "exec": "tests[\"Status code is 200\"] = responseCode.code === 200;\ntests[\"Body is correct\"] = responseBody === \"\";"
                                    }
                                }
                            ],
                            "request": {
                                "url": "httpbin.org/get",
                                "method": "HEAD",
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
                            "name": "options",
                            "event": [
                                {
                                    "listen": "test",
                                    "script": {
                                        "type": "text/javascript",
                                        "exec": "tests[\"Status code is 200\"] = responseCode.code === 200;\ntests[\"Body is correct\"] = responseBody === \"\";"
                                    }
                                }
                            ],
                            "request": {
                                "url": "httpbin.org/get",
                                "method": "OPTIONS",
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
                            "name": "r2 copy",
                            "event": [
                                {
                                    "listen": "test",
                                    "script": {
                                        "type": "text/javascript",
                                        "exec": "tests[\"Status code is 200\"] = responseCode.code === 200;\n\nconsole.log(\"Request for RAW Post: \" + JSON.stringify(request));\n"
                                    }
                                }
                            ],
                            "request": {
                                "url": "httpbin.org/post",
                                "method": "POST",
                                "header": [],
                                "body": {
                                    "mode": "raw",
                                    "raw": "RAWDATA"
                                },
                                "description": ""
                            },
                            "response": []
                        },
                        {
                            "name": "BasicAuth",
                            "event": [
                                {
                                    "listen": "test",
                                    "script": {
                                        "type": "text/javascript",
                                        "exec": "console.log(request.headers);\nvar jsonData = JSON.parse(responseBody);\ntests[\"Correct aath header\"] = jsonData.headers.Authorization.indexOf(\"YWJoaWppdDprYW5l\")>-1;"
                                    }
                                }
                            ],
                            "request": {
                                "auth": {
                                    "type": "basic",
                                    "basic": {
                                        "username": "abhijit",
                                        "password": "kane",
                                        "saveHelperData": true,
                                        "showPassword": false
                                    }
                                },
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
                            "name": "DigestAuth",
                            "event": [
                                {
                                    "listen": "test",
                                    "script": {
                                        "type": "text/javascript",
                                        "exec": "var jsonData = JSON.parse(responseBody);\ntests[\"Correct aath header\"] = jsonData.headers.Authorization.length>10;"
                                    }
                                }
                            ],
                            "request": {
                                "auth": {
                                    "type": "digest",
                                    "digest": {
                                        "algorithm": "",
                                        "username": "aa",
                                        "realm": "aa",
                                        "password": "aa",
                                        "nonce": "",
                                        "nonceCount": "",
                                        "clientNonce": "",
                                        "opaque": "",
                                        "qop": ""
                                    }
                                },
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
                            "name": "Recursive Res",
                            "event": [
                                {
                                    "listen": "test",
                                    "script": {
                                        "type": "text/javascript",
                                        "exec": "var jsonData = JSON.parse(responseBody);\n//tests[\"Recur. res. working\"] = jsonData.args.a == \"kane\";"
                                    }
                                },
                                {
                                    "listen": "prerequest",
                                    "script": {
                                        "type": "text/javascript",
                                        "exec": "postman.setGlobalVariable(\"name1\", \"kane\");\npostman.setGlobalVariable(\"i\", \"1\");"
                                    }
                                }
                            ],
                            "request": {
                                "url": "httpbin.org/get?a={{name{{i}}}}",
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
                    catch (e) { mochaDone(e); }
                },

                cookieJar = request.jar();

            // Add a cookie to the Jar
            cookieJar.setCookie(request.cookie('hi=hello'), 'http://httpbin.org/xml');
            runner.run(collection, {
                iterationCount: 1,
                abortOnFailure: true,
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
                            expect(cursor).to.have.property('length', 11);
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
                        });
                    },
                    prerequest: function (err, cursor, results, item) {
                        check(function () {
                            expect(err).to.be(null);

                            // Sanity
                            expect(cursor.iteration).to.eql(runStore.iteration);
                            expect(cursor.position).to.eql(runStore.position);
                            expect(cursor.ref).to.eql(runStore.ref);
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

                            // This collection has no pre-request scripts
                            expect(results.length).to.be(1);

                            var result = results[0];
                            expect(result.error).to.be(undefined);

                            var scriptResult = results[0];
                            expect(scriptResult.result.masked.scriptType).to.eql('test');
                            expect(scriptResult.result.globals.tests).to.be.ok();

                            _.forOwn(scriptResult.result.globals.tests, function (result, test) {
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

                            expect(testables.started).to.be(true);

                            // Ensure that we ran (and completed two iterations)
                            expect(testables.iterationsStarted).to.eql([0]);
                            expect(testables.iterationsComplete).to.eql([0]);

                            expect(testables.itemsStarted[0].length).to.be(11);
                            expect(testables.itemsComplete[0].length).to.be(11);

                            // Expect the end position to be correct
                            expect(runStore.iteration).to.be(0);
                            expect(runStore.position).to.be(10);
                            mochaDone();
                        });
                    }
                });
            });
        });
    });
});
