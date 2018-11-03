var expect = require('chai').expect;

describe('Sandbox libraries', function() {
    var _ = require('lodash'),
        testrun;

    before(function(done) {
        this.run({
            collection: {
                item: [{
                    event: [{
                        listen: 'test',
                        script: {
                            exec: [
                                'try {',
                                '    var jsonObject = xml2Json(responseBody);',
                                '    tests[\'xml2Json\']=!!jsonObject;',
                                '}',
                                'catch(e) { tests[\'xml2Json\']=false;}',
                                'try { tests[\'GetResponseHeader\']=true; } catch(e) {',
                                '    tests[\'GetResponseHeader\']=false;',
                                '}',
                                'try { tests[\'GetResponseCookie\']=true; } catch(e) {',
                                '    tests[\'GetResponseCookie\']=false;',
                                '}',
                                'try { console.log(\'RESCOOK: \' , responseCookies);} catch(e) {}',
                                'tests[\'Correct global\'] = globals.g1==\'0\';',
                                'try { console.log(postman.clearEnvironmentVariables()); } catch(e) {}',
                                'try { console.log(postman.clearGlobalVariables()); } catch(e) {}',
                                'postman.setGlobalVariable(\'g1\', \'0\');',
                                'postman.setEnvironmentVariable(\'e1\', \'0\');',
                                'try { _.each([1], function(v) {tests["Lodash working"] = true;});}',
                                'catch(e) { tests["Lodash working"] = false;}',
                                'var newString=\'diabetes\';',
                                'tests[\'SugarJS working\']=newString.has(\'betes\');',
                                'tests[\'tv4 present\'] = (typeof tv4.validate === \'function\');',
                                // eslint-disable-next-line max-len
                                'tests[\'CryptoJS md5\'] = (CryptoJS.MD5(\'jasonpurse\') == \'288d14f08b5ad40da43dbe06467729c9\');'
                            ]
                        }
                    }, {
                        listen: 'prerequest',
                        script: {exec: ['postman.setGlobalVariable(\'g1\', \'0\');']}
                    }],
                    request: {
                        url: 'https://postman-echo.com/type/xml',
                        method: 'GET'
                    }
                }, {
                    event: [{
                        listen: 'test',
                        script: {
                            exec: [
                                'tests[\'Status code is 200\'] = responseCode.code === 200;',
                                'var jsonData = JSON.parse(responseBody);',
                                'tests[\'Correct GUID\'] = jsonData.form.guid.length === 36;',
                                'tests[\'Correct Random\'] = parseInt(jsonData.form.randomInt)>=0;',
                                'tests[\'Correct Timestamp\'] = parseInt(jsonData.form.timestamp)>1000',
                                'tests[\'Correct global\'] = jsonData.form.global == \'0\';',
                                'tests[\'Correct global2\'] = jsonData.form.global == globals.g1;',
                                'tests[\'Correct envVar\'] = jsonData.form.envValue == \'0\';',
                                'tests[\'Correct envVar2\'] = jsonData.form.envValue == environment.e1;'
                            ]
                        }
                    }],
                    request: {
                        url: 'https://postman-echo.com/post',
                        method: 'POST',
                        body: {
                            mode: 'formdata',
                            formdata: [{key: 'k1', value: 'v1', type: 'text', enabled: true},
                                {key: 'k2', value: 'v2', type: 'text', enabled: true},
                                {key: 'guid', value: '{{$guid}}', type: 'text', enabled: true},
                                {key: 'timestamp', value: '{{$timestamp}}', type: 'text', enabled: true},
                                {key: 'randomInt', value: '{{$randomInt}}', type: 'text', enabled: true},
                                {key: 'global', value: '{{g1}}', type: 'text', enabled: true},
                                {key: 'envValue', value: '{{e1}}', type: 'text', enabled: true}]
                        }
                    }
                }, {
                    event: [{
                        listen: 'test',
                        script: {exec: ['tests[\'Status code is 200\'] = responseCode.code === 200;']}
                    }],
                    request: {url: 'https://postman-echo.com/put', method: 'PUT'}
                }, {
                    event: [{
                        listen: 'test',
                        script: {exec: ['tests[\'Status code is 200\'] = responseCode.code === 200;']}
                    }],
                    request: {url: 'https://postman-echo.com/patch', method: 'PATCH'}
                }, {
                    event: [{
                        listen: 'test',
                        script: {exec: ['tests[\'Status code is 200\'] = responseCode.code === 200;']}
                    }],
                    request: {url: 'https://postman-echo.com/delete', method: 'DELETE'}
                }, {
                    event: [{
                        listen: 'test',
                        script: {
                            exec: [
                                'tests[\'Status code is 200\'] = responseCode.code === 200;',
                                'tests[\'Body is correct\'] = responseBody === \'\';'
                            ]
                        }
                    }],
                    request: {url: 'https://postman-echo.com/get', method: 'HEAD'}
                }, {
                    event: [{
                        listen: 'test',
                        script: {
                            type: 'text/javascript',
                            exec: [
                                'tests[\'Status code is 200\'] = responseCode.code === 200;',
                                'tests[\'Body is correct\'] = !_.isEmpty(responseBody.split(\',\'));'
                            ]
                        }
                    }],
                    request: {url: 'https://postman-echo.com/get', method: 'OPTIONS'}
                }, {
                    event: [{
                        listen: 'test',
                        script: {exec: ['tests[\'Status code is 200\'] = responseCode.code === 200;']}
                    }],
                    request: {
                        url: 'https://postman-echo.com/post',
                        method: 'POST',
                        body: {mode: 'raw', raw: 'RAWDATA'}
                    }
                }, {
                    event: [{
                        listen: 'test',
                        script: {
                            exec: [
                                'var jsonData = JSON.parse(responseBody);',
                                // eslint-disable-next-line max-len
                                'tests[\'Correct auth header\'] = jsonData.headers.authorization === \'Basic cG9zdG1hbjpwYXNzd29yZA==\';'
                            ]
                        }
                    }],
                    request: {
                        auth: {
                            type: 'basic',
                            // eslint-disable-next-line max-len
                            basic: {username: 'postman', password: 'password', saveHelperData: true, showPassword: false}
                        },
                        url: 'https://postman-echo.com/post',
                        method: 'POST'
                    }
                }, {
                    event: [{
                        listen: 'test',
                        script: {
                            exec: [
                                'var jsonData = JSON.parse(responseBody);',
                                'tests[\'Authenticated\'] = jsonData.authenticated === true;'
                            ]
                        }
                    }],
                    request: {
                        auth: {
                            type: 'digest',
                            digest: {
                                algorithm: '',
                                username: 'postman',
                                realm: 'Users',
                                password: 'password',
                                nonce: 'ni1LiL0O37PRRhofWdCLmwFsnEtH1lew',
                                nonceCount: '',
                                clientNonce: '',
                                opaque: '',
                                qop: ''
                            }
                        },
                        url: 'https://postman-echo.com/digest-auth',
                        method: 'GET'
                    }
                }, {
                    event: [{
                        listen: 'test',
                        script: {
                            exec: [
                                'var jsonData = JSON.parse(responseBody);',
                                '//tests[\'Recur. res. working\'] = jsonData.args.a == \'kane\';'
                            ]
                        }
                    }, {
                        listen: 'prerequest',
                        script: {
                            exec: [
                                'postman.setGlobalVariable(\'name1\', \'kane\');',
                                'postman.setGlobalVariable(\'i\', \'1\');'
                            ]
                        }
                    }],
                    request: {url: 'https://postman-echo.com/get?a={{name{{i}}}}', method: 'GET'}
                }]
            }
        }, function(err, results) {
            testrun = results;
            done(err);
        });
    });

    it('should have run the test script successfully', function() {
        expect(testrun).to.be.ok;
        expect(testrun).to.nested.include({
            'test.callCount': 11,
            'assertion.callCount': 10
        });

        expect(testrun.test.getCall(0).args[0]).to.be.null;
        expect(testrun.assertion.getCall(0).args[1]).to.eql([
            {error: null, index: 0, passed: true, skipped: false, name: 'xml2Json'},
            {error: null, index: 1, passed: true, skipped: false, name: 'GetResponseHeader'},
            {error: null, index: 2, passed: true, skipped: false, name: 'GetResponseCookie'},
            {error: null, index: 3, passed: true, skipped: false, name: 'Correct global'},
            {error: null, index: 4, passed: true, skipped: false, name: 'Lodash working'},
            {error: null, index: 5, passed: true, skipped: false, name: 'SugarJS working'},
            {error: null, index: 6, passed: true, skipped: false, name: 'tv4 present'},
            {error: null, index: 7, passed: true, skipped: false, name: 'CryptoJS md5'}
        ]);


        expect(testrun.test.getCall(1).args[0]).to.be.null;
        expect(testrun.assertion.getCall(1).args[1]).to.eql([
            {error: null, index: 0, passed: true, skipped: false, name: 'Status code is 200'},
            {error: null, index: 1, passed: true, skipped: false, name: 'Correct GUID'},
            {error: null, index: 2, passed: true, skipped: false, name: 'Correct Random'},
            {error: null, index: 3, passed: true, skipped: false, name: 'Correct Timestamp'},
            {error: null, index: 4, passed: true, skipped: false, name: 'Correct global'},
            {error: null, index: 5, passed: true, skipped: false, name: 'Correct global2'},
            {error: null, index: 6, passed: true, skipped: false, name: 'Correct envVar'},
            {error: null, index: 7, passed: true, skipped: false, name: 'Correct envVar2'}
        ]);

        _.range(2, 5).forEach(function(index) { // generates a range [2, 4], and checks the tests on those indices
            expect(testrun.test.getCall(index).args[0]).to.be.null;
            expect(testrun.assertion.getCall(index).args[1]).to.eql([
                {error: null, index: 0, passed: true, skipped: false, name: 'Status code is 200'}
            ]);
        });

        expect(testrun.test.getCall(5).args[0]).to.be.null;
        expect(testrun.assertion.getCall(5).args[1]).to.eql([
            {error: null, index: 0, passed: true, skipped: false, name: 'Status code is 200'},
            {error: null, index: 1, passed: true, skipped: false, name: 'Body is correct'}
        ]);

        expect(testrun.test.getCall(6).args[0]).to.be.null;
        expect(testrun.assertion.getCall(6).args[1]).to.eql([
            {error: null, index: 0, passed: true, skipped: false, name: 'Status code is 200'},
            {error: null, index: 1, passed: true, skipped: false, name: 'Body is correct'}
        ]);

        expect(testrun.test.getCall(7).args[0]).to.be.null;
        expect(testrun.assertion.getCall(7).args[1]).to.eql([
            {error: null, index: 0, passed: true, skipped: false, name: 'Status code is 200'}
        ]);

        expect(testrun.test.getCall(8).args[0]).to.be.null;
        expect(testrun.assertion.getCall(8).args[1]).to.eql([
            {error: null, index: 0, passed: true, skipped: false, name: 'Correct auth header'}
        ]);

        expect(testrun.test.getCall(9).args[0]).to.be.null;
        expect(testrun.assertion.getCall(9).args[1]).to.eql([
            {error: null, index: 0, passed: true, skipped: false, name: 'Authenticated'}
        ]);
    });

    it('should have completed the run', function() {
        expect(testrun).to.be.ok;
        expect(testrun.done.getCall(0).args[0]).to.be.null;
        expect(testrun).to.nested.include({
            'done.calledOnce': true,
            'start.calledOnce': true
        });
    });
});
