describe('V2 regressions', function() {
    var _ = require('lodash'),
        request = require('postman-request'),

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
        expect(_.get(testrun.test.getCall(0).args[2], '0.result.tests')).to.eql({
            'Status code is 200': true,
            'foo1 cookie is present in the response body': true
        });

        expect(testrun.test.getCall(1).args[0]).to.be(null);
        expect(_.get(testrun.test.getCall(1).args[2], '0.result.tests["Status code is 200"]')).to.be(true);

        expect(testrun.test.getCall(2).args[0]).to.be(null);
        expect(_.get(testrun.test.getCall(2).args[2], '0.result.tests')).to.eql({
            'Status code is 200': true,
            'Disabled header is absent': true
        });
    });

    it('must have completed the run', function() {
        expect(testrun).be.ok();
        expect(testrun.done.calledOnce).be.ok();
        expect(testrun.done.getCall(0).args[0]).to.be(null);
        expect(testrun.start.calledOnce).be.ok();
    });
});
