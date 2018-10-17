var expect = require('chai').expect;

describe('request timeout', function () {
    var testrun;

    before(function (done) {
        this.run({
            collection: {
                item: {
                    request: 'https://postman-echo.com/delay/9'
                }
            },
            timeout: {
                request: 300 // ms
            }
        }, function (err, results) {
            testrun = results;
            done(err);
        });
    });

    it('should throw an error because of timeout', function () {
        expect(testrun).to.nested.include({
            'request.calledOnce': true
        });

        var err = testrun.request.firstCall.args[0];

        expect(err).to.have.property('code', 'ESOCKETTIMEDOUT');
    });

    it('should call the test event even if the request has timed out', function () {
        expect(testrun).to.nested.include({
            'test.calledOnce': true
        });
    });
});
