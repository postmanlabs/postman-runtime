var expect = require('chai').expect,
    sinon = require('sinon'),
    postmanRequest = require('postman-request'),
    IS_BROWSER = typeof window !== 'undefined';

describe('sandbox library - pm api', function () {
    var testrun;

    describe('sanity', function () {
        before(function (done) {
            this.run({
                collection: {
                    item: [{
                        request: 'https://postman-echo.com/get',
                        event: [{
                            listen: 'test',
                            script: {
                                type: 'text/javascript',
                                exec: `
                                console.log(pm.request.toJSON());
                                console.log(pm.response.toJSON());
                                `
                            }
                        }]
                    }]
                }
            }, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        it('should complete the run', function () {
            expect(testrun).to.be.ok;
            sinon.assert.calledOnce(testrun.start);
            sinon.assert.calledOnce(testrun.done);
            sinon.assert.calledWith(testrun.done.getCall(0), null);

            sinon.assert.calledOnce(testrun.request);
            sinon.assert.calledWith(testrun.request.getCall(0), null);

            sinon.assert.calledOnce(testrun.response);
            sinon.assert.calledWith(testrun.response.getCall(0), null);
        });

        it('should run the test script successfully', function () {
            var request = testrun.response.getCall(0).args[3],
                response = testrun.response.getCall(0).args[2];

            sinon.assert.calledOnce(testrun.script);
            sinon.assert.calledWith(testrun.script.getCall(0), null);

            sinon.assert.calledOnce(testrun.test);
            sinon.assert.calledWith(testrun.script.getCall(0), null);

            sinon.assert.calledTwice(testrun.console);

            // validate pm.request and pm.response
            expect(testrun.console.getCall(0).args[2]).to.eql(request.toJSON());
            expect(testrun.console.getCall(1).args[2]).to.eql(response.toJSON());
        });
    });

    (IS_BROWSER ? describe.skip : describe)('chai', function () {
        before(function (done) {
            this.run({
                collection: {
                    item: [{
                        request: 'https://postman-echo.com/get',
                        event: [{
                            listen: 'test',
                            script: {
                                type: 'text/javascript',
                                exec: `
                                pm.test("pre-assert request", function () {
                                    pm.expect(pm.request).to.have.property('to');
                                    pm.expect(pm.request.to).to.be.an('object');
                                    pm.request.to.be.ok;
                                    pm.request.to.not.be.a.postmanResponse;
                                    pm.request.to.not.have.header('Foo-Bar');
                                    pm.request.to.have.header('host');
                                    pm.request.to.be.a.postmanRequestOrResponse;
                                });

                                pm.test("pre-assert response", function () {
                                    pm.response.to.be.ok;
                                    pm.response.to.not.be.a.postmanRequest;
                                    pm.response.to.not.be.serverError;
                                    pm.response.to.not.have.statusCode(400);
                                    pm.response.to.have.statusCode(200);
                                    pm.response.to.have.statusReason('OK');
                                });
                                `
                            }
                        }]
                    }]
                }
            }, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        it('should complete the run', function () {
            expect(testrun).to.be.ok;
            sinon.assert.calledOnce(testrun.start);
            sinon.assert.calledOnce(testrun.done);
            sinon.assert.calledWith(testrun.done.getCall(0), null);

            sinon.assert.calledOnce(testrun.request);
            sinon.assert.calledWith(testrun.request.getCall(0), null);

            sinon.assert.calledOnce(testrun.response);
            sinon.assert.calledWith(testrun.response.getCall(0), null);
        });

        it('should run the test script successfully', function () {
            sinon.assert.calledOnce(testrun.script);
            sinon.assert.calledWith(testrun.script.getCall(0), null);

            sinon.assert.calledOnce(testrun.test);
            sinon.assert.calledWith(testrun.script.getCall(0), null);

            sinon.assert.calledTwice(testrun.assertion);

            expect(testrun.assertion.getCall(0).args[1][0]).to.include({
                error: null,
                index: 0,
                passed: true,
                skipped: false,
                name: 'pre-assert request'
            });

            expect(testrun.assertion.getCall(1).args[1][0]).to.include({
                error: null,
                index: 1,
                passed: true,
                skipped: false,
                name: 'pre-assert response'
            });
        });
    });

    (IS_BROWSER ? describe.skip : describe)('sendRequest', function () {
        // eslint-disable-next-line mocha/no-sibling-hooks
        before(function (done) {
            this.run({
                collection: {
                    item: [{
                        request: 'https://postman-echo.com/get',
                        event: [{
                            listen: 'test',
                            script: {
                                type: 'text/javascript',
                                exec: `
                                pm.sendRequest('https://postman-echo.com/cookies/set?foo=bar', (err, res, history) => {
                                    var CookieList = require('postman-collection').CookieList;
                                    pm.test("History object in pm.sendRequest", function () {
                                        pm.expect(history).to.be.ok;
                                        pm.expect(history).to.be.an('object');
                                        pm.expect(history).to.have.all.keys(['cookies']);
                                        pm.expect(CookieList.isCookieList(history.cookies)).to.be.true;
                                        pm.expect(history.cookies.count()).to.be.at.least(1);;
                                        pm.expect(history.cookies.get('foo')).to.equal('bar');
                                    });
                                });
                                `
                            }
                        }]
                    }]
                }
            }, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        // eslint-disable-next-line mocha/no-identical-title
        it('should complete the run', function () {
            expect(testrun).to.be.ok;
            sinon.assert.calledOnce(testrun.start);
            sinon.assert.calledOnce(testrun.done);
            sinon.assert.calledWith(testrun.done.getCall(0), null);

            sinon.assert.calledTwice(testrun.request);
            sinon.assert.calledWith(testrun.request.getCall(0), null);

            sinon.assert.calledOnce(testrun.response);
            sinon.assert.calledWith(testrun.response.getCall(0), null);
        });

        // eslint-disable-next-line mocha/no-identical-title
        it('should run the test script successfully', function () {
            sinon.assert.calledOnce(testrun.script);
            sinon.assert.calledWith(testrun.script.getCall(0), null);

            sinon.assert.calledOnce(testrun.test);
            sinon.assert.calledWith(testrun.script.getCall(0), null);

            sinon.assert.calledOnce(testrun.assertion);

            expect(testrun.assertion.getCall(0).args[1][0]).to.include({
                error: null,
                index: 0,
                passed: true,
                skipped: false,
                name: 'History object in pm.sendRequest'
            });
        });
    });


    (IS_BROWSER ? describe.skip : describe)('cookies.jar', function () {
        describe('get', function () {
            before(function (done) {
                this.run({
                    collection: {
                        item: [{
                            request: 'http://postman-echo.com/cookies/set?foo=bar',
                            event: [{
                                listen: 'prerequest',
                                script: {
                                    type: 'text/javascript',
                                    exec: `
                                    var jar = pm.cookies.jar();

                                    pm.test('jar.get in pre-request', function (done) {
                                        jar.get("http://postman-echo.com/", "foo", function (err, value) {
                                            pm.expect(err).to.be.null;
                                            pm.expect(value).to.be.null;
                                            done();
                                        });
                                    });
                                    `
                                }
                            }, {
                                listen: 'test',
                                script: {
                                    type: 'text/javascript',
                                    exec: `
                                    var jar = pm.cookies.jar();

                                    pm.test('jar.get in test', function (done) {
                                        jar.get(pm.request.url, "foo", function (err, value) {
                                            pm.expect(err).to.be.null;
                                            pm.expect(value).to.equal("bar");
                                            done();
                                        });
                                    });
                                    `
                                }
                            }]
                        }]
                    }
                }, function (err, results) {
                    testrun = results;
                    done(err);
                });
            });

            it('should complete the run', function () {
                expect(testrun).to.be.ok;
                sinon.assert.calledOnce(testrun.start);
                sinon.assert.calledOnce(testrun.done);
                sinon.assert.calledWith(testrun.done.getCall(0), null);

                sinon.assert.calledOnce(testrun.request);
                sinon.assert.calledWith(testrun.request.getCall(0), null);

                sinon.assert.calledOnce(testrun.response);
                sinon.assert.calledWith(testrun.response.getCall(0), null);
            });

            it('should run the test script successfully', function () {
                sinon.assert.calledTwice(testrun.script);
                sinon.assert.calledWith(testrun.script.getCall(0), null);
                sinon.assert.calledWith(testrun.script.getCall(1), null);

                sinon.assert.calledTwice(testrun.assertion);

                expect(testrun.assertion.getCall(0).args[1][0]).to.include({
                    error: null,
                    index: 0,
                    passed: true,
                    skipped: false,
                    name: 'jar.get in pre-request'
                });

                expect(testrun.assertion.getCall(1).args[1][0]).to.include({
                    error: null,
                    index: 0,
                    passed: true,
                    skipped: false,
                    name: 'jar.get in test'
                });
            });
        });

        describe('set', function () {
            before(function (done) {
                this.run({
                    collection: {
                        item: [{
                            request: 'http://postman-echo.com/cookies',
                            event: [{
                                listen: 'prerequest',
                                script: {
                                    type: 'text/javascript',
                                    exec: `
                                    var jar = pm.cookies.jar();

                                    pm.test('jar.set in pre-request', function (done) {
                                        jar.set('postman-echo.com', "hello=world; Path=/", function (err) {
                                            pm.expect(err).to.be.null;
                                            done();
                                        });
                                    });
                                    `
                                }
                            }]
                        }]
                    }
                }, function (err, results) {
                    testrun = results;
                    done(err);
                });
            });

            it('should complete the run', function () {
                expect(testrun).to.be.ok;
                sinon.assert.calledOnce(testrun.start);
                sinon.assert.calledOnce(testrun.done);
                sinon.assert.calledWith(testrun.done.getCall(0), null);

                sinon.assert.calledOnce(testrun.request);
                sinon.assert.calledWith(testrun.request.getCall(0), null);

                sinon.assert.calledOnce(testrun.response);
                sinon.assert.calledWith(testrun.response.getCall(0), null);
            });

            it('should run the test script successfully', function () {
                var response = testrun.response.getCall(0).args[2].stream.toString();

                sinon.assert.calledOnce(testrun.script);
                sinon.assert.calledWith(testrun.script.getCall(0), null);

                sinon.assert.calledOnce(testrun.assertion);
                expect(testrun.assertion.getCall(0).args[1][0]).to.include({
                    error: null,
                    index: 0,
                    passed: true,
                    skipped: false,
                    name: 'jar.set in pre-request'
                });

                expect(JSON.parse(response)).to.eql({ cookies: { hello: 'world' } });
            });
        });

        describe('clear', function () {
            before(function (done) {
                this.run({
                    collection: {
                        item: [{
                            request: 'http://postman-echo.com/cookies/set?foo=bar'
                        }, {
                            request: 'http://postman-echo.com/cookies',
                            event: [{
                                listen: 'prerequest',
                                script: {
                                    type: 'text/javascript',
                                    exec: `
                                    var jar = pm.cookies.jar();

                                    pm.test('jar.clear in pre-request', function (done) {
                                        jar.clear(pm.request.url, function (err) {
                                            pm.expect(err).to.be.null;
                                            done();
                                        });
                                    });
                                    `
                                }
                            }]
                        }]
                    }
                }, function (err, results) {
                    testrun = results;
                    done(err);
                });
            });

            it('should complete the run', function () {
                expect(testrun).to.be.ok;
                sinon.assert.calledOnce(testrun.start);
                sinon.assert.calledOnce(testrun.done);
                sinon.assert.calledWith(testrun.done.getCall(0), null);

                sinon.assert.calledTwice(testrun.request);
                sinon.assert.calledWith(testrun.request.getCall(0), null);

                sinon.assert.calledTwice(testrun.response);
                sinon.assert.calledWith(testrun.response.getCall(0), null);
            });

            it('should run the test script successfully', function () {
                var firstResponse = testrun.response.getCall(0).args[2].stream.toString(),
                    secondResponse = testrun.response.getCall(1).args[2].stream.toString();

                sinon.assert.calledOnce(testrun.script);
                sinon.assert.calledWith(testrun.script.getCall(0), null);

                sinon.assert.calledOnce(testrun.assertion);
                expect(testrun.assertion.getCall(0).args[1][0]).to.include({
                    error: null,
                    index: 0,
                    passed: true,
                    skipped: false,
                    name: 'jar.clear in pre-request'
                });

                expect(JSON.parse(firstResponse)).to.eql({ cookies: { foo: 'bar' } });
                expect(JSON.parse(secondResponse)).to.eql({ cookies: {} });
            });
        });

        describe('allowProgrammaticAccess', function () {
            before(function (done) {
                var cookieJar = postmanRequest.jar();

                cookieJar.allowProgrammaticAccess = function (domain) {
                    return domain === 'postman-echo.com';
                };

                this.run({
                    requester: {
                        cookieJar
                    },
                    collection: {
                        item: [{
                            request: 'http://postman-echo.com/cookies',
                            event: [{
                                listen: 'prerequest',
                                script: {
                                    type: 'text/javascript',
                                    exec: `
                                    var jar = pm.cookies.jar();

                                    pm.test('jar.set in pre-request', function (done) {
                                        jar.set('www.postman-echo.com', "hello=world; Path=/", done);
                                    });
                                    `
                                }
                            }]
                        }, {
                            request: 'http://postman-echo.com/cookies',
                            event: [{
                                listen: 'prerequest',
                                script: {
                                    type: 'text/javascript',
                                    exec: `
                                    var jar = pm.cookies.jar();

                                    pm.test('jar.set in pre-request', function (done) {
                                        jar.set('postman-echo.com', "hello=world; Path=/", done);
                                    });
                                    `
                                }
                            }]
                        }]
                    }
                }, function (err, results) {
                    testrun = results;
                    done(err);
                });
            });

            it('should complete the run', function () {
                expect(testrun).to.be.ok;
                sinon.assert.calledOnce(testrun.start);
                sinon.assert.calledOnce(testrun.done);
                sinon.assert.calledWith(testrun.done.getCall(0), null);

                sinon.assert.calledTwice(testrun.request);
                sinon.assert.calledWith(testrun.request.getCall(0), null);

                sinon.assert.calledTwice(testrun.response);
                sinon.assert.calledWith(testrun.response.getCall(0), null);
            });

            it('should run the test script successfully', function () {
                var firstResponse = testrun.response.getCall(0).args[2].stream.toString(),
                    secondResponse = testrun.response.getCall(1).args[2].stream.toString();

                expect(JSON.parse(firstResponse)).to.eql({ cookies: {} });
                expect(JSON.parse(secondResponse)).to.eql({ cookies: { hello: 'world' } });

                sinon.assert.calledTwice(testrun.script);
                sinon.assert.calledWith(testrun.script.getCall(0), null);
                sinon.assert.calledWith(testrun.script.getCall(1), null);

                sinon.assert.calledTwice(testrun.assertion);
                expect(testrun.assertion.getCall(0).args[1][0]).to.deep.include({
                    error: {
                        type: 'Error',
                        name: 'Error',
                        message: 'CookieStore: programmatic access to "www.postman-echo.com" is denied'
                    },
                    index: 0,
                    passed: false,
                    skipped: false,
                    name: 'jar.set in pre-request'
                });
                expect(testrun.assertion.getCall(1).args[1][0]).to.deep.include({
                    error: null,
                    index: 0,
                    passed: true,
                    skipped: false,
                    name: 'jar.set in pre-request'
                });
            });
        });
    });

    describe('Visualizer', function () {
        before(function (done) {
            this.run({
                collection: {
                    item: [{
                        request: 'https://postman-echo.com/get',
                        event: [{
                            listen: 'test',
                            script: {
                                type: 'text/javascript',
                                exec: `
                                var template = '<h1>{{name}}</h1>',
                                    data = {name: 'Postman'};

                                pm.visualizer.set(template, data);
                                `
                            }
                        }]
                    }]
                }
            }, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        it('should complete the run', function () {
            expect(testrun).to.be.ok;
            sinon.assert.calledOnce(testrun.start);
            sinon.assert.calledOnce(testrun.done);
            sinon.assert.calledWith(testrun.done.getCall(0), null);

            sinon.assert.calledOnce(testrun.request);
            sinon.assert.calledWith(testrun.request.getCall(0), null);

            sinon.assert.calledOnce(testrun.response);
            sinon.assert.calledWith(testrun.response.getCall(0), null);
        });

        it('should run the test script successfully', function () {
            sinon.assert.calledOnce(testrun.script);
            sinon.assert.calledWith(testrun.script.getCall(0), null);

            sinon.assert.calledOnce(testrun.test);
            sinon.assert.calledWith(testrun.test.getCall(0), null);
        });

        it('should return visualizer data in item callback', function () {
            var visualizerResults = testrun.item.getCall(0).args[3];

            expect(visualizerResults).to.deep.include({
                data: { name: 'Postman' },
                processedTemplate: '<h1>Postman</h1>'
            });
        });
    });

    describe('pm.execution', function () {
        describe('.location ', function () {
            describe('for requests without valid name property', function () {
                before(function (done) {
                    this.run({
                        collection: {
                            info: {
                                _postman_id: 'collection-id',
                                name: 'collection-name'
                            },
                            event: [
                                {
                                    listen: 'prerequest',
                                    script: {
                                        exec: [
                                            'console.log("path", pm.execution.location)',
                                            'console.log("current", pm.execution.location.current)'
                                        ],
                                        type: 'text/javascript'
                                    }
                                }
                            ],
                            item: [{
                                request: {
                                    auth: {
                                        type: 'noauth'
                                    },
                                    method: 'GET',
                                    header: [
                                        {
                                            key: 'fs',
                                            value: '',
                                            type: 'text'
                                        }
                                    ],
                                    url: {
                                        raw: 'postman-echo.com/get',
                                        host: [
                                            'postman-echo',
                                            'com'
                                        ],
                                        path: [
                                            'get'
                                        ]
                                    }
                                },
                                response: [],
                                id: 'request-id'
                            }]
                        }
                    }
                    , function (_err, results) {
                        testrun = results;
                        expect(testrun).to.be.ok;
                        done();
                    });
                });

                it('should complete the run', function () {
                    sinon.assert.calledOnce(testrun.start);
                    sinon.assert.calledOnce(testrun.done);
                    sinon.assert.calledWith(testrun.done.getCall(0), null);
                });

                it('should correct path property value', function () {
                    const collPreConsole = testrun.console.getCall(0).args.slice(2);

                    expect(collPreConsole).to.deep.include.ordered.members(['path', [
                        'collection-name',
                        ''
                    ]]);
                });

                it('should correct current property value', function () {
                    const collPreConsole = testrun.console.getCall(1).args.slice(2);

                    expect(collPreConsole).to.deep.include.ordered.members(['current', 'collection-name']);
                });
            });

            describe('for requests with valid name properties', function () {
                before(function (done) {
                    this.run({
                        collection: {
                            info: {
                                _postman_id: '230937f7-2c1a-4196-8a19-cf962ae5d15c',
                                name: 'collection-0',
                                schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
                                _exporter_id: '767722',
                                _collection_link: ''
                            },
                            item: [
                                {
                                    name: 'folder-1',
                                    id: 'folder-1-id',
                                    item: [
                                        {
                                            name: 'folder-2',
                                            id: 'folder-2-id',
                                            item: [
                                                {
                                                    name: 'request-2',
                                                    id: 'request-2-id',
                                                    event: [
                                                        {
                                                            listen: 'prerequest',
                                                            script: {
                                                                exec: [
                                                                    // eslint-disable-next-line max-len
                                                                    'console.log("request pre path", pm.execution.location)',
                                                                    // eslint-disable-next-line max-len
                                                                    'console.log("request pre current", pm.execution.location.current)'
                                                                ],
                                                                type: 'text/javascript'
                                                            }
                                                        },
                                                        {
                                                            listen: 'test',
                                                            script: {
                                                                exec: [
                                                                    // eslint-disable-next-line max-len
                                                                    'console.log("request test path", pm.execution.location)',
                                                                    // eslint-disable-next-line max-len
                                                                    'console.log("request test current", pm.execution.location.current)'
                                                                ],
                                                                type: 'text/javascript'
                                                            }
                                                        }
                                                    ],
                                                    request: {
                                                        method: 'GET',
                                                        header: [],
                                                        url: {
                                                            raw: '{{URL}}',
                                                            host: [
                                                                '{{URL}}'
                                                            ]
                                                        }
                                                    },
                                                    response: []
                                                }
                                            ],
                                            event: [
                                                {
                                                    listen: 'prerequest',
                                                    script: {
                                                        type: 'text/javascript',
                                                        exec: [
                                                            // eslint-disable-next-line max-len
                                                            'console.log("folder pre path", pm.execution.location)',
                                                            // eslint-disable-next-line max-len
                                                            'console.log("folder pre current", pm.execution.location.current)'
                                                        ]
                                                    }
                                                },
                                                {
                                                    listen: 'test',
                                                    script: {
                                                        type: 'text/javascript',
                                                        exec: [
                                                            // eslint-disable-next-line max-len
                                                            'console.log("folder test path", pm.execution.location)',
                                                            // eslint-disable-next-line max-len
                                                            'console.log("folder test current", pm.execution.location.current)'
                                                        ]
                                                    }
                                                }
                                            ]
                                        }
                                    ],
                                    event: [
                                        {
                                            listen: 'prerequest',
                                            script: {
                                                type: 'text/javascript',
                                                exec: [
                                                    'console.log("folder pre path", pm.execution.location)',
                                                    'console.log("folder pre current", pm.execution.location.current)'
                                                ]
                                            }
                                        },
                                        {
                                            listen: 'test',
                                            script: {
                                                type: 'text/javascript',
                                                exec: [
                                                    'console.log("folder test path", pm.execution.location)',
                                                    'console.log("folder test current", pm.execution.location.current)'
                                                ]
                                            }
                                        }
                                    ]
                                },
                                {
                                    name: 'request-0',
                                    id: 'request-0-id',
                                    event: [
                                        {
                                            listen: 'prerequest',
                                            script: {
                                                exec: [
                                                    'console.log("request pre path", pm.execution.location)',
                                                    'console.log("request pre current", pm.execution.location.current)'
                                                ],
                                                type: 'text/javascript'
                                            }
                                        },
                                        {
                                            listen: 'test',
                                            script: {
                                                exec: [
                                                    'console.log("request test path", pm.execution.location)',
                                                    'console.log("request test current", pm.execution.location.current)'
                                                ],
                                                type: 'text/javascript'
                                            }
                                        }
                                    ],
                                    request: {
                                        method: 'GET',
                                        header: [],
                                        url: {
                                            raw: '{{URL}}',
                                            host: [
                                                '{{URL}}'
                                            ]
                                        }
                                    },
                                    response: [
                                        {
                                            name: 'New Request',
                                            originalRequest: {
                                                method: 'GET',
                                                header: [],
                                                url: {
                                                    raw: 'localhost:3000',
                                                    host: [
                                                        'localhost'
                                                    ],
                                                    port: '3000'
                                                }
                                            },
                                            _postman_previewlanguage: null,
                                            header: null,
                                            cookie: [],
                                            body: null
                                        }
                                    ]
                                }
                            ],
                            event: [
                                {
                                    listen: 'prerequest',
                                    script: {
                                        type: 'text/javascript',
                                        exec: [
                                            'console.log("collection pre path", pm.execution.location)',
                                            'console.log("collection pre current", pm.execution.location.current)'
                                        ]
                                    }
                                },
                                {
                                    listen: 'test',
                                    script: {
                                        type: 'text/javascript',
                                        exec: [
                                            'console.log("collection test path", pm.execution.location)',
                                            'console.log("collection test current", pm.execution.location.current)'
                                        ]
                                    }
                                }
                            ]
                        }
                    }, function (_err, results) {
                        testrun = results;
                        expect(testrun).to.be.ok;
                        done();
                    });
                });

                it('should complete the run', function () {
                    sinon.assert.calledOnce(testrun.start);
                    sinon.assert.calledOnce(testrun.done);
                    sinon.assert.calledWith(testrun.done.getCall(0), null);
                });

                describe('when logged from collection pre request script', function () {
                    it('should log correct value for location', function () {
                        const collPreConsole = testrun.console.getCall(0).args.slice(2);

                        expect(collPreConsole[0]).to.eql('collection pre path');
                        expect(collPreConsole[1]).to.eql([
                            'collection-0',
                            'folder-1',
                            'folder-2',
                            'request-2'
                        ]);
                    });

                    it('should log correct value for current property', function () {
                        const collPreConsole = testrun.console.getCall(1).args.slice(2);

                        expect(collPreConsole[0]).to.eql('collection pre current');
                        expect(collPreConsole[1]).to.eql('collection-0');
                    });
                });


                describe('when logged from 1 level nested folder pre request script', function () {
                    it('should log correct location property value', function () {
                        const collPreConsole = testrun.console.getCall(2).args.slice(2);

                        expect(collPreConsole[0]).to.eql('folder pre path');
                        expect(collPreConsole[1]).to.eql([
                            'collection-0',
                            'folder-1',
                            'folder-2',
                            'request-2'
                        ]);
                    });

                    it('should log correct value for current property', function () {
                        const collPreConsole = testrun.console.getCall(3).args.slice(2);

                        expect(collPreConsole[0]).to.eql('folder pre current');
                        expect(collPreConsole[1]).to.eql('folder-1');
                    });
                });


                describe('when logged from 2 level nested folder pre request script', function () {
                    it('should log correct location property value', function () {
                        const collPreConsole = testrun.console.getCall(4).args.slice(2);

                        expect(collPreConsole[0]).to.eql('folder pre path');
                        expect(collPreConsole[1]).to.eql([
                            'collection-0',
                            'folder-1',
                            'folder-2',
                            'request-2'
                        ]);
                    });

                    it('should log correct value for current property', function () {
                        const collPreConsole = testrun.console.getCall(5).args.slice(2);

                        expect(collPreConsole[0]).to.eql('folder pre current');
                        expect(collPreConsole[1]).to.eql('folder-2');
                    });
                });

                describe('when logged from request in nested folder pre request script', function () {
                    it('should log correct location property value', function () {
                        const collPreConsole = testrun.console.getCall(6).args.slice(2);

                        expect(collPreConsole[0]).to.eql('request pre path');
                        expect(collPreConsole[1]).to.eql([
                            'collection-0',
                            'folder-1',
                            'folder-2',
                            'request-2'
                        ]);
                    });

                    it('should log correct value for current property', function () {
                        const collPreConsole = testrun.console.getCall(7).args.slice(2);

                        expect(collPreConsole[0]).to.eql('request pre current');
                        expect(collPreConsole[1]).to.eql('request-2');
                    });
                });


                describe('when logged from collection test script', function () {
                    it('should log correct location property value', function () {
                        const collPreConsole = testrun.console.getCall(8).args.slice(2);

                        expect(collPreConsole[0]).to.eql('collection test path');
                        expect(collPreConsole[1]).to.eql([
                            'collection-0',
                            'folder-1',
                            'folder-2',
                            'request-2'
                        ]);
                    });

                    it('should log correct value for current property', function () {
                        const collPreConsole = testrun.console.getCall(9).args.slice(2);

                        expect(collPreConsole[0]).to.eql('collection test current');
                        expect(collPreConsole[1]).to.eql('collection-0');
                    });
                });

                describe('when logged from 1 level nested folder test script', function () {
                    it('should log correct location property value', function () {
                        const collPreConsole = testrun.console.getCall(10).args.slice(2);

                        expect(collPreConsole[0]).to.eql('folder test path');
                        expect(collPreConsole[1]).to.eql([
                            'collection-0',
                            'folder-1',
                            'folder-2',
                            'request-2'
                        ]);
                    });

                    it('should log correct value for current property', function () {
                        const collPreConsole = testrun.console.getCall(11).args.slice(2);

                        expect(collPreConsole[0]).to.eql('folder test current');
                        expect(collPreConsole[1]).to.eql('folder-1');
                    });
                });

                describe('when logged from 2 level nested folder test script', function () {
                    it('should log correct location property value', function () {
                        const collPreConsole = testrun.console.getCall(12).args.slice(2);

                        expect(collPreConsole[0]).to.eql('folder test path');
                        expect(collPreConsole[1]).to.eql([
                            'collection-0',
                            'folder-1',
                            'folder-2',
                            'request-2'
                        ]);
                    });

                    it('should log correct value for current property', function () {
                        const collPreConsole = testrun.console.getCall(13).args.slice(2);

                        expect(collPreConsole[0]).to.eql('folder test current');
                        expect(collPreConsole[1]).to.eql('folder-2');
                    });
                });

                describe('when logged from nested request test script', function () {
                    it('should log correct location property value', function () {
                        const collPreConsole = testrun.console.getCall(14).args.slice(2);

                        expect(collPreConsole[0]).to.eql('request test path');
                        expect(collPreConsole[1]).to.eql([
                            'collection-0',
                            'folder-1',
                            'folder-2',
                            'request-2'
                        ]);
                    });

                    it('should log correct value for current property', function () {
                        const collPreConsole = testrun.console.getCall(15).args.slice(2);

                        expect(collPreConsole[0]).to.eql('request test current');
                        expect(collPreConsole[1]).to.eql('request-2');
                    });
                });

                describe('when logged from (non-nested) request pre request script', function () {
                    it('should log correct location property value', function () {
                        const collPreConsole = testrun.console.getCall(18).args.slice(2);

                        expect(collPreConsole[0]).to.eql('request pre path');
                        expect(collPreConsole[1]).to.eql([
                            'collection-0',
                            'request-0'
                        ]);
                    });

                    it('should log correct value for current property', function () {
                        const collPreConsole = testrun.console.getCall(19).args.slice(2);

                        expect(collPreConsole[0]).to.eql('request pre current');
                        expect(collPreConsole[1]).to.eql('request-0');
                    });
                });

                describe('when logged from (non-nested) request test script', function () {
                    it('should log correct location property value', function () {
                        const collPreConsole = testrun.console.getCall(22).args.slice(2);

                        expect(collPreConsole[0]).to.eql('request test path');
                        expect(collPreConsole[1]).to.eql([
                            'collection-0',
                            'request-0'
                        ]);
                    });

                    it('should log correct value for current property', function () {
                        const collPreConsole = testrun.console.getCall(23).args.slice(2);

                        expect(collPreConsole[0]).to.eql('request test current');
                        expect(collPreConsole[1]).to.eql('request-0');
                    });
                });
            });
        });
    });
});
