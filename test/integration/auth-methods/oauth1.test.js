describe('oauth 1', function () {
    var testrun;

    before(function (done) {
        // perform the collection run
        this.run({
            collection: {
                item: {
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
                        url: 'https://postman-echo.com/oauth1',
                        method: 'GET'
                    }
                }
            },
            authorizer: {interactive: true}
        }, function (err, results) {
            testrun = results;
            done(err);
        });
    });

    it('must have completed the run', function () {
        expect(testrun).be.ok();
        expect(testrun.done.calledOnce).be.ok();
        testrun.done.getCall(0).args[0] && console.error(testrun.done.getCall(0).args[0].stack);
        expect(testrun.done.getCall(0).args[0]).to.be(null);
        expect(testrun.start.calledOnce).be.ok();
    });

    it('must have sent the request once', function () {
        expect(testrun.request.calledOnce).be.ok();

        var request = testrun.request.getCall(0).args[3],
            response = testrun.request.getCall(0).args[2];

        expect(request.url.toString()).to.eql('https://postman-echo.com/oauth1');
        expect(response.code).to.eql(200);
    });

    it('must have sent one request internally', function () {
        expect(testrun.io.calledOnce).be.ok();

        var firstError = testrun.io.firstCall.args[0],
            firstRequest = testrun.io.firstCall.args[4],
            firstResponse = testrun.io.firstCall.args[3];

        expect(firstError).to.be(null);
        expect(firstRequest.url.toString()).to.eql('https://postman-echo.com/oauth1');
        expect(firstResponse.code).to.eql(200);
    });

    it('must have passed OAuth 1 authorization', function () {
        expect(testrun.request.calledOnce).be.ok();

        var request = testrun.request.getCall(0).args[3],
            response = testrun.request.getCall(0).args[2];

        expect(request.url.toString()).to.eql('https://postman-echo.com/oauth1');
        expect(response.code).to.eql(200);
    });
});
