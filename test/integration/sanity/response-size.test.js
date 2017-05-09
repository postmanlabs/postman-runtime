describe('response size', function() {
    var testrun;

    before(function(done) {
        this.run({
            collection: {
                item: [{
                    request: 'https://postman-echo.com/get'
                }, {
                    request: 'https://google.com/'
                }]
            }
        }, function(err, results) {
            testrun = results;
            done(err);
        });
    });

    it('must have extracted response size correctly', function() {
        expect(testrun).be.ok();
        expect(testrun.request.calledTwice).be.ok();

        expect(testrun.request.firstCall.args[0]).to.be(null);
        expect(testrun.request.secondCall.args[0]).to.be(null);

        var firstResponseSize = testrun.request.getCall(0).args[2].size(),
            secondResponseSize = testrun.request.getCall(1).args[2].size();

        expect(firstResponseSize.body).to.be.greaterThan(0);
        expect(firstResponseSize.header).to.be.greaterThan(0);
        expect(firstResponseSize.total).to.eql(firstResponseSize.body + firstResponseSize.header);

        expect(secondResponseSize.body).to.be.greaterThan(0);
        expect(secondResponseSize.header).to.be.greaterThan(0);
        expect(secondResponseSize.total).to.eql(secondResponseSize.body + secondResponseSize.header);
    });

    it('must have completed the run', function() {
        expect(testrun).be.ok();
        expect(testrun.done.calledOnce).be.ok();
        expect(testrun.done.getCall(0).args[0]).to.be(null);
        expect(testrun.start.calledOnce).be.ok();
    });
});
