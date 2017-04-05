describe('redirects', function() {
    var testrun;

    before(function(done) {
        this.run({
            requester: {followRedirects: false},
            collection: {
                item: [{
                    request: 'https://postman-echo.com/redirect-to?url=https://postman-echo.com/get'
                }]
            }
        }, function(err, results) {
            testrun = results;
            done(err);
        });
    });

    it('must have sent the request successfully', function() {
        expect(testrun).be.ok();
        expect(testrun.request.calledOnce).be.ok();

        expect(testrun.request.getCall(0).args[0]).to.be(null);
    });

    it('must not have followed the redirect', function() {
        var response = testrun.request.getCall(0).args[2];

        expect(response.code).to.eql(302);
    });

    it('must have completed the run', function() {
        expect(testrun).be.ok();
        expect(testrun.done.calledOnce).be.ok();
        expect(testrun.done.getCall(0).args[0]).to.be(null);
        expect(testrun.start.calledOnce).be.ok();
    });
});
