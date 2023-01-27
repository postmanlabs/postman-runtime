var expect = require('chai').expect,
    sinon = require('sinon');

describe('oauth 2', function () {
    after(function () {
        sinon.restore();
    });

    var testrun,
        refreshTokenFunction,
        cancelRefreshTokenFunction,
        delay = (timeout) => {
            return new Promise((resolve) => {
                setTimeout(() => {
                    resolve();
                }, timeout);
            });
        };

    describe('refresh token', function () {
        describe('when token refreshes successfully', function () {
            before(function (done) {
                refreshTokenFunction = sinon.fake.resolves('some-refreshed-access-token');
                cancelRefreshTokenFunction = sinon.fake();

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
                            refreshToken: refreshTokenFunction,
                            cancelRefresh: cancelRefreshTokenFunction
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

                // The cancel refresh token call should not have been made for a successful refresh
                expect(cancelRefreshTokenFunction.callCount).to.eql(0);
                expect(request.headers.get('Authorization')).to.eql('Bearer some-refreshed-access-token');
            });
        });

        describe('when token refresh fails', function () {
            before(function (done) {
                // Refresh token call errors out
                refreshTokenFunction = sinon.fake.rejects(new Error('Access token missing from response'));
                cancelRefreshTokenFunction = sinon.fake();

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
                            refreshToken: refreshTokenFunction,
                            cancelRefresh: cancelRefreshTokenFunction
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
                expect(cancelRefreshTokenFunction.callCount).to.eql(0);
                expect(request.headers.get('Authorization')).to.eql('Bearer some-access-token');
            });
        });

        describe('when token refresh times out', function () {
            before(function (done) {
                // this function will delay the refresh token call for 3 seconds
                refreshTokenFunction = sinon.fake(async function () {
                    await delay(3000);
                });
                cancelRefreshTokenFunction = sinon.fake();


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
                            // Set timeout to 1500 ms to ensure that the refresh token call times out
                            timeout: 1500,
                            refreshToken: refreshTokenFunction,
                            cancelRefresh: cancelRefreshTokenFunction
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

                // The refresh token call should have been cancelled
                expect(cancelRefreshTokenFunction.callCount).to.eql(1);
                expect(request.headers.get('Authorization')).to.eql('Bearer some-access-token');
            });
        });
    });
});
