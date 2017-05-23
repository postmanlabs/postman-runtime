describe('io event', function () {
    describe('type - http', function () {
        var testrun;

        before(function (done) {
            this.run({
                stopOnFailure: true,
                collection: {
                    item: {
                        request: 'https://postman-echo.com/get'
                    }
                }
            }, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        it('should have sent a request successfully', function () {
            expect(testrun.request.calledOnce).to.be.ok();
            expect(testrun.request.firstCall.args[0]).to.not.be.ok();
        });

        it('should have received a response', function () {
            var response = testrun.request.firstCall.args[2];
            expect(response).to.be.ok();
            expect(response).to.have.property('code', 200);
        });

        it('should have triggered the `io` event successfully', function () {
            expect(testrun.io.calledOnce).to.be.ok();

            expect(testrun.io.firstCall.args[0]).to.not.be.ok();
            expect(testrun.io.firstCall.args[1]).to.be.ok();
            expect(testrun.io.firstCall.args[2]).to.be('http');
        });

        it('should have the correct request & response', function () {
            var response = testrun.request.firstCall.args[2],
                request = testrun.request.firstCall.args[3],
                ioResponse = testrun.io.firstCall.args[3],
                ioRequest = testrun.io.firstCall.args[4];

            expect(ioResponse.toJSON()).to.eql(response.toJSON());
            expect(ioRequest.toJSON()).to.eql(request.toJSON());
        });
    });
});
