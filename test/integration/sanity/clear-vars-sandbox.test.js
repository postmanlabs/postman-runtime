describe('Clear vars sandbox', function () {
    var _ = require('lodash'),
        testrun;

    before(function (done) {
        this.run({
            environment: {values: [{key: 'e', value: '2'}]},
            globals: {values: [{key: 'g', value: '3'}]},
            collection: {
                item: [{
                    event: [{
                        listen: 'test',
                        script: {
                            exec: [
                                'var data = JSON.parse(responseBody);',
                                'tests[\'Variable substitution from env\'] = (data.args.a===\'2\');',
                                'tests[\'Variable substitution from global\'] = (data.args.b===\'3\');',
                                'postman.clearEnvironmentVariables();',
                                'postman.clearGlobalVariables();'
                            ]
                        }
                    }],
                    request: {
                        url: 'https://postman-echo.com/get?a={{e}}&b={{g}}',
                        method: 'GET'
                    }
                }, {
                    event: [{
                        listen: 'test',
                        script: {
                            exec: [
                                'var data = JSON.parse(responseBody);',
                                // eslint-disable-next-line max-len
                                'tests[\'Variable substitution from env not working after clearing\'] = (data.args.a===\'{{e}}\');',
                                // eslint-disable-next-line max-len
                                'tests[\'Variable substitution from global not working after clearing\'] = (data.args.b===\'{{g}}\');',
                                'postman.setEnvironmentVariable(\'e\', \'2\');',
                                'postman.setGlobalVariable(\'g\',\'3\');',
                                'tests[\'Recreated vars\']=environment.e===\'2\' && globals.g===\'3\'',
                                'postman.clearEnvironmentVariable(\'e\');',
                                'postman.clearGlobalVariable(\'g\');'
                            ]
                        }
                    }],
                    request: {
                        url: 'https://postman-echo.com/get?a={{e}}&b={{g}}',
                        method: 'GET'
                    }
                }, {
                    event: [{
                        listen: 'test',
                        script: {
                            exec: [
                                'var data = JSON.parse(responseBody);',
                                // eslint-disable-next-line max-len
                                'tests[\'Variable substitution from env not working after clearing invididually\'] = (data.args.a===\'{{e}}\');',
                                // eslint-disable-next-line max-len
                                'tests[\'Variable substitution from global not working after clearing invididually\'] = (data.args.b===\'{{g}}\');'
                            ]
                        }
                    }],
                    request: {
                        url: 'https://postman-echo.com/get?a={{e}}&b={{g}}',
                        method: 'GET'
                    }
                }]
            }
        }, function (err, results) {
            testrun = results;
            done(err);
        });
    });

    describe('test scripts', function () {
        it('should have run thrice', function () {
            expect(testrun).be.ok();
            expect(testrun.test.calledThrice).be.ok();
        });

        it('should correctly clear environments and globals in the test run 1', function () {
            var first = testrun.test.getCall(0);

            expect(first.args[0]).to.be(null);
            expect(_.invoke(first.args[2], '0.result.globals.values.all')).to.eql([]);
            expect(_.invoke(first.args[2], '0.result.environment.values.all')).to.eql([]);
        });

        it('should correctly clear environments and globals in the test run 2', function () {
            var second = testrun.test.getCall(1);

            expect(second.args[0]).to.be(null);
            expect(_.invoke(second.args[2], '0.result.globals.values.all')).to.eql([]);
            expect(_.invoke(second.args[2], '0.result.environment.values.all')).to.eql([]);
        });

        it('should correctly clear environments and globals in the test run 3', function () {
            var third = testrun.test.getCall(2);

            expect(third.args[0]).to.be(null);
            expect(_.invoke(third.args[2], '0.result.globals.values.all')).to.eql([]);
            expect(_.invoke(third.args[2], '0.result.environment.values.all')).to.eql([]);
        });
    });

    it('must have completed the run', function () {
        expect(testrun).be.ok();
        expect(testrun.done.calledOnce).be.ok();
        expect(testrun.done.getCall(0).args[0]).to.be(null);
        expect(testrun.start.calledOnce).be.ok();
    });
});
