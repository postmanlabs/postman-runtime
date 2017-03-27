describe('Clear vars sandbox', function () {
    var _ = require('lodash'),
        testrun;

    before(function (done) {
        this.run({
            collection: {
                item: [{
                    name: 'Before clearing',
                    event: [{
                        listen: 'test',
                        script: {
                            type: 'text/javascript',
                            exec: 'console.log(environment);var data = JSON.parse(responseBody);\ntests[\'Variable substitution from env\'] = (data.args.a===\'2\');\ntests[\'Variable substitution from global\'] = (data.args.b===\'3\');\npostman.clearEnvironmentVariables();\npostman.clearGlobalVariables();'
                        }
                    }, {
                        listen: 'prerequest',
                        script: {
                            type: 'text/javascript',
                            exec: 'postman.setEnvironmentVariable(\'e\', \'2\');\npostman.setGlobalVariable(\'g\',\'3\');'
                        }
                    }],
                    request: {
                        url: 'https://postman-echo.com/get?a={{e}}&b={{g}}',
                        method: 'GET',
                        header: [],
                        body: {
                            mode: 'formdata',
                            formdata: []
                        },
                        description: 'rd'
                    },
                    response: []
                }, {
                    name: 'After clearing',
                    event: [{
                        listen: 'test',
                        script: {
                            type: 'text/javascript',
                            exec: 'var data = JSON.parse(responseBody);\ntests[\'Variable substitution from env not working after clearing\'] = (data.args.a===\'{{e}}\');\ntests[\'Variable substitution from global not working after clearing\'] = (data.args.b===\'{{g}}\');\npostman.setEnvironmentVariable(\'e\', \'2\');\npostman.setGlobalVariable(\'g\',\'3\');\ntests[\'Recreated vars\']=environment.e===\'2\' && globals.g===\'3\'\npostman.clearEnvironmentVariable(\'e\');\npostman.clearGlobalVariable(\'g\');'
                        }
                    }],
                    request: {
                        url: 'https://postman-echo.com/get?a={{e}}&b={{g}}',
                        method: 'GET',
                        header: [],
                        body: {
                            mode: 'formdata',
                            formdata: []
                        },
                        description: 'rd'
                    },
                    response: []
                }, {
                    name: 'After clearing',
                    event: [{
                        listen: 'test',
                        script: {
                            type: 'text/javascript',
                            exec: 'console.log(environment);console.log(globals);var data = JSON.parse(responseBody);\ntests[\'Variable substitution from env not working after clearing invididually\'] = (data.args.a===\'{{e}}\');\ntests[\'Variable substitution from global not working after clearing invididually\'] = (data.args.b===\'{{g}}\');'
                        }
                    }],
                    request: {
                        url: 'https://postman-echo.com/get?a={{e}}&b={{g}}',
                        method: 'GET',
                        header: [],
                        body: {
                            mode: 'formdata',
                            formdata: []
                        },
                        description: 'rd'
                    },
                    response: []
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

        expect(testrun.test.getCall(0).args[0]).to.be(null);
        expect(_.get(testrun.test.getCall(0).args[2], '0.result.globals.tests')).to.eql({
            'Variable substitution from env': true,
            'Variable substitution from global': true
        });

        expect(testrun.test.getCall(1).args[0]).to.be(null);
        expect(_.get(testrun.test.getCall(1).args[2], '0.result.globals.tests')).to.eql({
            'Recreated vars': true,
            'Variable substitution from env not working after clearing': true,
            'Variable substitution from global not working after clearing': true
        });

        expect(testrun.test.getCall(2).args[0]).to.be(null);
        expect(_.get(testrun.test.getCall(2).args[2], '0.result.globals.tests')).to.eql({
            'Variable substitution from env not working after clearing invididually': true,
            'Variable substitution from global not working after clearing invididually': true
        });
    });

    it('must have completed the run', function () {
        expect(testrun).be.ok();
        expect(testrun.done.calledOnce).be.ok();
        expect(testrun.done.getCall(0).args[0]).to.be(null);
        expect(testrun.start.calledOnce).be.ok();
    });
});
