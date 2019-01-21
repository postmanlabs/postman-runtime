var expect = require('chai').expect;

describe('waitStateChange event for iteration', function () {
    var testrun;

    before(function (done) {
        this.run({
            delay: {iteration: 200},
            iterationCount: 2,
            collection: {
                item: {request: 'https://postman-echo.com/get'}
            }
        }, function (err, results) {
            testrun = results;
            done(err);
        });
    });

    it('should be emitted twice', function () {
        expect(testrun.waitStateChange.calledTwice).to.be.ok;
    });

    it('should be emitted first saying that waiting state starts', function () {
        expect(testrun.waitStateChange.getCall(0).args[2]).to.be.true;
    });

    it('should send the time for possible next state change after start', function () {
        expect(testrun.waitStateChange.getCall(0).args[3]).to.equal(200);
    });

    it('should have the start delay source as "item"', function () {
        expect(testrun.waitStateChange.getCall(0).args[4]).to.equal('iteration');
    });

    it('should be emitted second time saying that waiting state ends', function () {
        expect(testrun.waitStateChange.getCall(1).args[2]).to.be.false;
    });

    it('should send the time for last state change after end', function () {
        expect(testrun.waitStateChange.getCall(1).args[3]).to.equal(200);
    });

    it('should have the end delay source as "iteration"', function () {
        expect(testrun.waitStateChange.getCall(1).args[4]).to.equal('iteration');
    });
});
