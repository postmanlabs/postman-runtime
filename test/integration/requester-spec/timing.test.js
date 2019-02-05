var expect = require('chai').expect;

describe('Requester Spec: responseTimings', function () {
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

    describe('with responseTimings: undefined', function () {
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
            expect(response.timings).to.have.property('socket');
            expect(response.timings).to.have.property('lookup');
            expect(response.timings).to.have.property('connect');
            expect(response.timings).to.have.property('response');
            expect(response.timings).to.have.property('end');
        });
    });

    describe('with responseTimings: true', function () {
        before(function (done) {
            this.run({
                requester: {
                    responseTimings: true
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
            expect(response.timings).to.have.property('socket');
            expect(response.timings).to.have.property('lookup');
            expect(response.timings).to.have.property('connect');
            expect(response.timings).to.have.property('response');
            expect(response.timings).to.have.property('end');
        });
    });

    describe('with responseTimings: false', function () {
        before(function (done) {
            this.run({
                requester: {
                    responseTimings: false
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
        });
    });
});
