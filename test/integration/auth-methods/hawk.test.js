var expect = require('chai').expect;

describe('hawk auth', function () {
    describe('without body', function () {
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
                                    app: 'someAppId',
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

        it('should include hawk auth parameters in request header', function () {
            var request = testrun.request.getCall(0).args[3],
                header = request.headers.members[0];

            expect(header).to.have.have.property('key', 'Authorization');
            expect(header).to.have.have.property('value').that.include('Hawk id="dh37fgj492je"');
            expect(header).to.have.have.property('value').that.include('ts=');
            expect(header).to.have.have.property('value').that.include('nonce="eFRP2o"');
            expect(header).to.have.have.property('value').that.include('ext="skjdfklsjhdflkjhsdf"');
            expect(header).to.have.have.property('value').that.include('mac=');
            expect(header).to.have.have.property('value').that.include('app="someAppId"');
        });

        it('should have completed the run', function () {
            expect(testrun).to.be.ok;
            expect(testrun).to.nested.include({
                'done.callCount': 1
            });
            testrun.done.getCall(0).args[0] && console.error(testrun.done.getCall(0).args[0].stack);
            expect(testrun.done.getCall(0).args[0]).to.be.null;
            expect(testrun).to.nested.include({
                'start.callCount': 1
            });
        });

        it('should have sent the request once', function () {
            expect(testrun).to.nested.include({
                'request.callCount': 1
            });

            var request = testrun.request.getCall(0).args[3],
                response = testrun.request.getCall(0).args[2];

            expect(request.url.toString()).to.eql('https://postman-echo.com/auth/hawk');
            expect(response).to.have.property('code', 200);
        });

        it('should have sent one request internally', function () {
            expect(testrun).to.nested.include({
                'io.callCount': 1
            });

            var firstError = testrun.io.firstCall.args[0],
                firstRequest = testrun.io.firstCall.args[4],
                firstResponse = testrun.io.firstCall.args[3];

            expect(firstError).to.be.null;
            expect(firstRequest.url.toString()).to.eql('https://postman-echo.com/auth/hawk');
            expect(firstResponse).to.have.property('code', 200);
        });

        it('should have passed the hawk authorization', function () {
            expect(testrun).to.nested.include({
                'request.callCount': 1
            });

            var request = testrun.request.getCall(0).args[3],
                response = testrun.request.getCall(0).args[2];

            expect(request.url.toString()).to.eql('https://postman-echo.com/auth/hawk');
            expect(response).to.have.property('code', 200);
        });
    });

    describe('with body', function () {
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
                                    app: 'someAppId',
                                    delegation: '',
                                    timestamp: ''
                                }
                            },
                            url: 'https://postman-echo.com/auth/hawk',
                            method: 'GET',
                            body: {
                                'mode': 'raw',
                                'raw': 'Hello World!!'
                            }
                        }
                    }
                }
            }, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        it('should include hawk auth parameters in request header', function () {
            var request = testrun.request.getCall(0).args[3],
                header = request.headers.members[0];

            expect(header).to.have.have.property('key', 'Authorization');
            expect(header).to.have.have.property('value').that.include('Hawk id="dh37fgj492je"');
            expect(header).to.have.have.property('value').that.include('ts=');
            expect(header).to.have.have.property('value').that.include('nonce="eFRP2o"');
            expect(header).to.have.have.property('value').that.include('ext="skjdfklsjhdflkjhsdf"');
            expect(header).to.have.have.property('value').that.include('hash=');
            expect(header).to.have.have.property('value').that.include('mac=');
            expect(header).to.have.have.property('value').that.include('app="someAppId"');
        });

        it('should have completed the run', function () {
            expect(testrun).to.be.ok;
            expect(testrun).to.nested.include({
                'done.callCount': 1
            });
            testrun.done.getCall(0).args[0] && console.error(testrun.done.getCall(0).args[0].stack);
            expect(testrun.done.getCall(0).args[0]).to.be.null;
            expect(testrun).to.nested.include({
                'start.callCount': 1
            });
        });

        it('should have sent the request once', function () {
            expect(testrun).to.nested.include({
                'request.callCount': 1
            });

            var request = testrun.request.getCall(0).args[3],
                response = testrun.request.getCall(0).args[2];

            expect(request.url.toString()).to.eql('https://postman-echo.com/auth/hawk');
            expect(response).to.have.property('code', 200);
        });

        it('should have sent one request internally', function () {
            expect(testrun).to.nested.include({
                'io.callCount': 1
            });

            var firstError = testrun.io.firstCall.args[0],
                firstRequest = testrun.io.firstCall.args[4],
                firstResponse = testrun.io.firstCall.args[3];

            expect(firstError).to.be.null;
            expect(firstRequest.url.toString()).to.eql('https://postman-echo.com/auth/hawk');
            expect(firstResponse).to.have.property('code', 200);
        });

        it('should have passed the hawk authorization', function () {
            expect(testrun).to.nested.include({
                'request.callCount': 1
            });

            var request = testrun.request.getCall(0).args[3],
                response = testrun.request.getCall(0).args[2];

            expect(request.url.toString()).to.eql('https://postman-echo.com/auth/hawk');
            expect(response).to.have.property('code', 200);
        });
    });
});
