describe('asynchronous script timeouts', function () {
    var testrun;

    describe('not breached', function () {
        before(function (done) {
            this.run({
                collection: {
                    item: [{
                        event: [{
                            listen: 'prerequest',
                            script: 'setTimeout(function () {}, 0);'
                        }],
                        request: {
                            url: 'https://postman-echo.com/get',
                            method: 'GET'
                        }
                    }]
                },
                timeout: {
                    script: 500
                }
            }, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        it('must have completed the run', function () {
            expect(testrun).be.ok();
            expect(testrun.done.calledOnce).be.ok();
            expect(testrun.done.firstCall.args[0]).to.not.be.ok();
            expect(testrun.start.calledOnce).be.ok();
        });

        it('must handle script timeouts correctly', function () {
            expect(testrun).to.be.ok();
            expect(testrun.prerequest.callCount).to.be(1);

            expect(testrun.prerequest.firstCall.args[0]).to.be(null);
            expect(testrun.prerequest.firstCall.args[2][0]).to.not.have.property('error');
        });
    });

    describe('breached', function () {
        before(function (done) {
            this.run({
                collection: {
                    item: [{
                        event: [{
                            listen: 'prerequest',
                            script: 'setTimeout(function () {}, 2000);'
                        }],
                        request: {
                            url: 'https://postman-echo.com/get',
                            method: 'GET'
                        }
                    }]
                },
                timeout: {
                    script: 500
                }
            }, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        it('must have completed the run', function () {
            expect(testrun).be.ok();
            expect(testrun.done.calledOnce).be.ok();
            expect(testrun.done.firstCall.args[0]).to.not.be.ok();
            expect(testrun.start.calledOnce).be.ok();
        });

        it('must handle script timeouts correctly', function () {
            expect(testrun).to.be.ok();
            expect(testrun.prerequest.callCount).to.be(1);

            expect(testrun.prerequest.firstCall.args[0]).to.be(null);
            expect(testrun.prerequest.firstCall.args[2][0].error).to.have.property('message',
                'sandbox: asynchronous script execution timeout');
        });
    });
});
