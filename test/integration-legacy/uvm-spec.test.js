var _ = require('lodash'),
    expect = require('expect.js'),
    request = require('postman-request'),
    runtime = require('../../index'),
    sdk = require('postman-collection');

/* global describe, it */
describe('UVM', function () {
    describe('Libraries and functions', function () {
        it('should be available', function (mochaDone) {
            var errored = false,
                runner = new runtime.Runner(),
                rawCollection = {
                    'variables': [],
                    'info': {
                        'name': 'Testing general sandbox functionality',
                        '_postman_id': '37a82a6b-1af6-18f5-442d-2e973fa34214',
                        'description': '',
                        'schema': 'https://schema.getpostman.com/json/collection/v2.0.0/collection.json'
                    },
                    'item': [
                        {
                            'name': 'r1',
                            'event': [
                                {
                                    'listen': 'test',
                                    'script': {
                                        'type': 'text/javascript',
                                        'exec': [
                                            'try {',
                                            '    var jsonObject = xml2Json(responseBody);',
                                            '    tests["xml2Json"]=true;',
                                            '}',
                                            'catch(e) { tests["xml2Json"]=false; }',
                                            'try {',
                                            '    console.log(postman.getResponseHeader("Content-Length"));',
                                            '    tests["GetResponseHeader"]=true;',
                                            '} catch(e) { tests["GetResponseHeader"]=false; }',
                                            'try {',
                                            '    var mykookie = postman.getResponseCookie("sails.sid");',
                                            '    tests["GetResponseCookie"]=mykookie.value;',
                                            '} catch(e) { tests["GetResponseCookie"]=false; }',
                                            'try { console.log("RESCOOK: " , responseCookies); } catch(e) {}',
                                            'tests["Correct global"] = globals.g1=="0";',
                                            'try { console.log(postman.clearEnvironmentVariables()); } catch(e) {}',
                                            'try { console.log(postman.clearGlobalVariables()); } catch(e) {}',
                                            'postman.setGlobalVariable("g1", "0");',
                                            'postman.setEnvironmentVariable("e1", "0");',
                                            'try { _.each([1], function(v) {tests[\'Lodash working\'] = true;}); }',
                                            'catch(e) { tests[\'Lodash working\'] = false; }',
                                            'var newString="diabetes";',
                                            'tests["SugarJS working"]=newString.has("betes");',
                                            'tests["tv4 present"] = (typeof tv4.validate === "function");',
                                            'tests["CryptoJS md5"] = (CryptoJS.MD5("jasonpurse") == "288d14f08b5ad40da43dbe06467729c9");'
                                        ]
                                    }
                                },
                                {
                                    'listen': 'prerequest',
                                    'script': {
                                        'type': 'text/javascript',
                                        'exec': 'postman.setGlobalVariable("g1", "0");'
                                    }
                                }
                            ],
                            'request': {
                                'url': 'https://postman-echo.com/type/xml',
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
                            'name': 'r2',
                            'event': [
                                {
                                    'listen': 'test',
                                    'script': {
                                        'type': 'text/javascript',
                                        'exec': [
                                            'tests["Status code is 200"] = responseCode.code === 200;',
                                            'var jsonData = JSON.parse(responseBody);',
                                            'tests["Correct GUID: " + jsonData.form.guid] = jsonData.form.guid.length === 36;',
                                            'tests["Correct Random: " + jsonData.form.randomInt] = parseInt(jsonData.form.randomInt)>=0;',
                                            'tests["Correct Timestamp: " + jsonData.form.timestamp] = parseInt(jsonData.form.timestamp)>1000',
                                            'tests["Correct global"] = jsonData.form.global == "0";',
                                            'tests["Correct global2"] = jsonData.form.global == globals.g1;',
                                            'tests["Correct envVar"] = jsonData.form.envValue == "0";',
                                            'tests["Correct envVar2"] = jsonData.form.envValue == environment.e1;'
                                        ]
                                    }
                                }
                            ],
                            'request': {
                                'url': 'https://postman-echo.com/post',
                                'method': 'POST',
                                'header': [],
                                'body': {
                                    'mode': 'formdata',
                                    'formdata': [
                                        {
                                            'key': 'k1',
                                            'value': 'v1',
                                            'type': 'text',
                                            'enabled': true
                                        },
                                        {
                                            'key': 'k2',
                                            'value': 'v2',
                                            'type': 'text',
                                            'enabled': true
                                        },
                                        {
                                            'key': 'guid',
                                            'value': '{{$guid}}',
                                            'type': 'text',
                                            'enabled': true
                                        },
                                        {
                                            'key': 'timestamp',
                                            'value': '{{$timestamp}}',
                                            'type': 'text',
                                            'enabled': true
                                        },
                                        {
                                            'key': 'randomInt',
                                            'value': '{{$randomInt}}',
                                            'type': 'text',
                                            'enabled': true
                                        },
                                        {
                                            'key': 'global',
                                            'value': '{{g1}}',
                                            'type': 'text',
                                            'enabled': true
                                        },
                                        {
                                            'key': 'envValue',
                                            'value': '{{e1}}',
                                            'type': 'text',
                                            'enabled': true
                                        }
                                    ]
                                },
                                'description': ''
                            },
                            'response': []
                        },
                        {
                            'name': 'r3',
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
                                'url': 'https://postman-echo.com/put',
                                'method': 'PUT',
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
                            'name': 'r4',
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
                                'url': 'https://postman-echo.com/patch',
                                'method': 'PATCH',
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
                            'name': 'delete',
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
                                'url': 'https://postman-echo.com/delete',
                                'method': 'DELETE',
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
                            'name': 'head',
                            'event': [
                                {
                                    'listen': 'test',
                                    'script': {
                                        'type': 'text/javascript',
                                        'exec': [
                                            'tests["Status code is 200"] = responseCode.code === 200;',
                                            'tests["Body is correct"] = responseBody === "";'
                                        ]
                                    }
                                }
                            ],
                            'request': {
                                'url': 'https://postman-echo.com/get',
                                'method': 'HEAD',
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
                            'name': 'options',
                            'event': [
                                {
                                    'listen': 'test',
                                    'script': {
                                        'type': 'text/javascript',
                                        'exec': [
                                            'tests["Status code is 200"] = responseCode.code === 200;',
                                            'tests["Body is correct"] = !_.isEmpty(responseBody.split(","));'
                                        ]
                                    }
                                }
                            ],
                            'request': {
                                'url': 'https://postman-echo.com/get',
                                'method': 'OPTIONS',
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
                            'name': 'r2 copy',
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
                                'url': 'https://postman-echo.com/post',
                                'method': 'POST',
                                'header': [],
                                'body': {
                                    'mode': 'raw',
                                    'raw': 'RAWDATA'
                                },
                                'description': ''
                            },
                            'response': []
                        },
                        {
                            'name': 'BasicAuth',
                            'event': [
                                {
                                    'listen': 'test',
                                    'script': {
                                        'type': 'text/javascript',
                                        'exec': [
                                            'var jsonData = JSON.parse(responseBody);',
                                            'tests["Correct auth header"] = jsonData.headers.authorization.indexOf("YWJoaWppdDprYW5l")>-1;'
                                        ]
                                    }
                                }
                            ],
                            'request': {
                                'auth': {
                                    'type': 'basic',
                                    'basic': {
                                        'username': 'abhijit',
                                        'password': 'kane',
                                        'saveHelperData': true,
                                        'showPassword': false
                                    }
                                },
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
                            'name': 'DigestAuth',
                            'event': [
                                {
                                    'listen': 'test',
                                    'script': {
                                        'type': 'text/javascript',
                                        'exec': [
                                            'var jsonData = JSON.parse(responseBody);',
                                            'tests["Authenticated"] = jsonData.authenticated === true;'
                                        ]
                                    }
                                }
                            ],
                            'request': {
                                'auth': {
                                    'type': 'digest',
                                    'digest': {
                                        'algorithm': '',
                                        'username': 'postman',
                                        'realm': 'Users',
                                        'password': 'password',
                                        'nonce': '',
                                        'nonceCount': '',
                                        'clientNonce': '',
                                        'opaque': '',
                                        'qop': ''
                                    }
                                },
                                'url': 'https://postman-echo.com/auth/digest',
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
                            'name': 'Recursive Res',
                            'event': [
                                {
                                    'listen': 'test',
                                    'script': {
                                        'type': 'text/javascript',
                                        'exec': [
                                            'var jsonData = JSON.parse(responseBody);',
                                            '//tests["Recur. res. working"] = jsonData.args.a == "kane";'
                                        ]
                                    }
                                },
                                {
                                    'listen': 'prerequest',
                                    'script': {
                                        'type': 'text/javascript',
                                        'exec': [
                                            'postman.setGlobalVariable("name1", "kane");',
                                            'postman.setGlobalVariable("i", "1");'
                                        ]
                                    }
                                }
                            ],
                            'request': {
                                'url': 'https://postman-echo.com/get?a={{name{{i}}}}',
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
                            'name': 'Buffer and JSON',
                            'request': 'postman-echo.com/get',
                            'event': [
                                {
                                    'listen': 'test',
                                    'script': {
                                        'type': 'text/javascript',
                                        'exec': [
                                            'tests[\'global JSON object\'] = typeof JSON.stringify === \'function\';',
                                            'tests[\'global Buffer object\'] = !!Buffer'
                                        ]
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
                },

                cookieJar = request.jar();

            // Add a cookie to the Jar
            cookieJar.setCookie(request.cookie('hi=hello'), 'https://postman-echo.com/type/xml');
            runner.run(collection, {
                iterationCount: 1,
                abortOnFailure: true,
                requester: {
                    cookieJar: cookieJar
                }
            }, function (err, run) {
                var runStore = {}; // Used for validations *during* the run. Cursor increments, etc.

                expect(err).to.be(null);
                run.start({
                    start: function (err, cursor) {
                        check(function () {
                            expect(err).to.be(null);
                            expect(cursor).to.have.property('position', 0);
                            expect(cursor).to.have.property('iteration', 0);
                            expect(cursor).to.have.property('length', 12);
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
                    response: function (err, cursor, response, request, item) {
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

                            expect(testables.itemsStarted[0].length).to.be(12);
                            expect(testables.itemsComplete[0].length).to.be(12);

                            // Expect the end position to be correct
                            expect(runStore.iteration).to.be(0);
                            expect(runStore.position).to.be(11);
                            !errored && mochaDone();
                        });
                    }
                });
            });
        });
    });

    describe('Sugar JS', function () {
        it('should expose the full functionality', function (mochaDone) {
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
                            'name': 'First Request',
                            'event': [
                                {
                                    'listen': 'test',
                                    'script': {
                                        'type': 'text/javascript',
                                        'exec': [
                                            'var d = new Date(1470659144696);', // Monday, Aug 08, 2016
                                            'tests[\'date prototype\'] = (\'Monday\' === d.format(\'{Weekday}\'));',
                                            'tests[\'string prototype\'] = \'asdasd\'.has(\'as\');',
                                            'tests[\'Object\'] = typeof Object.each === \'function\'',
                                            'tests[\'Date.create\'] = typeof Date.create === \'function\';',
                                            'tests[\'Other Date functions\'] = !!(1).daysAfter(new Date()).format(\'{yyyy}{MM}{dd}\');'
                                        ]
                                    }
                                }
                            ],
                            'request': {
                                'url': 'https://postman-echo.com/redirect-to?url=https://postman-echo.com/get',
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
                iterationCount: 1
            }, function (err, run) {
                var runStore = {}; // Used for validations *during* the run. Cursor increments, etc.

                expect(err).to.be(null);
                run.start({
                    exception: function (err) {
                        check(function () {
                            expect(err).to.be(null);
                        });
                    },
                    error: function (err) {
                        check(function () {
                            expect(err).to.be(null);
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
                    beforePrerequest: function (err, cursor) {
                        check(function () {
                            expect(err).to.be(null);

                            // Sanity
                            expect(cursor.iteration).to.eql(runStore.iteration);
                            expect(cursor.position).to.eql(runStore.position);
                            expect(cursor.ref).to.eql(runStore.ref);
                        });
                    },
                    prerequest: function (err, cursor) {
                        check(function () {
                            expect(err).to.be(null);

                            // Sanity
                            expect(cursor.iteration).to.eql(runStore.iteration);
                            expect(cursor.position).to.eql(runStore.position);
                            expect(cursor.ref).to.eql(runStore.ref);
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

                            var scriptResult = results[0];
                            expect(scriptResult.error).to.be(undefined);

                            _.forOwn(scriptResult.result.globals.tests, function (result) {
                                expect(result).to.be.ok();
                            });

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
                            err && console.log(err.stack);
                            expect(err).to.be(null);
                            !errored && mochaDone();
                        });
                    }
                });
            });
        });

        it('should work correctly with extended object prototypes', function (mochaDone) {
            var errored = false,
                runner = new runtime.Runner(),
                rawCollection = {
                    'variables': [],
                    'info': {
                        'name': 'SugarJS and native prototypes work',
                        '_postman_id': '8f31aeff-c5b5-5c42-9540-fae109785538',
                        'description': 'A set of requests to test Array, String, Date, and Function prototypes',
                        'schema': 'https://schema.getpostman.com/json/collection/v2.0.0/collection.json'
                    },
                    'item': [
                        {
                            'name': 'objectPrototype',
                            'event': [
                                {
                                    'listen': 'test',
                                    'script': {
                                        'type': 'text/javascript',
                                        'exec': '// Extended Array prototype tests\ntests["Array prototype none"] = [\'a\', \'b\', \'c\'].none(\'d\');\ntests["Array prototype any"] = [ [1,2], [2,3] ].any([2,3]);\ntests["Array prototype average"] = [ 1, 2, 3, 4, 5 ].average() === 3;\n\n// Extended Date prototype tests\nconsole.log(Object.keys(new Date()));\ntests["Date prototype getTime"] = Date.now()==(new Date()).getTime();\ntests["Date prototype isFuture"] = Date.create(\'next week\').isFuture();\ntests["Date prototype isLeapYear"] = Date.create(\'2000\').isLeapYear();\ntests["Date prototype isPast"] = Date.create(\'last week\').isPast();\ntests["Date prototype isValid"] = new Date().isValid();\ntests["Date prototype negated isValid"] = !(new Date(\'random string\').isValid());\n\n// Extended Function prototype tests\nvar fCount = 0;\nvar fn = (function() {\n  fCount++;\n}).once(); fn(); fn(); fn();\ntests["Function prototype once"] = fCount===1;\n\n// Extended Number prototype tests\ntests["Number prototype hex"] = (56).hex() === \'38\';\ntests["Number prototype isEven"] = (56).isEven() === true;\ntests["Number prototype ordinalize"] = (56).ordinalize() === \'56th\';\ntests["Number prototype format"] = (56789.10).format() === \'56,789.1\';\n\n// Extended String prototype tests\ntests["String prototype endsWith"] = \'jumpy\'.endsWith(\'py\');\ntests["String prototype negated endsWith"] = !(\'jumpy\'.endsWith(\'MPY\'));\ntests["String prototype camelize"] = \'a-beta\'.camelize() === \'ABeta\';\ntests["String prototype repeat"] = \'a\'.repeat(5) === \'aaaaa\';\ntests["String prototype shift"] = \'abc\'.shift(5) === \'fgh\';\ntests["String prototype spacify"] = \'a-b_cD\'.spacify() === \'a b c d\';'
                                    }
                                }
                            ],
                            'request': {
                                'url': 'postman-echo.com/get',
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
                iterationCount: 1
            }, function (err, run) {
                var runStore = {}; // Used for validations *during* the run. Cursor increments, etc.

                expect(err).to.be(null);
                run.start({
                    console: function (cursor, level) {
                        expect(level).to.be('log');
                        expect(cursor.iteration).to.be(runStore.iteration);
                        expect(cursor.position).to.be(runStore.position);
                    },
                    exception: function (err) {
                        check(function () {
                            expect(err).to.not.be.ok();
                        });
                    },
                    error: function (err) {
                        check(function () {
                            expect(err).to.not.be.ok();
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
                    beforePrerequest: function (err, cursor) {
                        check(function () {
                            expect(err).to.be(null);

                            // Sanity
                            expect(cursor.iteration).to.eql(runStore.iteration);
                            expect(cursor.position).to.eql(runStore.position);
                            expect(cursor.ref).to.eql(runStore.ref);
                        });
                    },
                    prerequest: function (err, cursor) {
                        check(function () {
                            expect(err).to.be(null);

                            // Sanity
                            expect(cursor.iteration).to.eql(runStore.iteration);
                            expect(cursor.position).to.eql(runStore.position);
                            expect(cursor.ref).to.eql(runStore.ref);
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

                            var scriptResult = results[0];
                            expect(scriptResult.error).to.be(undefined);

                            _.forOwn(scriptResult.result.globals.tests, function (result) {
                                expect(result).to.be.ok();
                            });

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
                            err && console.log(err.stack);
                            expect(err).to.be(null);
                            !errored && mochaDone();
                        });
                    }
                });
            });
        });
    });
});
