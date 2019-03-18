var expect = require('chai').expect;

describe('Requester Spec: timings', function () {
    var testrun,
        URL = 'https://postman-echo.com/get',
        collection = {
            item: [{
                request: {
                    url: URL,
                    method: 'GET'
                }
            }]
        };

    describe('with timings: undefined', function () {
        before(function (done) {
            this.run({
                collection: collection
            }, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        it('should include timing information by default', function () {
            var response = testrun.response.getCall(0).args[2],
                history = testrun.request.getCall(0).args[6],
                timings;

            expect(history).to.have.property('execution').that.include.property('data');
            timings = history.execution.data[0].timings;

            expect(response).to.have.property('responseTime');
            expect(timings).to.be.an('object').that.has.all.keys(['start', 'requestStart', 'offset']);
            expect(timings.offset).to.be.an('object').that.includes.all.keys([
                'request',
                'socket',
                'lookup',
                'connect',
                'secureConnect',
                'response',
                'end',
                'done'
            ]);
            expect(response.responseTime).to
                .equal(Math.ceil(timings.offset.end - timings.offset.request));
        });
    });

    describe('with timings: true', function () {
        before(function (done) {
            this.run({
                requester: {
                    timings: true
                },
                collection: collection
            }, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        it('should include timing information', function () {
            var response = testrun.response.getCall(0).args[2],
                history = testrun.response.getCall(0).args[6],
                timings;

            expect(history).to.have.property('execution').that.include.property('data');
            timings = history.execution.data[0].timings;

            expect(response).to.have.property('responseTime');
            expect(timings).to.be.an('object').that.has.all.keys(['start', 'requestStart', 'offset']);
            expect(timings.offset).to.be.an('object').that.includes.all.keys([
                'request',
                'socket',
                'lookup',
                'connect',
                'secureConnect',
                'response',
                'end',
                'done'
            ]);
        });
    });

    describe('with timings: false', function () {
        before(function (done) {
            this.run({
                requester: {
                    timings: false
                },
                collection: collection
            }, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        it('should not include timing information', function () {
            var response = testrun.response.getCall(0).args[2];

            expect(response).to.not.have.property('timings');
        });
    });
});
