var expect = require('chai').expect,
    _ = require('lodash');


describe('pm.execution.skipRequest: ', function () {
    describe('when single request is run', function () {
        var testrun,
            cookieUrl = 'https://postman-echo.com/cookies';

        before(function (done) {
            this.run({
                collection: {
                    item: {
                        event: [{
                            listen: 'prerequest',
                            script: {
                                exec: `
                                pm.execution.skipRequest();
                                pm.response();
                                `
                            }
                        }, {
                            listen: 'test',
                            script: {
                                exec: `
                                console.log('Test');
                                `
                            }
                        }],
                        request: {
                            url: cookieUrl,
                            header: [{ key: 'Cookie', value: 'foo=bar;' }]
                        }
                    }
                }
            }, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        it('should not send the request if invoked skipRequest in pre-request script', function () {
            expect(testrun).to.be.ok;
            expect(testrun.done.getCall(0).args[0]).to.be.null;
            expect(testrun).to.nested.include({
                'done.calledOnce': true,
                'start.calledOnce': true,
                'io.calledOnce': false,
                'request.calledOnce': false
            });
        });

        it('should not send run test script if invoked skipRequest in pre-request script', function () {
            expect(testrun).to.be.ok;
            expect(testrun).to.nested.include({
                'test.calledOnce': false,
                'prerequest.calledOnce': true
            });
        });

        it('should not invoke error callback invoked after skipRequest', function () {
            expect(testrun).to.be.ok;
            expect(testrun).to.nested.include({
                'exception.calledOnce': false
            });
        });
    });


    describe('when running multiple requests in a collection run', function () {
        var testRun,
            runOptions = {
                data: [{
                    'key-4': 'data-value-4'
                }],
                globals: {
                    values: [
                        { key: 'key-1', value: 'global-value-1', name: 'key-1', enabled: true },
                        { key: 'key-2', value: 'global-value-2', name: 'key-2', enabled: true }
                    ]
                },
                environment: {
                    values: [
                        { key: 'key-3', value: 'env-value-3', name: 'key-3', enabled: true },
                        { key: 'key-4', value: 'env-value-4', name: 'key-4', enabled: true }
                    ]
                }
            };

        before(function (done) {
            var clonedRunOptions = _.merge({}, runOptions, {
                collection: {
                    variable: [
                        { key: 'key-2', value: 'coll-value-2', name: 'key-2', enabled: true },
                        { key: 'key-3', value: 'coll-value-3', name: 'key-3', enabled: true }
                    ],
                    event: [
                        {
                            listen: 'prerequest',
                            script: {
                                exec: `
                                console.log('collection pre', pm.variables.toObject())
                            ` }
                        },
                        {
                            listen: 'test',
                            script: {
                                exec: `
                            ` }
                        }
                    ],
                    item: [{
                        name: 'Sample Request 1',
                        event: [
                            {
                                listen: 'prerequest',
                                script: {
                                    exec: `
                                    pm.variables.set('key-1', 'modified-1');
                                    pm.execution.skipRequest();
                                    // postman.setNextRequest('Sample Request 2');
                                    pm.sendRequest('https://postman-echo.com/GET');
                                    pm.variables.set('key-2', 'modified-2');
                                    console.log('item 1 pre', pm.variables.toObject())
                                ` }
                            },
                            {
                                listen: 'test',
                                script: {
                                    exec: `
                                    pm.variables.set('key-3', 'modified-3');
                                    console.log('item 1 test', pm.variables.toObject())
                                ` }
                            }
                        ],
                        request: {
                            url: 'https://postman-echo.com/get?param={{key-1}}:{{key-2}}:{{key-3}}:{{key-4}}',
                            auth: {
                                type: 'bearer',
                                bearer: {
                                    token: '{{key-1}}:{{key-2}}:{{key-3}}:{{key-4}}'
                                }
                            }
                        }
                    }, {
                        name: 'Sample Request 2',
                        event: [
                            {
                                listen: 'prerequest',
                                script: {
                                    exec: `
                                    pm.variables.set('key-4', 'modified-4');
                                    console.log('item 2 pre', pm.variables.toObject())
                                ` }
                            },
                            {
                                listen: 'test',
                                script: {
                                    exec: `
                                    console.log('item 2 test', pm.variables.toObject())
                                    pm.variables.unset('key-1')
                                    pm.variables.unset('key-2')
                                    pm.execution.skipRequest();

                                    pm.variables.unset('key-3')
                                    pm.variables.unset('key-4')
                                    console.log('item 2 test after unsetting', pm.variables.toObject())
                                ` }
                            }
                        ],
                        request: {
                            url: 'https://postman-echo.com/get?param={{key-1}}:{{key-2}}:{{key-3}}:{{key-4}}',
                            auth: {
                                type: 'bearer',
                                bearer: {
                                    token: '{{key-1}}:{{key-2}}:{{key-3}}:{{key-4}}'
                                }
                            }
                        }
                    }]
                }
            });

            this.run(clonedRunOptions, function (err, results) {
                testRun = results;

                done(err);
            });
        });

        it('should not reflect any variable change line after pm.execution.skipRequest', function () {
            expect(testRun.console.callCount).to.equal(4);

            var collPreConsole = testRun.console.getCall(0).args.slice(2),
                collPreConsole2 = testRun.console.getCall(1).args.slice(2),
                item2PreConsole = testRun.console.getCall(2).args.slice(2),
                item2TestConsole = testRun.console.getCall(3).args.slice(2);

            expect(testRun).to.be.ok;
            expect(testRun).to.nested.include({
                'done.calledOnce': true,
                'start.calledOnce': true,
                'io.calledOnce': true,
                'request.calledOnce': true
            });

            expect(collPreConsole).to.deep.include.ordered.members([
                'collection pre',
                {
                    'key-1': 'global-value-1',
                    'key-2': 'coll-value-2',
                    'key-3': 'env-value-3',
                    'key-4': 'data-value-4'
                }
            ]);

            expect(collPreConsole2).to.deep.include.ordered.members([
                'collection pre',
                {
                    'key-1': 'modified-1',
                    'key-2': 'coll-value-2',
                    'key-3': 'env-value-3',
                    'key-4': 'data-value-4'
                }
            ]);

            expect(item2PreConsole).to.deep.include.ordered.members([
                'item 2 pre',
                {
                    'key-1': 'modified-1',
                    'key-2': 'coll-value-2',
                    'key-3': 'env-value-3',
                    'key-4': 'modified-4'
                }
            ]);

            expect(item2TestConsole).to.deep.include.ordered.members([
                'item 2 test',
                {
                    'key-1': 'modified-1',
                    'key-2': 'coll-value-2',
                    'key-3': 'env-value-3',
                    'key-4': 'modified-4'
                }
            ]);
        });

        it('should not resolve variables values mutated after skipRequest', function () {
            var url1 = testRun.request.getCall(0).args[3].url.toString(),
                expectedToken = 'modified-1:coll-value-2:env-value-3:modified-4';

            expect(url1).to.equal('https://postman-echo.com/get?param=' + expectedToken);
        });

        it('should not have setNextRequest property set if called after skipRequest', function () {
            const prerequest = testRun.script.getCall(1).args[2];

            expect(prerequest.return).to.be.ok;
            expect(prerequest).to.not.have.nested.property('return.nextRequest', 'Sample Request 2');
        });

        it('should not invoke sendRequest if called after skipRequest', function () {
            expect(testRun.request.callCount).to.equal(1);
        });
    });

    describe('when invoked from collection script', function () {
        var testrun;

        before(function (done) {
            this.run({
                collection: {
                    event: [{
                        listen: 'prerequest',
                        script: {
                            exec: `
                            pm.execution.skipRequest();
                            `
                        }
                    }, {
                        listen: 'test',
                        script: {
                            exec: `
                            console.log('Test');
                            `
                        }
                    }],
                    item: {
                        event: [{
                            listen: 'prerequest',
                            script: {
                                exec: `
                                console.log('### 1');
                                `
                            }
                        }, {
                            listen: 'test',
                            script: {
                                exec: `
                                console.log('Test');
                                `
                            }
                        }],
                        request: 'https://postman-echo.com/get'
                    }
                }
            }, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        it('should not send the request if invoked skipRequest in collection script', function () {
            expect(testrun).to.be.ok;
            expect(testrun).to.nested.include({
                'done.calledOnce': true,
                'start.calledOnce': true,
                'io.calledOnce': false,
                'request.calledOnce': false
            });
        });

        it('should not send run test script if invoked skipRequest in collection script', function () {
            expect(testrun).to.be.ok;
            expect(testrun).to.nested.include({
                'test.calledOnce': false,
                'prerequest.calledOnce': true
            });
        });

        it('should not invoke error callback invoked after skipRequest', function () {
            expect(testrun).to.be.ok;
            expect(testrun).to.nested.include({
                'exception.calledOnce': false
            });
        });

        it('should not have console events from request\'s prerequest script', function () {
            expect(testrun.console.callCount).to.equal(0);
        });
    });
});
