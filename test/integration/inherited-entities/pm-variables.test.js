describe('pm.variables', function () {
    var testRun;

    before(function (done) {
        var runOptions = {
            data: [{
                'key-4': 'data-value-4'
            }],
            globals: {
                values: [
                    {key: 'key-1', value: 'global-value-1', name: 'key-1', enabled: true},
                    {key: 'key-2', value: 'global-value-2', name: 'key-2', enabled: true},
                    {key: 'key-3', value: 'global-value-3', name: 'key-3', enabled: true},
                    {key: 'key-4', value: 'global-value-4', name: 'key-4', enabled: true}
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
                    {key: 'key-3', value: 'coll-value-3', name: 'key-3', enabled: true},
                    {key: 'key-4', value: 'coll-value-4', name: 'key-4', enabled: true}
                ],
                item: {
                    event: [
                        {
                            listen: 'prerequest',
                            script: {
                                exec: `
                                console.log('collection pre before', pm.variables.toObject())
                                pm.variables.set('key-1', 'modified-1');
                                pm.variables.set('key-2', 'modified-1');
                                pm.variables.set('key-3', 'modified-1');
                                pm.variables.set('key-4', 'modified-1');
                                console.log('collection pre after', pm.variables.toObject())
                            `}
                        },
                        {
                            listen: 'test',
                            script: {
                                exec: `
                                pm.variables.set('key-3', 'modified-3');
                                pm.variables.set('key-4', 'modified-3');
                                console.log('collection test after', pm.variables.toObject())
                            `}
                        }
                    ],
                    item: [{
                        name: 'Test pm.variables persistence across scripts',
                        event: [
                            {
                                listen: 'prerequest',
                                script: {
                                    exec: `
                                    pm.variables.set('key-2', 'modified-2');
                                    pm.variables.set('key-3', 'modified-2');
                                    pm.variables.set('key-4', 'modified-2');
                                    console.log('item 1 pre after', pm.variables.toObject())
                                `}
                            },
                            {
                                listen: 'test',
                                script: {
                                    exec: `
                                    pm.variables.set('key-4', 'modified-4');
                                    console.log('item 1 test after', pm.variables.toObject())
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
                        name: 'Test pm.variables persistence across requests',
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
                                `}
                            }
                        ],
                        request: 'https://postman-echo.com/get'
                    }]
                }
            }
        };

        // perform the collection run
        this.run(runOptions, function (err, results) {
            testRun = results;

            done(err);
        });
    });

    it('must have completed the run', function () {
        expect(testRun).be.ok();
        expect(testRun.done.callCount).to.be(1);
        testRun.done.getCall(0).args[0] && console.error(testRun.done.getCall(0).args[0].stack);
        expect(testRun.done.getCall(0).args[0]).to.be(null);
        expect(testRun.start.callCount).to.be(1);
    });

    it('must have executed the events correctly', function () {
        expect(testRun.prerequest.callCount).to.be(2);
        expect(testRun.test.callCount).to.be(2);
        expect(testRun.console.callCount).to.be(10);
    });

    describe('.set', function () {
        it('must persist any changes accross scripts', function () {
            var collPreConsoleAfter = testRun.console.getCall(1).args.slice(2),
                itemPreConsole = testRun.console.getCall(2).args.slice(2),
                collTestConsole = testRun.console.getCall(3).args.slice(2),
                itemTestConsole = testRun.console.getCall(4).args.slice(2);

            expect(collPreConsoleAfter[0]).to.be('collection pre after');
            expect(collPreConsoleAfter[1]).to.eql({
                'key-1': 'modified-1',
                'key-2': 'modified-1',
                'key-3': 'modified-1',
                'key-4': 'modified-1'
            });

            expect(itemPreConsole[0]).to.be('item 1 pre after');
            expect(itemPreConsole[1]).to.eql({
                'key-1': 'modified-1',
                'key-2': 'modified-2',
                'key-3': 'modified-2',
                'key-4': 'modified-2'
            });

            expect(collTestConsole[0]).to.be('collection test after');
            expect(collTestConsole[1]).to.eql({
                'key-1': 'modified-1',
                'key-2': 'modified-2',
                'key-3': 'modified-3',
                'key-4': 'modified-3'
            });

            expect(itemTestConsole[0]).to.be('item 1 test after');
            expect(itemTestConsole[1]).to.eql({
                'key-1': 'modified-1',
                'key-2': 'modified-2',
                'key-3': 'modified-3',
                'key-4': 'modified-4'
            });
        });

        it('must not persist any changes accross requests', function () {
            var collPreConsoleBefore = testRun.console.getCall(5).args.slice(2);

            expect(collPreConsoleBefore[0]).to.be('collection pre before');
            expect(collPreConsoleBefore[1]).to.eql({
                'key-1': 'global-value-1',
                'key-2': 'coll-value-2',
                'key-3': 'env-value-3',
                'key-4': 'data-value-4'
            });
        });

        it('must must not update global, environment or collection variables', function () {
            // collect the 2 prerequest events and 2 test events in one array. Same assertions will be applied
            var events = testRun.test.getCall(0).args[2].concat(testRun.prerequest.getCall(0).args[2]);

            expect(events).to.have.length(4);
            events.forEach(function(event) {
                expect(event.result.data).to.eql({
                    'key-4': 'data-value-4'
                });
                expect(event.result.environment.toObject()).to.eql({
                    'key-3': 'env-value-3',
                    'key-4': 'env-value-4'
                });
                expect(event.result.collectionVariables.toObject()).to.eql({
                    'key-2': 'coll-value-2',
                    'key-3': 'coll-value-3',
                    'key-4': 'coll-value-4'
                });
                expect(event.result.globals.toObject()).to.eql({
                    'key-1': 'global-value-1',
                    'key-2': 'global-value-2',
                    'key-3': 'global-value-3',
                    'key-4': 'global-value-4'
                });
            });
        });
    });

    describe('.get', function () {
        it('must honour the variable precedence', function () {
            var collPreConsoleBefore = testRun.console.getCall(0).args.slice(2);

            expect(collPreConsoleBefore[0]).to.be('collection pre before');
            expect(collPreConsoleBefore[1]).to.eql({
                'key-1': 'global-value-1',
                'key-2': 'coll-value-2',
                'key-3': 'env-value-3',
                'key-4': 'data-value-4'
            });
        });

        it('must be resolved in request URL', function() {
            var url = testRun.request.getCall(0).args[3].url.toString(),
                expectedParam = 'global-value-1:coll-value-2:env-value-3:data-value-4';

            expect(url).to.be('https://postman-echo.com/get?param=' + expectedParam);
        });

        it('must be resolved in request auth', function() {
            var response = testRun.response.getCall(0).args[2],
                expectedToken = 'global-value-1:coll-value-2:env-value-3:data-value-4';

            expect(response.json().headers).to.have.property('authorization', 'Bearer ' + expectedToken);
        });
    });
});
