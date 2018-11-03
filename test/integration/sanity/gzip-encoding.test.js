var expect = require('chai').expect;

describe('GZIP encoding', function() {
    var testrun;

    before(function(done) {
        this.run({
            collection: {
                item: [{
                    request: 'https://postman-echo.com/gzip'
                }]
            }
        }, function(err, results) {
            testrun = results;
            done(err);
        });
    });

    it('should have run the test script successfully', function() {
        expect(testrun).to.be.ok;
        expect(testrun).to.nested.include({
            'request.calledOnce': true
        });

        expect(testrun.request.getCall(0).args[0]).to.be.null;

        var response = testrun.request.getCall(0).args[2];
        expect(response).to.have.property('code', 200);
        expect(response.json()).to.have.property('gzipped', true);
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
