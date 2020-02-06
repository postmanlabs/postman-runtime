var expect = require('chai').expect;

describe('Brotli encoding', function () {
    var testrun;

    before(function (done) {
        this.run({
            collection: {
                item: [{
                    request: 'https://httpbin.org/brotli'
                }]
            }
        }, function (err, results) {
            testrun = results;
            done(err);
        });
    });

    it('should have completed the run', function () {
        expect(testrun).to.be.ok;
        expect(testrun.done.getCall(0).args[0]).to.be.null;
        expect(testrun).to.nested.include({
            'done.calledOnce': true,
            'start.calledOnce': true
        });
    });

    it('should have sent the request successfully', function () {
        expect(testrun).to.be.ok;
        expect(testrun).to.nested.include({
            'request.calledOnce': true
        });

        expect(testrun.request.getCall(0).args[0]).to.be.null;
    });

    it('should have decoded the brotli response', function () {
        var response = testrun.request.getCall(0).args[2];

        expect(response).to.have.property('code', 200);
        expect(response.headers.has('content-encoding', 'br')).to.be.true;
        expect(response.json()).to.have.property('brotli', true);
    });
});
