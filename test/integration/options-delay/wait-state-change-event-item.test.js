var expect = require('chai').expect;

describe('waitStateChange event for item', function () {
    var testrun;

    before(function (done) {
        this.run({
            delay: {item: 200},
            collection: {
                item: {request: 'https://postman-echo.com/get?1'}
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

    it('start delay source must be "item"', function () {
        expect(testrun.waitStateChange.getCall(0).args[4]).to.equal('item');
    });

    it('should be emitted second time saying that waiting state ends', function () {
        expect(testrun.waitStateChange.getCall(1).args[2]).to.be.false;
    });

    it('should send the time for last state change after end', function () {
        expect(testrun.waitStateChange.getCall(1).args[3]).to.equal(200);
    });

    it('end delay source must be "item"', function () {
        expect(testrun.waitStateChange.getCall(1).args[4]).to.equal('item');
    });
});
