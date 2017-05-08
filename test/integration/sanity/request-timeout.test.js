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
        expect(testrun.request.calledOnce).to.be.ok();

        var err = testrun.request.firstCall.args[0];

        expect(err.code).to.eql('ESOCKETTIMEDOUT');
    });

    it('should call the test event even if the request has timed out', function () {
        expect(testrun.test.calledOnce).to.be.ok();
    });
});
