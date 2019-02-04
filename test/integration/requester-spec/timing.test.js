var expect = require('chai').expect;

describe('Requester Spec: timing', function () {
    var testrun,
        URL = 'http://postman-echo.com/get',
        collection = {
            item: [{
                request: {
                    url: URL,
                    method: 'GET'
                }
            }]
        };

    describe('with time: undefined', function () {
        before(function (done) {
            this.run({
                collection: collection
            }, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        it('should include timing information by default', function () {
            var response = testrun.response.getCall(0).args[2];

            expect(response).to.have.property('timingStart');
            expect(response).to.have.property('timings');
            expect(response).to.have.property('timingPhases');
        });
    });

    describe('with time: true', function () {
        before(function (done) {
            this.run({
                requester: {
                    time: true
                },
                collection: collection
            }, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        it('should include timing information', function () {
            var response = testrun.response.getCall(0).args[2];

            expect(response).to.have.property('timingStart');
            expect(response).to.have.property('timings');
            expect(response).to.have.property('timingPhases');
        });
    });

    describe('with time: false', function () {
        before(function (done) {
            this.run({
                requester: {
                    time: false
                },
                collection: collection
            }, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        it('should not include timing information', function () {
            var response = testrun.response.getCall(0).args[2];

            expect(response).to.not.have.property('timingStart');
            expect(response).to.not.have.property('timings');
            expect(response).to.not.have.property('timingPhases');
        });
    });
});
