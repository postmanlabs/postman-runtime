var _ = require('lodash'),
    expect = require('chai').expect;

describe('pm.variables', function () {
    var testRun,
        runOptions = {
            data: [{
                'key-4': 'data-value-4'
            }],
            globals: {
                values: [
                    {key: 'key-1', value: 'global-value-1', name: 'key-1', enabled: true},
                    {key: 'key-2', value: 'global-value-2', name: 'key-2', enabled: true}
                ]
            },
            environment: {
                values: [
                    {key: 'key-3', value: 'env-value-3', name: 'key-3', enabled: true},
                    {key: 'key-4', value: 'env-value-4', name: 'key-4', enabled: true}
                ]
            },
            collection: {
                variable: [
                    {key: 'key-2', value: 'coll-value-2', name: 'key-2', enabled: true},
                    {key: 'key-3', value: 'coll-value-3', name: 'key-3', enabled: true}
                ],
                event: [
                    {
                        listen: 'prerequest',
                        script: {
                            exec: 'console.log(pm.variables.toObject())'
                        }
                    },
                    {
                        listen: 'test',
                        script: {
                            exec: 'console.log(pm.variables.toObject())'
                        }
                    }
                ],
                item: {
                    name: 'Sample Request 1',
                    event: [
                        {
                            listen: 'prerequest',
                            script: {
                                exec: 'console.log(pm.variables.toObject())'
                            }
                        },
                        {
                            listen: 'test',
                            script: {
                                exec: 'console.log(pm.variables.toObject())'
                            }
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
                }
            }
        };

    describe('precedence', function () {
        before(function (done) {
            this.run(runOptions, function (err, results) {
                testRun = results;

                done(err);
            });
        });

        it('should be honoured in scripts', function () {
            var consoleLogs = testRun.console.getCall(0).args.slice(2)
                .concat(testRun.console.getCall(1).args.slice(2))
                .concat(testRun.console.getCall(2).args.slice(2))
                .concat(testRun.console.getCall(3).args.slice(2));

            consoleLogs.forEach(function (consoleLog) {
                expect(consoleLog).to.eql({
                    'key-1': 'global-value-1',
                    'key-2': 'coll-value-2',
                    'key-3': 'env-value-3',
                    'key-4': 'data-value-4'
                });
            });
        });

        it('should be honoured in request URL', function () {
            var url = testRun.request.getCall(0).args[3].url.toString(),
                expectedParam = 'global-value-1:coll-value-2:env-value-3:data-value-4';

            expect(url).to.equal('https://postman-echo.com/get?param=' + expectedParam);
        });

        it('should be honoured in auth', function () {
            var response = testRun.response.getCall(0).args[2],
                expectedToken = 'global-value-1:coll-value-2:env-value-3:data-value-4';

            expect(response.json()).to.deep.nested.include({
                'headers.authorization': 'Bearer ' + expectedToken
            });
        });
    });

    describe('getters and setters', function () {
        before(function (done) {
            var clonedRunOptions = _.merge({}, runOptions, {
                collection: {
                    event: [
                        {
                            listen: 'prerequest',
                            script: {
                                exec: `
                                pm.variables.set('key-1', 'modified-1');
                                pm.variables.set('key-2', 'modified-1');
                                console.log('collection pre', pm.variables.toObject())
                            `}
                        },
                        {
                            listen: 'test',
                            script: {
                                exec: `
                                pm.variables.set('key-3', 'modified-3');
                                pm.variables.set('key-4', 'modified-3');
                                console.log('collection test', pm.variables.toObject())
                            `}
                        }
                    ],
                    item: [{
                        name: 'Sample Request 1',
                        event: [
                            {
                                listen: 'prerequest',
                                script: {
                                    exec: `
                                    pm.variables.set('key-2', 'modified-2');
                                    pm.variables.set('key-3', 'modified-2');
                                    console.log('item 1 pre', pm.variables.toObject())
                                `}
                            },
                            {
                                listen: 'test',
                                script: {
                                    exec: `
                                    pm.variables.set('key-4', 'modified-4');
                                    console.log('item 1 test', pm.variables.toObject())
                                `}
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
                                    console.log('item 2 pre', pm.variables.toObject())
                                `}
                            },
                            {
                                listen: 'test',
                                script: {
                                    exec: `
                                    console.log('item 2 test', pm.variables.toObject())
                                    pm.variables.unset('key-1')
                                    pm.variables.unset('key-2')
                                    pm.variables.unset('key-3')
                                    pm.variables.unset('key-4')
                                    console.log('item 2 test after unsetting', pm.variables.toObject())
                                `}
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

        it('should persist any changes accross scripts', function () {
            var collPreConsole = testRun.console.getCall(0).args.slice(2),
                itemPreConsole = testRun.console.getCall(1).args.slice(2),
                collTestConsole = testRun.console.getCall(2).args.slice(2),
                itemTestConsole = testRun.console.getCall(3).args.slice(2),
                item2PreConsole = testRun.console.getCall(5).args.slice(2),
                item2TestConsole = testRun.console.getCall(7).args.slice(2);

            expect(collPreConsole).to.deep.include.ordered.members([
                'collection pre',
                {
                    'key-1': 'modified-1',
                    'key-2': 'modified-1',
                    'key-3': 'env-value-3',
                    'key-4': 'data-value-4'
                }
            ]);

            expect(itemPreConsole).to.deep.include.ordered.members([
                'item 1 pre',
                {
                    'key-1': 'modified-1',
                    'key-2': 'modified-2',
                    'key-3': 'modified-2',
                    'key-4': 'data-value-4'
                }
            ]);

            expect(collTestConsole).to.deep.include.ordered.members([
                'collection test',
                {
                    'key-1': 'modified-1',
                    'key-2': 'modified-2',
                    'key-3': 'modified-3',
                    'key-4': 'modified-3'
                }
            ]);

            expect(itemTestConsole).to.deep.include.ordered.members([
                'item 1 test',
                {
                    'key-1': 'modified-1',
                    'key-2': 'modified-2',
                    'key-3': 'modified-3',
                    'key-4': 'modified-4'
                }
            ]);

            expect(item2PreConsole).to.deep.include.ordered.members([
                'item 2 pre',
                {
                    'key-1': 'modified-1',
                    'key-2': 'modified-1',
                    'key-3': 'modified-3',
                    'key-4': 'modified-4'
                }
            ]);

            expect(item2TestConsole).to.deep.include.ordered.members([
                'item 2 test',
                {
                    'key-1': 'modified-1',
                    'key-2': 'modified-1',
                    'key-3': 'modified-3',
                    'key-4': 'modified-3'
                }
            ]);
        });

        it('should must not update global, environment or collection variables', function () {
            // collect the 2 prerequest events and 2 test events in one array. Same assertions will be applied
            var events = testRun.test.getCall(0).args[2].concat(testRun.prerequest.getCall(0).args[2]);

            expect(events).to.have.lengthOf(4);
            events.forEach(function(event) {
                expect(event).to.deep.nested.include({
                    'result.data': {
                        'key-4': 'data-value-4'
                    }
                });
                expect(event.result.environment.toObject()).to.eql({
                    'key-3': 'env-value-3',
                    'key-4': 'env-value-4'
                });
                expect(event.result.collectionVariables.toObject()).to.eql({
                    'key-2': 'coll-value-2',
                    'key-3': 'coll-value-3'
                });
                expect(event.result.globals.toObject()).to.eql({
                    'key-1': 'global-value-1',
                    'key-2': 'global-value-2'
                });
            });
        });

        it('should be resolved in request URL', function() {
            var url1 = testRun.request.getCall(0).args[3].url.toString(),
                url2 = testRun.request.getCall(1).args[3].url.toString(),
                expectedToken1 = 'modified-1:modified-2:modified-2:data-value-4',
                expectedToken2 = 'modified-1:modified-1:modified-3:modified-4';

            expect(url1).to.equal('https://postman-echo.com/get?param=' + expectedToken1);
            expect(url2).to.equal('https://postman-echo.com/get?param=' + expectedToken2);
        });

        it('should be resolved in request auth', function() {
            var response1 = testRun.response.getCall(0).args[2],
                response2 = testRun.response.getCall(1).args[2],
                expectedToken1 = 'modified-1:modified-2:modified-2:data-value-4',
                expectedToken2 = 'modified-1:modified-1:modified-3:modified-4';

            expect(response1.json()).to.deep.nested.include({
                'headers.authorization': 'Bearer ' + expectedToken1
            });
            expect(response2.json()).to.deep.nested.include({
                'headers.authorization': 'Bearer ' + expectedToken2
            });
        });

        it('should be able to unset variables', function () {
            var item2TestConsoleAfter = testRun.console.getCall(8).args.slice(2);

            expect(item2TestConsoleAfter).to.deep.include.ordered.members([
                'item 2 test after unsetting',
                {
                    'key-1': 'global-value-1',
                    'key-2': 'coll-value-2',
                    'key-3': 'env-value-3',
                    'key-4': 'data-value-4'
                }
            ]);
        });
    });
});
