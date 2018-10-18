var expect = require('chai').expect;

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

    it('should handle ECONNREFUSED correctly', function () {
        expect(testrun).to.be.ok;
        expect(_.get(testrun.request.getCall(0).args, '0.code')).to.equal('ECONNREFUSED');
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
