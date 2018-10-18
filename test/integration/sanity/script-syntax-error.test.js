var expect = require('chai').expect;

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

    it('should handle test script syntax errors correctly', function () {
        var testErr = _.get(testrun.test.getCall(0).args[2], '0.error');

        expect(testErr).to.not.be.empty;
        expect(testErr).to.deep.include({
            type: 'Error',
            name: 'SyntaxError',
            message: 'Unexpected number'
        });
    });

    it('should handle prerequest script syntax errors correctly', function () {
        var preReqErr = _.get(testrun.prerequest.getCall(0).args[2], '0.error');

        expect(preReqErr).to.not.be.empty;
        expect(preReqErr).to.deep.include({
            type: 'Error',
            name: 'SyntaxError',
            message: 'Unexpected number'
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
});
