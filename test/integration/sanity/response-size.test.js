var expect = require('chai').expect;

describe('response size', function () {
    var testrun;

    before(function (done) {
        this.run({
            collection: {
                item: [{
                    request: 'https://postman-echo.com/get'
                }, {
                    request: 'https://google.com/'
                }]
            }
        }, function (err, results) {
            testrun = results;
            done(err);
        });
    });

    it('should have extracted response size correctly', function () {
        expect(testrun).to.be.ok;
        expect(testrun).to.nested.include({
            'request.calledTwice': true
        });

        expect(testrun).to.have.property('request').that.nested.include({
            'firstCall.args[0]': null,
            'secondCall.args[0]': null
        });

        var firstResponseSize = testrun.request.getCall(0).args[2].size(),
            secondResponseSize = testrun.request.getCall(1).args[2].size();

        expect(firstResponseSize.body).to.be.greaterThan(0);
        expect(firstResponseSize.header).to.be.greaterThan(0);
        expect(firstResponseSize).to.deep.include({
            total: firstResponseSize.body + firstResponseSize.header
        });

        expect(secondResponseSize.body).to.be.greaterThan(0);
        expect(secondResponseSize.header).to.be.greaterThan(0);
        expect(secondResponseSize).to.deep.include({
            total: secondResponseSize.body + secondResponseSize.header
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
