describe('hawk auth', function () {
    var testrun;

    before(function (done) {
        // perform the collection run
        this.run({
            collection: {
                item: {
                    request: {
                        auth: {
                            type: 'hawk',
                            hawk: {
                                authId: 'dh37fgj492je',
                                authKey: 'werxhqb98rpaxn39848xrunpaw3489ruxnpa98w4rxn',
                                algorithm: 'sha256',
                                user: 'asda',
                                saveHelperData: true,
                                nonce: 'eFRP2o',
                                extraData: 'skjdfklsjhdflkjhsdf',
                                appId: '',
                                delegation: '',
                                timestamp: ''
                            }
                        },
                        url: 'https://postman-echo.com/auth/hawk',
                        method: 'GET'
                    }
                }
            }
        }, function (err, results) {
            testrun = results;
            done(err);
        });
    });

    it('must have completed the run', function () {
        expect(testrun).be.ok();
        expect(testrun.done.callCount).to.be(1);
        testrun.done.getCall(0).args[0] && console.error(testrun.done.getCall(0).args[0].stack);
        expect(testrun.done.getCall(0).args[0]).to.be(null);
        expect(testrun.start.callCount).be(1);
    });

    it('must have sent the request once', function () {
        expect(testrun.request.callCount).to.be(1);

        var request = testrun.request.getCall(0).args[3],
            response = testrun.request.getCall(0).args[2];

        expect(request.url.toString()).to.eql('https://postman-echo.com/auth/hawk');
        expect(response.code).to.eql(200);
    });

    it('must have sent one request internally', function () {
        expect(testrun.io.callCount).to.be(1);

        var firstError = testrun.io.firstCall.args[0],
            firstRequest = testrun.io.firstCall.args[4],
            firstResponse = testrun.io.firstCall.args[3];

        expect(firstError).to.be(null);
        expect(firstRequest.url.toString()).to.eql('https://postman-echo.com/auth/hawk');
        expect(firstResponse.code).to.eql(200);
    });

    it('must have passed the hawk authorization', function () {
        expect(testrun.request.callCount).to.be(1);

        var request = testrun.request.getCall(0).args[3],
            response = testrun.request.getCall(0).args[2];

        expect(request.url.toString()).to.eql('https://postman-echo.com/auth/hawk');
        expect(response.code).to.eql(200);
    });
});
