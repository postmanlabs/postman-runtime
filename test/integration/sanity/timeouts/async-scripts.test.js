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
        describe('script timeout', function () {
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

        describe('global timeout', function () {
            before(function (done) {
                this.run({
                    collection: {
                        item: [{
                            event: [{
                                listen: 'prerequest',
                                script: `
                                    setInterval(function () {
                                        console.log(Date.now())
                                    }, 200)
                                `
                            }],
                            request: {
                                url: 'https://postman-echo.com/get',
                                method: 'GET'
                            }
                        }]
                    },
                    timeout: {
                        global: 2000
                    }
                }, function (err, results) {
                    testrun = results;
                    done(err);
                });
            });

            it('should throw an error because of timeout', function () {
                // prerequest or any other event which was supposed to be called after, won't be called
                expect(testrun.prerequest.calledOnce).to.not.be.ok();
                expect(testrun.done.calledOnce).to.be.ok();

                var err = testrun.done.firstCall.args[0];

                expect(err).to.be.ok();
                expect(err).to.have.property('message', 'callback timed out');
            });

            it('should clear all the timers', function (done) {
                // @todo: done callback is called before the actual script execution timeout
                // so we wait for the sandbox to timeout, before testing the effects of timeout
                setTimeout(function () {
                    var consoleCountsBefore = testrun.console.callCount;
                    setTimeout(function() {
                        expect(testrun.console.callCount).to.be(consoleCountsBefore);
                        done();
                    }, 2000);
                }, 2000);
            });
        });
    });
});
