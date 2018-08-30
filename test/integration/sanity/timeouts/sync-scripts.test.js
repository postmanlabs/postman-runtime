describe('synchronous script timeouts', function () {
    describe('not breached', function () {
        var testrun;

        before(function (done) {
            this.run({
                collection: {
                    item: [{
                        event: [{
                            listen: 'prerequest',
                            script: `
                            var now = Date.now(),
                                later = now + 300;
                            while(Date.now() < later);
                        `
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
                // @todo fix multiple callbacks
                !testrun && (testrun = results) && done(err);
            });
        });

        it('should have completed the run', function () {
            expect(testrun).to.be.ok();
            expect(testrun.done.callCount).to.be(1);
            expect(testrun.done.firstCall.args[0]).to.not.be.ok();
            expect(testrun.start.callCount).to.be(1);
        });

        it('should handle script timeouts correctly', function () {
            expect(testrun.prerequest.callCount).to.be(1);
            expect(testrun.prerequest.firstCall.args[0]).to.be(null);
            expect(testrun.prerequest.firstCall.args[2][0]).to.not.have.property('error');
        });
    });

    describe('not breached with infinite timeout', function () {
        var testrun;

        before(function (done) {
            this.run({
                collection: {
                    item: [{
                        event: [{
                            listen: 'prerequest',
                            script: `
                            var now = Date.now(),
                                later = now + 300;
                            while(Date.now() < later);
                        `
                        }],
                        request: {
                            url: 'https://postman-echo.com/get',
                            method: 'GET'
                        }
                    }]
                },
                timeout: {
                    script: 0
                }
            }, function (err, results) {
                // @todo fix multiple callbacks
                !testrun && (testrun = results) && done(err);
            });
        });

        it('should completed the run', function () {
            expect(testrun).to.be.ok();
            expect(testrun.done.callCount).to.be(1);
            expect(testrun.done.firstCall.args[0]).to.not.be.ok();
            expect(testrun.start.callCount).to.be(1);
        });

        it('should handle script timeouts correctly', function () {
            expect(testrun.prerequest.callCount).to.be(1);
            expect(testrun.prerequest.firstCall.args[0]).to.be(null);
            expect(testrun.prerequest.firstCall.args[2][0]).to.not.have.property('error');
        });
    });

    describe('breached', function () {
        describe('global timeout', function () {
            var testrun;

            before(function (done) {
                this.run({
                    collection: {
                        item: [{
                            event: [{
                                listen: 'prerequest',
                                script: `
                                    var now = Date.now(),
                                        later = now + 600;
                                    while(Date.now() < later);
                                `
                            }],
                            request: {
                                url: 'https://postman-echo.com/get',
                                method: 'GET'
                            }
                        }]
                    },
                    timeout: {
                        global: 500
                    }
                }, function (err, results) {
                    // @todo fix multiple callbacks
                    !testrun && (testrun = results) && done(err);
                });
            });

            it('should throw an error because of timeout', function () {
                expect(testrun).to.be.ok();
                // @todo enable these checks
                // expect(testrun.prerequest.callCount).to.be(1); // this is coming 0
                // expect(testrun.done.callCount).to.be(1); // this is coming 2

                var err = testrun.done.firstCall.args[0],
                    knownErrMsg = ['Script execution timed out.', 'callback timed out'];

                expect(err).to.be.ok();
                expect(err).to.have.property('message');
                expect(knownErrMsg).to.contain(err.message);
            });
        });

        describe('script timeout', function () {
            var testrun;

            before(function (done) {
                this.run({
                    collection: {
                        item: [{
                            event: [{
                                listen: 'prerequest',
                                script: `
                                    var now = Date.now(),
                                        later = now + 1000;
                                    while(Date.now() < later);
                                `
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
                    // @todo fix multiple callbacks
                    !testrun && (testrun = results) && done(err);
                });
            });

            it('should have completed the run', function () {
                expect(testrun).to.be.ok();
                expect(testrun.done.callCount).to.be(1);
                expect(testrun.start.callCount).to.be(1);

                var err = testrun.done.firstCall.args[0],
                    knownErrMsg = ['Script execution timed out.', 'callback timed out'];

                expect(err).to.be.ok();
                expect(err).to.have.property('message');
                expect(knownErrMsg).to.contain(err.message);
            });

            it('should handle script timeouts correctly', function () {
                expect(testrun).to.be.ok();
                expect(testrun.prerequest.callCount).to.be(1);

                expect(testrun.prerequest.firstCall.args[0]).to.be(null);
                expect(testrun.prerequest.firstCall.args[2][0].error).to.have.property('message',
                    'sandbox: synchronous script execution timeout');
            });
        });
    });
});
