var expect = require('chai').expect;

describe('SSL', function () {
    var testrun;

    before(function (done) {
        this.run({
            collection: {
                item: [{
                    request: {
                        url: 'https://expired.badssl.com',
                        method: 'GET'
                    }
                }]
            }
        }, function (err, results) {
            testrun = results;
            done(err);
        });
    });

    it('should handle server side SSL errors correctly correctly', function () {
        expect(testrun).to.be.ok;
        expect(testrun.request.getCall(0)).to.have.nested.property('args[0].code', 'CERT_HAS_EXPIRED');
    });

    it('should have completed the run', function () {
        expect(testrun).to.be.ok;
        expect(testrun.done.getCall(0).args[0]).to.be.null;
        expect(testrun).to.nested.include({
            'done.calledOnce': true,
            'start.calledOnce': true
        });
    });
});
