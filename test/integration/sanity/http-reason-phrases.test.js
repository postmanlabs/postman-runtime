var expect = require('chai').expect;

(typeof window === 'undefined' ? describe : describe.skip)('http reasons', function () {
    var testrun;

    before(function (done) {
        this.run({
            collection: {
                item: {
                    request: global.servers.http + '/custom-reason'
                }
            }
        }, function (err, results) {
            testrun = results;
            done(err);
        });
    });

    it('should have started and completed the test run', function () {
        expect(testrun).to.be.ok;
        expect(testrun).to.nested.include({
            'done.calledOnce': true,
            'start.calledOnce': true
        });
    });

    it('should receive the correct reason phrase from the server', function () {
        var response = testrun.request.getCall(0).args[2];

        expect(response).to.deep.include({
            code: 400,
            status: 'Some Custom Reason'
        });
        expect(response.details()).to.deep.include({
            code: 400,
            name: 'Some Custom Reason',
            detail: 'The request cannot be fulfilled due to bad syntax.'
        });
    });
});
