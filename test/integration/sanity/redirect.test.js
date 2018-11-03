var expect = require('chai').expect;

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

    it('should have sent the request successfully', function() {
        expect(testrun).to.be.ok;
        expect(testrun).to.nested.include({ // one request
            'request.calledOnce': true
        });

        expect(testrun.request.getCall(0).args[0]).to.be.null;
    });

    it('should not have followed the redirect', function() {
        var response = testrun.request.getCall(0).args[2];

        expect(response).to.have.property('code', 302);
    });

    it('should have completed the run', function() {
        expect(testrun).to.be.ok;
        expect(testrun.done.getCall(0).args[0]).to.be.null;
        expect(testrun).to.nested.include({
            'done.calledOnce': true,
            'start.calledOnce': true
        });
    });
});
