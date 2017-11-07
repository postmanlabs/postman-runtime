describe('V2 regressions', function() {
    var request = require('postman-request'),

        testrun;

    before(function(done) {
        this.run({
            requester: {strictSSL: false, cookieJar: request.jar()},
            environment: {
                values: [{type: 'any', value: 'abhijit3', key: 'envKey'},
                    {type: 'any', value: 'postman-echo.com', key: 'envFileUrl'},
                    {type: 'any', value: '1', key: 'dataVar2'}]
            },
            collection: {
                item: [{
                    event: [{
                        listen: 'test',
                        script: {
                            exec: [
                                'var cookies = JSON.parse(responseBody).cookies;',
                                'tests[\'Status code is 200\'] = responseCode.code === 200;',
                                // eslint-disable-next-line max-len
                                'tests[\'foo1 cookie is present in the response body\'] = cookies[\'foo1\'] === postman.getEnvironmentVariable(\'envKey\');'
                            ]
                        }
                    }],
                    request: {url: 'https://postman-echo.com/cookies/set?foo1={{envKey}}&foo2=bar', method: 'GET'}
                }, {
                    event: [{
                        listen: 'test',
                        script: {exec: ['tests[\'Status code is 200\'] = responseCode.code === 200;']}
                    }],
                    request: {url: 'https://expired.badssl.com', method: 'GET'}
                }, {
                    event: [{
                        listen: 'test',
                        script: {
                            exec: [
                                'var headers = JSON.parse(responseBody).headers;',
                                'tests[\'Status code is 200\'] = responseCode.code === 200;',
                                'tests[\'Disabled header is absent\'] = !headers[\'disabled-header\'];'
                            ]
                        }
                    }],
                    request: {
                        url: 'https://postman-echo.com/headers',
                        method: 'GET',
                        header: [{key: '//disabled-header', value: 'randomHeaderString', disabled: true}]
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
        expect(testrun.test.calledThrice).be.ok();

        expect(testrun.test.getCall(0).args[0]).to.be(null);
        expect(testrun.assertion.getCall(0).args[1]).to.eql([
            {error: null, index: 0, passed: true, skipped: false, name: 'Status code is 200'},
            {error: null, index: 1, passed: true, skipped: false, name: 'foo1 cookie is present in the response body'}
        ]);

        expect(testrun.test.getCall(1).args[0]).to.be(null);
        expect(testrun.assertion.getCall(1).args[1]).to.eql([
            {error: null, index: 0, passed: true, skipped: false, name: 'Status code is 200'}
        ]);

        expect(testrun.test.getCall(2).args[0]).to.be(null);
        expect(testrun.assertion.getCall(2).args[1]).to.eql([
            {error: null, index: 0, passed: true, skipped: false, name: 'Status code is 200'},
            {error: null, index: 1, passed: true, skipped: false, name: 'Disabled header is absent'}
        ]);
    });

    it('must have completed the run', function() {
        expect(testrun).be.ok();
        expect(testrun.done.calledOnce).be.ok();
        expect(testrun.done.getCall(0).args[0]).to.be(null);
        expect(testrun.start.calledOnce).be.ok();
    });
});
