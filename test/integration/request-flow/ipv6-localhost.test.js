var expect = require('chai').expect;

// IPv6 is disabled on Travis
// eslint-disable-next-line no-process-env
(process.env.TRAVIS || typeof window !== 'undefined' ? describe.skip : describe)('IPv6 server', function () {
    var testrun;

    before(function (done) {
        this.run({
            collection: {
                item: [{
                    request: global.servers.httpIPv6
                }]
            }
        }, function (err, result) {
            testrun = result;
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

    it('should be able to connect', function () {
        var response = testrun.response.getCall(0).args[2];

        expect(response.text()).to.equal('Okay!');
    });
});
