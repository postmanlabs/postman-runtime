describe('Variable overrides', function() {
    var testrun;

    before(function(done) {
        this.run({
            data: [{dataVar: 'dataValue', data: 'DATA'}],
            globals: {
                values: [
                    {key: 'global_url', value: 'https://postman-echo.com/get', name: 'global_url', enabled: true},
                    {key: 'global_resource_get', 'value': '/get', 'name': 'global_resource_get', 'enabled': true},
                    {key: 'Global Foo', 'value': 'Global Bar', 'name': 'Global Foo', 'enabled': true},
                    {key: 'Global Phew', 'value': 'Global Works', 'name': 'Global Phew', 'enabled': true},
                    {key: 'global', 'value': 'global1', 'name': 'global', 'enabled': true},
                    {key: 'env', 'value': 'global1', 'name': 'env', 'enabled': true},
                    {key: 'data', 'value': 'global1', 'name': 'data', 'enabled': true}
                ]
            },
            environment: {
                values: [
                    {key: 'hKey', value: 'abhijit3', type: 'text', name: 'hKey', enabled: true},
                    {key: 'hburl', value: 'posts', type: 'text', name: 'hburl', enabled: true},
                    {key: 'tempKey', value: 'abhijit', type: 'text', name: 'tempKey', enabled: true},
                    {key: 'url', value: 'http://postman-echo.com', type: 'text', name: 'url', enabled: true},
                    {key: 'env', value: 'env2', type: 'text', name: 'env', enabled: true},
                    {key: 'data', value: 'env2', type: 'text', name: 'data', enabled: true}
                ]
            },
            collection: {
                item: [{
                    name: 'GET',
                    event: [{
                        listen: 'test',
                        script: {
                            exec: [
                                'tests[\'Content-Type present\'] = responseHeaders.hasOwnProperty(\'Content-Type\');',
                                'var data1 = JSON.parse(responseBody);',
                                'tests[\'testGlobalSetFromPRScript\'] = data1.args.prsG === \'prsG\';',
                                'tests[\'Read global var correctly\'] = globals.prsG === \'prsG\';',
                                '',
                                'tests[\'testEnvSetFromPRScript\'] = data1.args.prsE === \'prsE\';',
                                'tests[\'Read env var correctly\'] = environment.prsE === \'prsE\';',
                                'tests[\'Read data var correctly\'] = data.dataVar === \'dataValue\';',
                                '',
                                'postman.setGlobalVariable(\'prsG\', \'prsG1\');',
                                '',
                                'postman.setEnvironmentVariable(\'prsE\', \'prsE1\');'
                            ]
                        }
                    }, {
                        listen: 'prerequest',
                        script: {
                            exec: [
                                'postman.setGlobalVariable(\'prsG\', \'prsG\');',
                                'postman.setGlobalVariable(\'prsE\', \'prsEaRDDDROR\');',
                                'postman.setEnvironmentVariable(\'prsE\', \'prsE\');'
                            ]
                        }
                    }],
                    request: {
                        url: '{{url}}/get?global={{global}}&env={{env}}&data={{data}}&prsE={{prsE}}&prsG={{prsG}}',
                        method: 'GET'
                    }
                }, {
                    name: 'GET 2',
                    event: [{
                        listen: 'test',
                        script: {
                            exec: [
                                'var data1 = JSON.parse(responseBody);',
                                'tests[\'Read global var correctly\'] = globals.prsG === \'prsG1\';',
                                'tests[\'Read env var correctly\'] = environment.prsE === \'prsE1\';',
                                'tests[\'Read data var correctly\'] = data.dataVar === \'dataValue\';'
                            ]
                        }
                    }],
                    request: {
                        url: '{{url}}/get?global={{global}}&env={{env}}&data={{data}}',
                        method: 'GET',
                        description: 'Similar to postman-echo.com/get. Return GET data.'
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
        expect(testrun.test.getCall(1).args[0]).to.be(null);
    });

    it('must have completed the run', function() {
        expect(testrun).be.ok();
        expect(testrun.done.calledOnce).be.ok();
        expect(testrun.done.getCall(0).args[0]).to.be(null);
        expect(testrun.start.calledOnce).be.ok();
    });
});
