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

            expect(response).to.include.all.keys('timingStart', 'timings');
            expect(response.timings).to.be.an('object').that.have.all.keys([
                'socket',
                'lookup',
                'connect',
                'response',
                'end'
            ]);
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

            expect(response).to.include.all.keys('timingStart', 'timings');
            expect(response.timings).to.be.an('object').that.have.all.keys([
                'socket',
                'lookup',
                'connect',
                'response',
                'end'
            ]);
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

            expect(response).to.not.include.all.keys('timingStart', 'timings');
        });
    });
});
