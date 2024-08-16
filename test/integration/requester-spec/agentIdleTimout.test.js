var expect = require('chai').expect;

(typeof window === 'undefined' ? describe : describe.skip)('Requester Spec: agentIdleTimeout', function () {
    var testrun,
        URL = 'https://postman-echo.com/get',
        collection = {
            item: [{
                request: {
                    url: URL,
                    method: 'GET'
                }
            }, {
                request: {
                    url: URL,
                    method: 'GET'
                }
            }]
        };

    describe('with no time gap between requests', function () {
        before(function (done) {
            this.run({
                collection
            }, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        it('should have secureConnect time as zero', function () {
            var response = testrun.response.getCall(1).args[2],
                history = testrun.request.getCall(1).args[6],
                timings;

            expect(history).to.have.property('execution').that.include.property('data');
            timings = history.execution.data[0].timings;

            expect(response).to.have.property('responseTime');
            expect(timings.offset.secureConnect - timings.offset.lookup).to.equal(0);
        });
    });
    describe('with time gap greater than agentIdleTimeout between requests', function () {
        before(function (done) {
            const newCollection = JSON.parse(JSON.stringify(collection));

            newCollection.item[1].event = [{
                listen: 'prerequest',
                script: { exec: [
                    'setTimeout(function () {}, 500);'
                ] }
            }];
            this.run({
                collection: newCollection,
                requester: {
                    agentIdleTimeout: 100
                }
            }, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        it('should have secureConnect time greater than zero', function () {
            var response = testrun.response.getCall(1).args[2],
                history = testrun.request.getCall(1).args[6],
                timings;

            expect(history).to.have.property('execution').that.include.property('data');
            timings = history.execution.data[0].timings;

            expect(response).to.have.property('responseTime');
            expect(timings.offset.secureConnect - timings.offset.lookup).greaterThan(0);
        });
    });

    describe('with time gap less than agentIdleTimeout between requests', function () {
        before(function (done) {
            const newCollection = JSON.parse(JSON.stringify(collection));

            newCollection.item[1].event = [{
                listen: 'prerequest',
                script: { exec: [
                    'setTimeout(function () {}, 100);'
                ] }
            }];
            this.run({
                collection: newCollection,
                requester: {
                    agentIdleTimeout: 1000
                }
            }, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        it('should have secureConnect time zero', function () {
            var response = testrun.response.getCall(1).args[2],
                history = testrun.request.getCall(1).args[6],
                timings;

            expect(history).to.have.property('execution').that.include.property('data');
            timings = history.execution.data[0].timings;

            expect(response).to.have.property('responseTime');
            expect(timings.offset.secureConnect - timings.offset.lookup).equal(0);
        });
    });
});
