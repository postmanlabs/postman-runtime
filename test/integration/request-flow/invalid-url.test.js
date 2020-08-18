var expect = require('chai').expect,
    sinon = require('sinon');

(typeof window === 'undefined' ? describe : describe.skip)('invalid url', function () {
    describe('with useWhatWGUrlParser: true', function () {
        var testrun;

        before(function (done) {
            this.run({
                collection: {
                    item: [{
                        request: {
                            url: '!http://postman-echo.com',
                            method: 'GET'
                        }
                    }, {
                        request: {
                            url: '→ https://postman-echo.com',
                            method: 'GET'
                        }
                    }]
                },
                requester: {
                    useWhatWGUrlParser: true
                }
            }, function (err, result) {
                testrun = result;
                done(err);
            });
        });

        it('should complete the run', function () {
            expect(testrun).to.be.ok;
            sinon.assert.calledOnce(testrun.start);
            sinon.assert.calledOnce(testrun.done);
            sinon.assert.calledWith(testrun.done.getCall(0), null);
        });

        it('should handle invalid url correctly', function () {
            sinon.assert.calledTwice(testrun.request);
            sinon.assert.calledTwice(testrun.response);

            expect(testrun.request.getCall(0).args[0].message).to.equal('Invalid protocol: !http:');
            expect(testrun.request.getCall(1).args[0].message).to.equal('Invalid protocol: → https:');
        });
    });

    describe('with useWhatWGUrlParser: false', function () {
        var testrun;

        before(function (done) {
            this.run({
                collection: {
                    item: [{
                        request: {
                            url: '!http://postman-echo.com',
                            method: 'GET'
                        }
                    }, {
                        request: {
                            url: '→ https://postman-echo.com',
                            method: 'GET'
                        }
                    }]
                },
                requester: {
                    useWhatWGUrlParser: false
                }
            }, function (err, result) {
                testrun = result;
                done(err);
            });
        });

        it('should complete the run', function () {
            expect(testrun).to.be.ok;
            sinon.assert.calledOnce(testrun.start);
            sinon.assert.calledOnce(testrun.done);
            sinon.assert.calledWith(testrun.done.getCall(0), null);
        });

        it('should handle invalid url correctly', function () {
            sinon.assert.calledTwice(testrun.request);
            sinon.assert.calledTwice(testrun.response);

            expect(testrun.request.getCall(0).args[0].message).to.equal('Invalid URI "!http://postman-echo.com"');
            expect(testrun.request.getCall(1).args[0].message).to.equal('Invalid URI "→%20https://postman-echo.com"');
        });
    });
});
