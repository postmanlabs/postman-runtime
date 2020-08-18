var _ = require('lodash'),
    expect = require('chai').expect;

(typeof window === 'undefined' ? describe : describe.skip)('multi valued headers', function () {
    var testrun;

    before(function (done) {
        this.run({
            collection: {
                item: {
                    request: global.servers.http + '/multi-valued-headers'
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
            'start.calledOnce': true,
            'done.firstCall.args[0]': null
        });
    });

    it('should receive duplicate headers from the http server', function () {
        var response = testrun.request.getCall(0).args[2];

        // eslint-disable-next-line lodash/prop-shorthand
        expect(_.countBy(response.headers.members, function (header) {
            return header.key;
        })['x-pm-test']).to.equal(2); // The "x-pm-test" header should occur twice
        expect(response.text()).to.equal('Okay!');
    });
});
