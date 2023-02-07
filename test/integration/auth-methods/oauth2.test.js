var expect = require('chai').expect,
    sinon = require('sinon');

describe('oauth 2', function () {
    after(function () {
        sinon.restore();
    });

    var testrun,
        refreshTokenFunction;

    describe('refresh token', function () {
        describe('when token refreshes successfully', function () {
            before(function (done) {
                refreshTokenFunction = sinon.fake(function (id, callback) {
                    callback(null, 'some-refreshed-access-token');
                });

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
                                        id: 'some-auth-id'
                                    }
                                },
                                url: 'https://postman-echo.com/get',
                                method: 'GET'
                            }
                        }
                    },
                    requester: {
                        authorizer: {
                            refreshOAuth2Token: refreshTokenFunction
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

                // The refresh token call should have been made once
                expect(refreshTokenFunction.callCount).to.eql(1);

                expect(request.headers.get('Authorization')).to.eql('Bearer some-refreshed-access-token');
            });
        });

        describe('when token refresh fails', function () {
            before(function (done) {
                // Refresh token call errors out
                refreshTokenFunction = sinon.fake(function (id, callback) {
                    callback(new Error('Access Token missing from response'));
                });

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
                                        id: 'some-auth-id'
                                    }
                                },
                                url: 'https://postman-echo.com/get',
                                method: 'GET'
                            }
                        }
                    },
                    requester: {
                        authorizer: {
                            refreshOAuth2Token: refreshTokenFunction
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

            it('should have sent the request with the original access token', function () {
                var request = testrun.request.getCall(0).args[3];

                // The refresh token call should have been made
                expect(refreshTokenFunction.callCount).to.eql(1);

                // No attempt to cancel because this is not a timeout
                expect(request.headers.get('Authorization')).to.eql('Bearer some-access-token');
            });
        });
    });
});
