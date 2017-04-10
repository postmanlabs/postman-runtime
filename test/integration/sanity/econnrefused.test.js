describe('econnrefused', function () {
    var _ = require('lodash'),
        testrun;

    before(function (done) {
        this.run({
            collection: {
                item: [{
                    request: {
                        url: 'https://localhost:3000/get', // non-active endpoint
                        method: 'GET'
                    }
                }]
            }
        }, function (err, results) {
            testrun = results;
            done(err);
        });
    });

    it('must handle ECONNREFUSED correctly', function () {
        expect(testrun).be.ok();
        expect(_.get(testrun.request.getCall(0).args, '0.code')).to.be('ECONNREFUSED');
    });

    it('must have completed the run', function () {
        expect(testrun).be.ok();
        expect(testrun.done.calledOnce).be.ok();
        expect(testrun.done.getCall(0).args[0]).to.be(null);
        expect(testrun.start.calledOnce).be.ok();
    });
});
