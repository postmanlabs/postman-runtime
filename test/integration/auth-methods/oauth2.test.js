var expect = require('chai').expect;

describe('oauth 2', function () {
    var testrun;

    describe('refresh token', function () {
        describe('when sending a request', function () {
            before(function (done) {
                // perform the collection run
                this.run({
                    collection: {
                        item: {
                            request: {
                                auth: {
                                    type: 'oauth2',
                                    oauth2: {
                                        accessToken: 'some-access-token',
                                        addTokenTo: 'header',
                                        tokenType: 'Bearer',
                                        authId: 'some-auth-id'
                                    }
                                },
                                url: 'https://postman-echo.com/get',
                                method: 'GET'
                            }
                        }
                    },
                    requester: {
                        refreshTokenHelper: {
                            refreshToken () {
                                return Promise.resolve('some-refreshed-access-token');
                            }
                        }
                    }
                }, function (err, results) {
                    testrun = results;
                    done(err);
                });
            });

            it('should have completed the run', function () {
                expect(testrun).to.be.ok;
                expect(testrun.done.calledOnce).to.be.ok;
                testrun.done.getCall(0).args[0] && console.error(testrun.done.getCall(0).args[0].stack);
                expect(testrun.done.getCall(0).args[0]).to.be.null;
                expect(testrun.start.calledOnce).to.be.ok;
            });

            it('should have sent the request once', function () {
                expect(testrun.request.calledOnce).to.be.ok;

                var request = testrun.request.getCall(0).args[3],
                    response = testrun.request.getCall(0).args[2];

                expect(request.url.toString()).to.eql('https://postman-echo.com/get');
                expect(response).to.have.property('code', 200);
            });

            it('should have sent one request internally', function () {
                expect(testrun.io.calledOnce).to.be.ok;

                var firstError = testrun.io.firstCall.args[0],
                    firstRequest = testrun.io.firstCall.args[4],
                    firstResponse = testrun.io.firstCall.args[3];

                expect(firstError).to.be.null;
                expect(firstRequest.url.toString()).to.eql('https://postman-echo.com/get');
                expect(firstResponse).to.have.property('code', 200);
            });

            it('should have sent the request with the refreshed access token', function () {
                var request = testrun.request.getCall(0).args[3];

                expect(request.headers.get('Authorization')).to.eql('Bearer some-refreshed-access-token');
            });
        });
    });
});
