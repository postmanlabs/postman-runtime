describe('Collection variables', function () {
    var testRun;

    before(function (done) {
        var runOptions = {
            collection: {
                item: {
                    event: [
                        {
                            listen: 'prerequest',
                            script: {
                                exec: `
                                pm.variables.set('key-1', 'value-1');
                                pm.variables.set('key-2', 'value-1');
                                pm.variables.set('key-3', 'value-1');
                                pm.variables.set('key-4', 'value-1');
                                console.log('collection pre', pm.variables.toObject())
                            `}
                        },
                        {
                            listen: 'test',
                            script: {
                                exec: `
                                pm.variables.set('key-3', 'value-3');
                                pm.variables.set('key-4', 'value-3');
                                console.log('collection test', pm.variables.toObject())
                            `}
                        }
                    ],
                    item: {
                        event: [
                            {
                                listen: 'prerequest',
                                script: {
                                    exec: `
                                    pm.variables.set('key-2', 'value-2');
                                    pm.variables.set('key-3', 'value-2');
                                    pm.variables.set('key-4', 'value-2');
                                    console.log('item pre', pm.variables.toObject())
                                `}
                            },
                            {
                                listen: 'test',
                                script: {
                                    exec: `
                                    pm.variables.set('key-4', 'value-4');
                                    console.log('item test', pm.variables.toObject())
                                `}
                            }
                        ],
                        request: 'https://postman-echo.com/get'
                    }
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
        expect(testRun.prerequest.callCount).to.be(1);
        expect(testRun.test.callCount).to.be(1);
        expect(testRun.console.callCount).to.be(4);
    });

    it('must be persisted accross scripts ', function () {
        var collPreConsole = testRun.console.getCall(0).args.slice(2),
            itemPreConsole = testRun.console.getCall(1).args.slice(2),
            collTestConsole = testRun.console.getCall(2).args.slice(2),
            itemTestConsole = testRun.console.getCall(3).args.slice(2);

        expect(collPreConsole[0]).to.be('collection pre');
        expect(collPreConsole[1]).to.eql({
            'key-1': 'value-1',
            'key-2': 'value-1',
            'key-3': 'value-1',
            'key-4': 'value-1'
        });

        expect(itemPreConsole[0]).to.be('item pre');
        expect(itemPreConsole[1]).to.eql({
            'key-1': 'value-1',
            'key-2': 'value-2',
            'key-3': 'value-2',
            'key-4': 'value-2'
        });

        expect(collTestConsole[0]).to.be('collection test');
        expect(collTestConsole[1]).to.eql({
            'key-1': 'value-1',
            'key-2': 'value-2',
            'key-3': 'value-3',
            'key-4': 'value-3'
        });

        expect(itemTestConsole[0]).to.be('item test');
        expect(itemTestConsole[1]).to.eql({
            'key-1': 'value-1',
            'key-2': 'value-2',
            'key-3': 'value-3',
            'key-4': 'value-4'
        });
    });
});
