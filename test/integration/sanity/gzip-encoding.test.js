describe('GZIP encoding', function() {
    var testrun;

    before(function(done) {
        this.run({
            collection: {
                item: [{
                    request: 'http://postman-echo.com/gzip'
                }]
            }
        }, function(err, results) {
            testrun = results;
            done(err);
        });
    });

    it('must have run the test script successfully', function() {
        expect(testrun).be.ok();
        expect(testrun.request.calledOnce).be.ok();

        expect(testrun.request.getCall(0).args[0]).to.be(null);

        var response = testrun.request.getCall(0).args[2];
        expect(response.code).to.eql(200);
        expect(response.json()).to.have.property('gzipped', true);
    });

    it('must have completed the run', function() {
        expect(testrun).be.ok();
        expect(testrun.done.calledOnce).be.ok();
        expect(testrun.done.getCall(0).args[0]).to.be(null);
        expect(testrun.start.calledOnce).be.ok();
    });
});
