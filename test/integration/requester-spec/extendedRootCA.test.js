var fs = require('fs'),
    path = require('path'),
    expect = require('chai').expect;

(typeof window === 'undefined' ? describe : describe.skip)('Requester Spec: extendedRootCA', function () {
    var testrun,
        CACertPath = path.resolve(__dirname, '../../fixtures/certificates/ca.pem');

    describe('with extendedRootCA', function () {
        before(function (done) {
            this.run({
                fileResolver: fs,
                requester: {
                    extendedRootCA: CACertPath
                },
                collection: {
                    item: [{
                        request: global.servers.https
                    }]
                }
            }, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        it('should complete the run', function () {
            expect(testrun).to.be.ok;
            expect(testrun).to.nested.include({
                'done.calledOnce': true,
                'start.calledOnce': true,
                'request.calledOnce': true
            });
        });

        it('should get the response correctly', function () {
            expect(testrun.response.getCall(0).calledWith(null)).to.be.true;

            var response = testrun.response.getCall(0).args[2];

            expect(response.reason()).to.eql('OK');
            expect(response.text()).to.eql('Okay!');
        });
    });

    describe('with extendedRootCA but different host', function () {
        before(function (done) {
            this.run({
                fileResolver: fs,
                requester: {
                    extendedRootCA: CACertPath
                },
                collection: {
                    item: [{
                        request: 'https://postman-echo.com/get'
                    }]
                }
            }, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        it('should complete the run', function () {
            expect(testrun).to.be.ok;
            expect(testrun).to.nested.include({
                'done.calledOnce': true,
                'start.calledOnce': true,
                'request.calledOnce': true
            });
        });

        it('should not affect the requests to a different host', function () {
            expect(testrun.response.getCall(0).calledWith(null)).to.be.true;

            var response = testrun.response.getCall(0).args[2];

            expect(response.reason()).to.eql('OK');
            expect(response.json()).to.have.property('url', 'https://postman-echo.com/get');
        });
    });

    describe('without extendedRootCA', function () {
        before(function (done) {
            this.run({
                fileResolver: fs,
                collection: {
                    item: [{
                        request: global.servers.https
                    }]
                }
            }, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        it('should complete the run', function () {
            expect(testrun).to.be.ok;
            expect(testrun).to.nested.include({
                'done.calledOnce': true,
                'start.calledOnce': true,
                'request.calledOnce': true
            });
        });

        it('should throw self signed certificate error', function () {
            expect(testrun.response.getCall(0).calledWith(null)).to.be.false;

            var error = testrun.response.getCall(0).args[0],
                response = testrun.response.getCall(0).args[2];

            expect(error).to.be.an('error');
            expect(error.message).to.eql('self signed certificate in certificate chain');
            expect(response).to.be.undefined;
        });
    });

    describe('without fileResolver', function () {
        before(function (done) {
            this.run({
                requester: {
                    extendedRootCA: CACertPath
                },
                collection: {
                    item: [{
                        request: global.servers.https
                    }]
                }
            }, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        it('should complete the run', function () {
            expect(testrun).to.be.ok;
            expect(testrun).to.nested.include({
                'done.calledOnce': true,
                'start.calledOnce': true,
                'request.calledOnce': true
            });
        });

        it('should throw self signed certificate error', function () {
            // @todo it should trigger console error for file load error.
            expect(testrun.response.getCall(0).calledWith(null)).to.be.false;

            var error = testrun.response.getCall(0).args[0],
                response = testrun.response.getCall(0).args[2];

            expect(error).to.be.an('error');
            expect(error.message).to.eql('self signed certificate in certificate chain');
            expect(response).to.be.undefined;
        });
    });
});
