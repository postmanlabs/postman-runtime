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

    it('must be emitted twice', function () {
        expect(testrun.waitStateChange.calledTwice).be.ok();
    });

    it('must be emitted first saying that waiting state starts', function () {
        expect(testrun.waitStateChange.getCall(0).args[2]).be(true);
    });

    it('must send the time for possible next state change after start', function () {
        expect(testrun.waitStateChange.getCall(0).args[3]).be(200);
    });

    it('start delay source must be "item"', function () {
        expect(testrun.waitStateChange.getCall(0).args[4]).be('iteration');
    });

    it('must be emitted second time saying that waiting state ends', function () {
        expect(testrun.waitStateChange.getCall(1).args[2]).be(false);
    });

    it('must send the time for last state change after end', function () {
        expect(testrun.waitStateChange.getCall(1).args[3]).be(200);
    });

    it('end delay source must be "iteration"', function () {
        expect(testrun.waitStateChange.getCall(1).args[4]).be('iteration');
    });
});
