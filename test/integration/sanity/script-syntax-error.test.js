describe('Script syntax error', function () {
    var _ = require('lodash'),
        testrun;

    before(function (done) {
        this.run({
            collection: {
                item: [{
                    event: [{
                        listen: 'prerequest',
                        script: {exec: ['console.log 1']} // deliberate syntax error
                    }, {
                        listen: 'test',
                        script: {exec: ['console.log 1']} // deliberate syntax error
                    }],
                    request: {
                        url: 'https://postman-echo.com/get',
                        method: 'GET'
                    }
                }]
            }
        }, function (err, results) {
            testrun = results;
            done(err);
        });
    });

    it('must handle test script syntax errors correctly', function () {
        var testErr = _.get(testrun.test.getCall(0).args[2], '0.error');

        expect(testErr).to.not.be.empty();
        expect(testErr.type).to.be('Error');
        expect(testErr.name).to.be('SyntaxError');
        expect(testErr.message).to.be('Unexpected number');
    });

    it('must handle prerequest script syntax errors correctly', function () {
        var preReqErr = _.get(testrun.prerequest.getCall(0).args[2], '0.error');

        expect(preReqErr).to.not.be.empty();
        expect(preReqErr.type).to.be('Error');
        expect(preReqErr.name).to.be('SyntaxError');
        expect(preReqErr.message).to.be('Unexpected number');
    });

    it('must have completed the run', function () {
        expect(testrun).be.ok();
        expect(testrun.done.calledOnce).be.ok();
        expect(testrun.done.getCall(0).args[0]).to.be(null);
        expect(testrun.start.calledOnce).be.ok();
    });
});
