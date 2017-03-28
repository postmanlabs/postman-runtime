describe('Data file variable replacement', function() {
    var _ = require('lodash'),
        testrun;

    before(function(done) {
        this.run({
            environment: {
                values: [
                    {key: 'envKey', value: 'abhijit3', type: 'text', name: 'envKey', enabled: true},
                    {key: 'envFileUrl', value: 'postman-echo.com', type: 'text', name: 'envFileUrl', enabled: true}
                ]
            },
            data: [{dataVar: 'value1'}, {dataVar: 'value2'}],
            collection: {
                item: [{
                    event: [{
                        listen: 'test',
                        script: {
                            exec: [
                                'var data = JSON.parse(responseBody);',
                                'tests[\'form data populated through env file\'] = (data.form.envFileKey===\'abhijit3\');',
                                'tests[\'form-data populated through prScript\'] = (data.form.prScriptTest==iteration);'
                            ]
                        }
                    }, {
                        listen: 'prerequest',
                        script: {
                            exec: [
                                'postman.setEnvironmentVariable(\'dataVar2\',iteration);'
                            ]
                        }
                    }],
                    request: {
                        url: 'http://{{envFileUrl}}/post',
                        method: 'POST',
                        header: [{key: 'h1', value: 'v1'}],
                        body: {
                            mode: 'formdata',
                            formdata: [{key: 'dataFileKey', value: '{{dataVar}}', type: 'text'},
                                {key: 'envFileKey', value: '{{envKey}}', type: 'text'},
                                {key: 'prScriptTest', value: '{{dataVar2}}', type: 'text'}]
                        }
                    }
                }]
            }
        }, function(err, results) {
            testrun = results;
            done(err);
        });
    });

    it('must have run the test script successfully', function() {
        expect(testrun).be.ok();
        expect(testrun.test.calledTwice).be.ok();

        expect(testrun.test.getCall(0).args[0]).to.be(null);
        expect(_.get(testrun.test.getCall(0).args[2], '0.result.globals.tests')).to.eql({
            'form data populated through env file': true,
            'form-data populated through prScript': true
        });
    });

    it('must have completed the run', function() {
        expect(testrun).be.ok();
        expect(testrun.done.calledOnce).be.ok();
        expect(testrun.done.getCall(0).args[0]).to.be(null);
        expect(testrun.start.calledOnce).be.ok();
    });
});
