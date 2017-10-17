describe('Events', function () {
    var testRun;

    describe('in request level', function () {
        before(function (done) {
            var runOptions = {
                collection: {
                    item: {
                        event: [{
                            listen: 'prerequest',
                            script: {exec: 'console.log("request level script")'}
                        }],
                        request: 'https://postman-echo.com/get'
                    }
                }
            };


            // perform the collection run
            this.run(runOptions, function (err, results) {
                testRun = results;
                done(err);
            });
        });

        it('must have completed the run', function () {
            expect(testRun).be.ok();
            expect(testRun.done.callCount).to.be(1);
            testRun.done.getCall(0).args[0] && console.error(testRun.done.getCall(0).args[0].stack);
            expect(testRun.done.getCall(0).args[0]).to.be(null);
            expect(testRun.start.callCount).to.be(1);
        });

        it('must have executed the event once', function () {
            expect(testRun.prerequest.callCount).to.be(1);
            expect(testRun.console.callCount).to.be(1);
            expect(testRun.console.firstCall.args[2]).to.be('request level script');
        });
    });

    describe('in item group level', function () {
        before(function (done) {
            var runOptions = {
                collection: {
                    item: [{
                        event: [{
                            listen: 'prerequest',
                            script: {exec: 'console.log("folder level script")'}
                        }],
                        item: {
                            request: 'https://postman-echo.com/get'
                        }
                    }]
                }
            };

            // perform the collection run
            this.run(runOptions, function (err, results) {
                testRun = results;
                done(err);
            });
        });

        it('must have completed the run', function () {
            expect(testRun).be.ok();
            expect(testRun.done.callCount).to.be(1);
            testRun.done.getCall(0).args[0] && console.error(testRun.done.getCall(0).args[0].stack);
            expect(testRun.done.getCall(0).args[0]).to.be(null);
            expect(testRun.start.callCount).to.be(1);
        });

        it('must have executed the event once', function () {
            expect(testRun.prerequest.callCount).to.be(1);
            expect(testRun.console.callCount).to.be(1);
            expect(testRun.console.firstCall.args[2]).to.be('folder level script');
        });
    });

    describe('in collection level', function () {
        before(function (done) {
            var runOptions = {
                collection: {
                    event: [{
                        listen: 'prerequest',
                        script: {exec: 'console.log("collection level script")'}
                    }],
                    item: {
                        request: 'https://postman-echo.com'
                    }
                }
            };

            // perform the collection run
            this.run(runOptions, function (err, results) {
                testRun = results;
                done(err);
            });
        });

        it('must have completed the run', function () {
            expect(testRun).be.ok();
            expect(testRun.done.callCount).to.be(1);
            testRun.done.getCall(0).args[0] && console.error(testRun.done.getCall(0).args[0].stack);
            expect(testRun.done.getCall(0).args[0]).to.be(null);
            expect(testRun.start.callCount).to.be(1);
        });

        it('must have executed the event once', function () {
            expect(testRun.prerequest.callCount).to.be(1);
            expect(testRun.console.callCount).to.be(1);
            expect(testRun.console.firstCall.args[2]).to.be('collection level script');
        });
    });

    describe('in collection and request level', function () {
        before(function (done) {
            var runOptions = {
                collection: {
                    event: [
                        {
                            listen: 'prerequest',
                            script: {exec: 'console.log("collection level script 1")'}
                        },
                        {
                            listen: 'prerequest',
                            script: {exec: 'console.log("collection level script 2")'}
                        }
                    ],
                    item: {
                        event: [{
                            listen: 'prerequest',
                            script: {exec: 'console.log("request level script")'}
                        }],
                        request: 'https://postman-echo.com/get'
                    }
                }
            };

            // perform the collection run
            this.run(runOptions, function (err, results) {
                testRun = results;
                done(err);
            });
        });

        it('must have completed the run', function () {
            expect(testRun).be.ok();
            expect(testRun.done.callCount).to.be(1);
            testRun.done.getCall(0).args[0] && console.error(testRun.done.getCall(0).args[0].stack);
            expect(testRun.done.getCall(0).args[0]).to.be(null);
            expect(testRun.start.callCount).to.be(1);
        });

        it('must have executed all the events, and called prerequest callback once', function () {
            expect(testRun.prerequest.callCount).to.be(1);
            expect(testRun.console.callCount).to.be(3);

            // test for order as well
            expect(testRun.console.firstCall.args[2]).to.be('collection level script 1');
            expect(testRun.console.secondCall.args[2]).to.be('collection level script 2');
            expect(testRun.console.thirdCall.args[2]).to.be('request level script');
        });
    });

    describe('in collection and item group level', function () {
        before(function (done) {
            var runOptions = {
                collection: {
                    event: [{
                        listen: 'prerequest',
                        script: {exec: 'console.log("collection level script")'}
                    }],
                    item: [{
                        event: [{
                            listen: 'prerequest',
                            script: {exec: 'console.log("folder level script")'}
                        }],
                        item: {
                            request: 'https://postman-echo.com/get'
                        }
                    }]
                }
            };

            // perform the collection run
            this.run(runOptions, function (err, results) {
                testRun = results;
                done(err);
            });
        });

        it('must have completed the run', function () {
            expect(testRun).be.ok();
            expect(testRun.done.callCount).to.be(1);
            testRun.done.getCall(0).args[0] && console.error(testRun.done.getCall(0).args[0].stack);
            expect(testRun.done.getCall(0).args[0]).to.be(null);
            expect(testRun.start.callCount).to.be(1);
        });

        it('must have executed all the events, and called prerequest callback once', function () {
            expect(testRun.prerequest.callCount).to.be(1);
            expect(testRun.console.callCount).to.be(2);

            // test for order as well
            expect(testRun.console.firstCall.args[2]).to.be('collection level script');
            expect(testRun.console.secondCall.args[2]).to.be('folder level script');
        });
    });
});
