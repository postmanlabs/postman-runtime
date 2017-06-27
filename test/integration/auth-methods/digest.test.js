describe('digest auth', function () {
    var testrun;

    before(function (done) {
        // perform the collection run
        this.run({
            collection: {
                item: {
                    name: 'DigestAuth',
                    request: {
                        url: 'https://postman-echo.com/digest-auth',
                        auth: {
                            type: 'digest',
                            digest: {
                                algorithm: 'MD5',
                                username: 'postman',
                                password: 'password'
                            }
                        }
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

        expect(request.url.toString()).to.eql('https://postman-echo.com/digest-auth');
        expect(response.code).to.eql(200);
    });

    it('must have sent two requests internally', function () {
        expect(testrun.io.calledTwice).be.ok();

        var firstError = testrun.io.firstCall.args[0],
            secondError = testrun.io.secondCall.args[0],
            firstRequest = testrun.io.firstCall.args[4],
            firstResponse = testrun.io.firstCall.args[3],
            secondRequest = testrun.io.secondCall.args[4],
            secondResponse = testrun.io.secondCall.args[3];

        expect(firstError).to.be(null);
        expect(secondError).to.be(null);

        expect(firstRequest.url.toString()).to.eql('https://postman-echo.com/digest-auth');
        expect(firstResponse.code).to.eql(401);

        expect(secondRequest.url.toString()).to.eql('https://postman-echo.com/digest-auth');
        expect(secondResponse.code).to.eql(200);
    });

    it('must have passed the digest authorization', function () {
        expect(testrun.request.calledOnce).be.ok();

        var request = testrun.request.getCall(0).args[3],
            response = testrun.request.getCall(0).args[2];

        expect(request.url.toString()).to.eql('https://postman-echo.com/digest-auth');
        expect(response.code).to.eql(200);
    });
});
