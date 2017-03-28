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
                                'tests[\'Variable substitution from env not working after clearing\'] = (data.args.a===\'{{e}}\');',
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
                                'tests[\'Variable substitution from env not working after clearing invididually\'] = (data.args.a===\'{{e}}\');',
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

    it('must have run the test script successfully', function () {
        expect(testrun).be.ok();
        expect(testrun.test.calledThrice).be.ok();

        var first = testrun.test.getCall(0),
            second = testrun.test.getCall(1),
            third = testrun.test.getCall(2);

        expect(first.args[0]).to.be(null);
        expect(_.get(first.args[2], '0.result.globals.globals')).to.eql({});
        expect(_.get(first.args[2], '0.result.globals.environment')).to.eql({});

        expect(second.args[0]).to.be(null);
        expect(_.get(second.args[2], '0.result.globals.globals')).to.eql({});
        expect(_.get(second.args[2], '0.result.globals.environment')).to.eql({});

        expect(third.args[0]).to.be(null);
        expect(_.get(third.args[2], '0.result.globals.globals')).to.eql({});
        expect(_.get(third.args[2], '0.result.globals.environment')).to.eql({});
    });

    it('must have completed the run', function () {
        expect(testrun).be.ok();
        expect(testrun.done.calledOnce).be.ok();
        expect(testrun.done.getCall(0).args[0]).to.be(null);
        expect(testrun.start.calledOnce).be.ok();
    });
});
