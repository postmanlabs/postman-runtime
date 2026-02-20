var expect = require('chai').expect;

describe('Events', function () {
    var testRun;

    describe('in request level', function () {
        before(function (done) {
            var runOptions = {
                collection: {
                    item: {
                        event: [
                            {
                                listen: 'prerequest',
                                script: { exec: 'console.log("request level prerequest script")' }
                            }, {
                                listen: 'test',
                                script: { exec: 'console.log("request level test script")' }
                            }
                        ],
                        request: 'https://postman-echo.com/get'
                    }
                }
            };


            // perform the collection run
            this.run(runOptions, function (err, results) {
                testRun = results;
                done(err);
            });
        });

        it('should have completed the run', function () {
            expect(testRun).to.be.ok;
            expect(testRun).to.nested.include({
                'done.callCount': 1
            });
            testRun.done.getCall(0).args[0] && console.error(testRun.done.getCall(0).args[0].stack);
            expect(testRun.done.getCall(0).args[0]).to.be.null;
            expect(testRun).to.nested.include({
                'start.callCount': 1
            });
        });

        it('should have executed the event once', function () {
            expect(testRun).to.nested.include({
                'prerequest.callCount': 1,
                'test.callCount': 1,
                'console.callCount': 2
            });
            expect(testRun).to.have.property('console').that.nested.include({
                'firstCall.args[2]': 'request level prerequest script',
                'secondCall.args[2]': 'request level test script'
            });
        });
    });

    describe('in item group level', function () {
        before(function (done) {
            var runOptions = {
                collection: {
                    item: [{
                        event: [
                            {
                                listen: 'prerequest',
                                script: { exec: 'console.log("folder level prerequest script")' }
                            },
                            {
                                listen: 'test',
                                script: { exec: 'console.log("folder level test script")' }
                            }
                        ],
                        item: {
                            request: 'https://postman-echo.com/get'
                        }
                    }]
                }
            };

            // perform the collection run
            this.run(runOptions, function (err, results) {
                testRun = results;
                done(err);
            });
        });

        it('should have completed the run', function () {
            expect(testRun).to.be.ok;
            expect(testRun).to.nested.include({
                'done.callCount': 1
            });
            testRun.done.getCall(0).args[0] && console.error(testRun.done.getCall(0).args[0].stack);
            expect(testRun.done.getCall(0).args[0]).to.be.null;
            expect(testRun).to.nested.include({
                'start.callCount': 1
            });
        });

        it('should have executed the event once', function () {
            expect(testRun).to.nested.include({
                'prerequest.callCount': 1,
                'test.callCount': 1,
                'console.callCount': 2
            });
            expect(testRun).to.have.property('console').that.nested.include({
                'firstCall.args[2]': 'folder level prerequest script',
                'secondCall.args[2]': 'folder level test script'
            });
        });
    });

    describe('in collection level', function () {
        before(function (done) {
            var runOptions = {
                collection: {
                    event: [
                        {
                            listen: 'prerequest',
                            script: { exec: 'console.log("collection level prerequest script")' }
                        },
                        {
                            listen: 'test',
                            script: { exec: 'console.log("collection level test script")' }
                        }
                    ],
                    item: {
                        request: 'https://postman-echo.com'
                    }
                }
            };

            // perform the collection run
            this.run(runOptions, function (err, results) {
                testRun = results;
                done(err);
            });
        });

        it('should have completed the run', function () {
            expect(testRun).to.be.ok;
            expect(testRun).to.nested.include({
                'done.callCount': 1
            });
            testRun.done.getCall(0).args[0] && console.error(testRun.done.getCall(0).args[0].stack);
            expect(testRun.done.getCall(0).args[0]).to.be.null;
            expect(testRun).to.nested.include({
                'start.callCount': 1
            });
        });

        it('should have executed the event once', function () {
            expect(testRun).to.nested.include({
                'prerequest.callCount': 1,
                'test.callCount': 1,
                'console.callCount': 2
            });
            expect(testRun).to.have.property('console').that.nested.include({
                'firstCall.args[2]': 'collection level prerequest script',
                'secondCall.args[2]': 'collection level test script'
            });
        });
    });

    describe('in collection and request level', function () {
        before(function (done) {
            var runOptions = {
                collection: {
                    event: [
                        {
                            listen: 'prerequest',
                            script: { exec: 'console.log("collection level prerequest script 1")' }
                        },
                        {
                            listen: 'prerequest',
                            script: { exec: 'console.log("collection level prerequest script 2")' }
                        },
                        {
                            listen: 'test',
                            script: { exec: 'console.log("collection level test script")' }
                        }
                    ],
                    item: {
                        event: [
                            {
                                listen: 'prerequest',
                                script: { exec: 'console.log("request level prerequest script")' }
                            },
                            {
                                listen: 'test',
                                script: { exec: 'console.log("request level test script")' }
                            }
                        ],
                        request: 'https://postman-echo.com/get'
                    }
                }
            };

            // perform the collection run
            this.run(runOptions, function (err, results) {
                testRun = results;
                done(err);
            });
        });

        it('should have completed the run', function () {
            expect(testRun).to.be.ok;
            expect(testRun).to.nested.include({
                'done.callCount': 1
            });
            testRun.done.getCall(0).args[0] && console.error(testRun.done.getCall(0).args[0].stack);
            expect(testRun.done.getCall(0).args[0]).to.be.null;
            expect(testRun).to.nested.include({
                'start.callCount': 1
            });
        });

        it('should have executed all the events, and called prerequest callback once', function () {
            expect(testRun).to.nested.include({
                'prerequest.callCount': 1,
                'test.callCount': 1,
                'console.callCount': 5
            });

            // test for order as well
            expect(testRun).to.have.property('console').that.nested.include({
                'firstCall.args[2]': 'collection level prerequest script 1',
                'secondCall.args[2]': 'collection level prerequest script 2',
                'thirdCall.args[2]': 'request level prerequest script'
            });
            expect(testRun.console.getCall(3).args[2]).to.equal('collection level test script');
            expect(testRun.console.getCall(4).args[2]).to.equal('request level test script');
        });
    });

    describe('in collection and item group level', function () {
        before(function (done) {
            var runOptions = {
                collection: {
                    event: [
                        {
                            listen: 'prerequest',
                            script: { exec: 'console.log("collection level prerequest script")' }
                        },
                        {
                            listen: 'test',
                            script: { exec: 'console.log("collection level test script")' }
                        }
                    ],
                    item: [{
                        event: [
                            {
                                listen: 'prerequest',
                                script: { exec: 'console.log("folder level prerequest script")' }
                            },
                            {
                                listen: 'test',
                                script: { exec: 'console.log("folder level test script")' }
                            }
                        ],
                        item: {
                            request: 'https://postman-echo.com/get'
                        }
                    }]
                }
            };

            // perform the collection run
            this.run(runOptions, function (err, results) {
                testRun = results;
                done(err);
            });
        });

        it('should have completed the run', function () {
            expect(testRun).to.be.ok;
            expect(testRun).to.nested.include({
                'done.callCount': 1
            });
            testRun.done.getCall(0).args[0] && console.error(testRun.done.getCall(0).args[0].stack);
            expect(testRun.done.getCall(0).args[0]).to.be.null;
            expect(testRun).to.nested.include({
                'start.callCount': 1
            });
        });

        it('should have executed all the events, and called prerequest callback once', function () {
            expect(testRun).to.nested.include({
                'prerequest.callCount': 1,
                'test.callCount': 1,
                'console.callCount': 4
            });

            // test for order as well
            expect(testRun).to.have.property('console').that.nested.include({
                'firstCall.args[2]': 'collection level prerequest script',
                'secondCall.args[2]': 'folder level prerequest script'
            });
            expect(testRun.console.getCall(2).args[2]).to.equal('collection level test script');
            expect(testRun.console.getCall(3).args[2]).to.equal('folder level test script');
        });
    });

    describe('disabled events', function () {
        before(function (done) {
            var runOptions = {
                collection: {
                    event: [
                        {
                            disabled: true,
                            listen: 'prerequest',
                            script: { exec: 'console.log("collection level prerequest script")' }
                        },
                        {
                            listen: 'test',
                            script: { exec: 'console.log("collection level test script")' }
                        }
                    ],
                    item: [{
                        event: [
                            {
                                listen: 'prerequest',
                                script: { exec: 'console.log("folder level prerequest script")' }
                            },
                            {
                                disabled: true,
                                listen: 'test',
                                script: { exec: 'console.log("folder level test script")' }
                            }
                        ],
                        item: {
                            event: [
                                {
                                    disabled: true,
                                    listen: 'prerequest',
                                    script: { exec: 'console.log("request level prerequest script")' }
                                },
                                {
                                    listen: 'test',
                                    script: { exec: 'console.log("request level test script")' }
                                }
                            ],
                            request: 'https://postman-echo.com/get'
                        }
                    }]
                }
            };

            // perform the collection run
            this.run(runOptions, function (err, results) {
                testRun = results;
                done(err);
            });
        });

        it('should have completed the run', function () {
            expect(testRun).to.be.ok;
            expect(testRun).to.nested.include({
                'done.callCount': 1
            });
            testRun.done.getCall(0).args[0] && console.error(testRun.done.getCall(0).args[0].stack);
            expect(testRun.done.getCall(0).args[0]).to.be.null;
            expect(testRun).to.nested.include({
                'start.callCount': 1
            });
        });

        it('should have executed only the enabled events', function () {
            expect(testRun).to.nested.include({
                'prerequest.callCount': 1,
                'test.callCount': 1,
                'console.callCount': 3
            });

            expect(testRun).to.have.property('console').that.nested.include({
                'firstCall.args[2]': 'folder level prerequest script',
                'secondCall.args[2]': 'collection level test script',
                'thirdCall.args[2]': 'request level test script'
            });
        });
    });

    describe('events with empty scripts', function () {
        before(function (done) {
            var runOptions = {
                collection: {
                    item: {
                        event: [
                            {
                                listen: 'prerequest',
                                script: {}
                            }, {
                                listen: 'test',
                                script: { exec: '' }
                            },
                            {
                                listen: 'test'
                            }
                        ],
                        request: 'https://postman-echo.com/get'
                    }
                }
            };


            // perform the collection run
            this.run(runOptions, function (err, results) {
                testRun = results;
                done(err);
            });
        });

        it('should have completed the run', function () {
            expect(testRun).to.be.ok;
            expect(testRun).to.nested.include({
                'done.callCount': 1
            });
            testRun.done.getCall(0).args[0] && console.error(testRun.done.getCall(0).args[0].stack);
            expect(testRun.done.getCall(0).args[0]).to.be.null;
            expect(testRun).to.nested.include({
                'start.callCount': 1
            });
        });

        it('should have not executed the event', function () {
            expect(testRun).to.nested.include({
                'beforeScript.callCount': 0
            });
        });
    });

    describe('secret resolution with events', function () {
        describe('safe secret accessible in collection-level prerequest', function () {
            before(function (done) {
                var runOptions = {
                    collection: {
                        event: [{
                            listen: 'prerequest',
                            script: {
                                exec: [
                                    'var v = pm.environment.get("apiKey");',
                                    'pm.environment.set("scriptSawSecret", v || "undefined");'
                                ]
                            }
                        }],
                        item: {
                            request: global.servers.http + '?apiKey={{apiKey}}'
                        }
                    },
                    environment: {
                        values: [{
                            key: 'apiKey',
                            value: '',
                            secret: true,
                            source: { provider: 'postman', postman: { type: 'local', secretId: 'safe-secret' } }
                        }]
                    },
                    secretResolver: function ({ secrets }, callback) {
                        callback(null, secrets.map(function () {
                            return { resolvedValue: 'safe-secret-value', safe: true };
                        }));
                    }
                };

                this.run(runOptions, function (err, results) {
                    testRun = results;
                    done(err);
                });
            });

            it('should have completed the run', function () {
                expect(testRun).to.be.ok;
                expect(testRun.done.getCall(0).args[0]).to.be.null;
            });

            it('should expose safe secret to collection-level prerequest script', function () {
                var scriptResult = testRun.script.getCall(0).args[2];

                expect(testRun.script.called).to.be.true;
                expect(scriptResult.environment.get('scriptSawSecret')).to.equal('safe-secret-value');
            });

            it('should use resolved value in request URL', function () {
                var request = testRun.request.getCall(0).args[3];

                expect(request.url.toString()).to.include('apiKey=safe-secret-value');
            });
        });

        describe('safe secret accessible in collection-level test script', function () {
            before(function (done) {
                var runOptions = {
                    collection: {
                        event: [
                            {
                                listen: 'prerequest',
                                script: { exec: 'console.log("prerequest");' }
                            },
                            {
                                listen: 'test',
                                script: {
                                    exec: [
                                        'var v = pm.environment.get("apiKey");',
                                        'pm.environment.set("testSawSecret", v || "undefined");'
                                    ]
                                }
                            }
                        ],
                        item: {
                            request: global.servers.http + '?apiKey={{apiKey}}'
                        }
                    },
                    environment: {
                        values: [{
                            key: 'apiKey',
                            value: '',
                            secret: true,
                            source: { provider: 'postman', postman: { type: 'local', secretId: 'safe-secret' } }
                        }]
                    },
                    secretResolver: function ({ secrets }, callback) {
                        callback(null, secrets.map(function () {
                            return { resolvedValue: 'safe-secret-value', safe: true };
                        }));
                    }
                };

                this.run(runOptions, function (err, results) {
                    testRun = results;
                    done(err);
                });
            });

            it('should have completed the run', function () {
                expect(testRun).to.be.ok;
                expect(testRun.done.getCall(0).args[0]).to.be.null;
            });

            it('should expose safe secret to collection-level test script', function () {
                var testResult = testRun.script.getCall(1).args[2];

                expect(testRun.script.callCount).to.equal(2);
                expect(testResult.environment.get('testSawSecret')).to.equal('safe-secret-value');
            });
        });

        describe('safe secret accessible in collection and request-level test scripts', function () {
            before(function (done) {
                var runOptions = {
                    collection: {
                        event: [
                            {
                                listen: 'prerequest',
                                script: { exec: 'console.log("coll prerequest");' }
                            },
                            {
                                listen: 'test',
                                script: {
                                    exec: [
                                        'var v = pm.environment.get("apiKey");',
                                        'pm.environment.set("collTestSawSecret", v || "undefined");'
                                    ]
                                }
                            }
                        ],
                        item: {
                            event: [{
                                listen: 'test',
                                script: {
                                    exec: [
                                        'var v = pm.environment.get("apiKey");',
                                        'pm.environment.set("reqTestSawSecret", v || "undefined");'
                                    ]
                                }
                            }],
                            request: global.servers.http + '?apiKey={{apiKey}}'
                        }
                    },
                    environment: {
                        values: [{
                            key: 'apiKey',
                            value: '',
                            secret: true,
                            source: { provider: 'postman', postman: { type: 'local', secretId: 'safe-secret' } }
                        }]
                    },
                    secretResolver: function ({ secrets }, callback) {
                        callback(null, secrets.map(function () {
                            return { resolvedValue: 'safe-secret-value', safe: true };
                        }));
                    }
                };

                this.run(runOptions, function (err, results) {
                    testRun = results;
                    done(err);
                });
            });

            it('should have completed the run', function () {
                expect(testRun).to.be.ok;
                expect(testRun.done.getCall(0).args[0]).to.be.null;
            });

            it('should expose safe secret to collection-level test script', function () {
                var collTestResult = testRun.script.getCall(1).args[2];

                expect(collTestResult.environment.get('collTestSawSecret')).to.equal('safe-secret-value');
            });

            it('should expose safe secret to request-level test script', function () {
                var reqTestResult = testRun.script.getCall(2).args[2];

                expect(reqTestResult.environment.get('reqTestSawSecret')).to.equal('safe-secret-value');
            });
        });

        describe('unsafe secret masked in collection-level prerequest and test', function () {
            before(function (done) {
                var runOptions = {
                    collection: {
                        event: [
                            {
                                listen: 'prerequest',
                                script: {
                                    exec: [
                                        'var v = pm.environment.get("apiKey");',
                                        'pm.environment.set("preReqSawSecret", v === undefined ? "masked" : "leaked");'
                                    ]
                                }
                            },
                            {
                                listen: 'test',
                                script: {
                                    exec: [
                                        'var v = pm.environment.get("apiKey");',
                                        'pm.environment.set("testSawSecret", v === undefined ? "masked" : "leaked");'
                                    ]
                                }
                            }
                        ],
                        item: {
                            request: global.servers.http + '?apiKey={{apiKey}}'
                        }
                    },
                    environment: {
                        values: [{
                            key: 'apiKey',
                            value: '',
                            secret: true,
                            source: { provider: 'postman', postman: { type: 'local', secretId: 'unsafe-secret' } }
                        }]
                    },
                    secretResolver: function ({ secrets }, callback) {
                        callback(null, secrets.map(function () {
                            return { resolvedValue: 'unsafe-secret-value', safe: false };
                        }));
                    }
                };

                this.run(runOptions, function (err, results) {
                    testRun = results;
                    done(err);
                });
            });

            it('should have completed the run', function () {
                expect(testRun).to.be.ok;
                expect(testRun.done.getCall(0).args[0]).to.be.null;
            });

            it('should mask unsafe secret from collection-level prerequest script', function () {
                var prereqResult = testRun.script.getCall(0).args[2];

                expect(prereqResult.environment.get('preReqSawSecret')).to.equal('masked');
            });

            it('should mask unsafe secret from collection-level test script', function () {
                var testResult = testRun.script.getCall(1).args[2];

                expect(testResult.environment.get('testSawSecret')).to.equal('masked');
            });

            it('should still use resolved value for request URL substitution', function () {
                var request = testRun.request.getCall(0).args[3];

                expect(request.url.toString()).to.include('apiKey=unsafe-secret-value');
            });
        });

        describe('unsafe secret masked in request-level event (inherited from collection)', function () {
            before(function (done) {
                var runOptions = {
                    collection: {
                        event: [{
                            listen: 'prerequest',
                            script: {
                                exec: [
                                    'var v = pm.environment.get("apiKey");',
                                    'pm.environment.set("collPreReqSawSecret", v === undefined ? "masked" : "leaked");'
                                ]
                            }
                        }],
                        item: {
                            event: [{
                                listen: 'prerequest',
                                script: {
                                    exec: [
                                        'var v = pm.environment.get("apiKey");',
                                        'var m = v === undefined ? "masked" : "leaked";',
                                        'pm.environment.set("reqPreReqSawSecret", m);'
                                    ]
                                }
                            }],
                            request: global.servers.http + '?apiKey={{apiKey}}'
                        }
                    },
                    environment: {
                        values: [{
                            key: 'apiKey',
                            value: '',
                            secret: true,
                            source: { provider: 'postman', postman: { type: 'local', secretId: 'unsafe-secret' } }
                        }]
                    },
                    secretResolver: function ({ secrets }, callback) {
                        callback(null, secrets.map(function () {
                            return { resolvedValue: 'unsafe-secret-value', safe: false };
                        }));
                    }
                };

                this.run(runOptions, function (err, results) {
                    testRun = results;
                    done(err);
                });
            });

            it('should have completed the run', function () {
                expect(testRun).to.be.ok;
                expect(testRun.done.getCall(0).args[0]).to.be.null;
            });

            it('should mask unsafe secret in collection-level prerequest', function () {
                var collResult = testRun.script.getCall(0).args[2];

                expect(collResult.environment.get('collPreReqSawSecret')).to.equal('masked');
            });

            it('should mask unsafe secret in request-level prerequest', function () {
                var reqResult = testRun.script.getCall(1).args[2];

                expect(reqResult.environment.get('reqPreReqSawSecret')).to.equal('masked');
            });
        });
    });
});
