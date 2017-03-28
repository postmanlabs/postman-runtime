describe('OAuth1 var in url params', function() {
    var _ = require('lodash'),
        testrun;

    before(function(done) {
        this.run({
            collection: {
                item: [{
                    event: [{
                        listen: 'prerequest',
                        script: {
                            exec: 'postman.setEnvironmentVariable("vala", "omg");'
                        }
                    }, {
                        listen: 'test',
                        script: {
                            exec: [
                                'tests["Response code is 200"] = responseCode.code === 200;',
                                'tests["Verification succeeded"] = JSON.parse(responseBody).status === "pass";'
                            ]
                        }
                    }],
                    request: {
                        auth: {
                            type: 'oauth1',
                            oauth1: {
                                consumerKey: 'RKCGzna7bv9YD57c',
                                consumerSecret: 'D+EdQ-gs$-%@2Nu7',
                                token: '',
                                tokenSecret: '',
                                signatureMethod: 'HMAC-SHA1',
                                timeStamp: 1461319769,
                                nonce: 'ik3oT5',
                                version: '1.0',
                                realm: '',
                                addParamsToHeader: true,
                                addEmptyParamsToSign: false
                            }
                        },
                        url: 'https://postman-echo.com/oauth1?a={{vala}}',
                        method: 'GET',
                        header: [{
                            key: 'Authorization',
                            value: 'OAuth oauth_consumer_key=\'RKCGzna7bv9YD57c\',oauth_signature_method=\'HMAC-SHA1\',oauth_timestamp=\'1461319769\',oauth_nonce=\'ik3oT5\',oauth_version=\'1.0\',oauth_signature=\'x0gnkYdST73FwY8oAqtV2O9MzGc%3D\''
                        }]
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
        expect(testrun.test.calledOnce).be.ok();

        expect(testrun.test.getCall(0).args[0]).to.be(null);
        expect(_.get(testrun.test.getCall(0).args[2], '0.result.globals.tests')).to.eql({
            'Response code is 200': true,
            'Verification succeeded': true
        });
    });

    it('must have completed the run', function() {
        expect(testrun).be.ok();
        expect(testrun.done.calledOnce).be.ok();
        expect(testrun.done.getCall(0).args[0]).to.be(null);
        expect(testrun.start.calledOnce).be.ok();
    });
});
