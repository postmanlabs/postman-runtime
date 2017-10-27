describe('Events', function () {
    var testRun;

    describe('in request level', function () {
        before(function (done) {
            var runOptions = {
                collection: {
                    item: {
                        event: [
                            {
                                listen: 'prerequest',
                                script: {exec: 'console.log("request level prerequest script")'}
                            }, {
                                listen: 'test',
                                script: {exec: 'console.log("request level test script")'}
                            }
                        ],
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
            expect(testRun.test.callCount).to.be(1);
            expect(testRun.console.callCount).to.be(2);
            expect(testRun.console.firstCall.args[2]).to.be('request level prerequest script');
            expect(testRun.console.secondCall.args[2]).to.be('request level test script');
        });
    });

    describe('in item group level', function () {
        before(function (done) {
            var runOptions = {
                collection: {
                    item: [{
                        event: [
                            {
                                listen: 'prerequest',
                                script: {exec: 'console.log("folder level prerequest script")'}
                            },
                            {
                                listen: 'test',
                                script: {exec: 'console.log("folder level test script")'}
                            }
                        ],
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
            expect(testRun.test.callCount).to.be(1);
            expect(testRun.console.callCount).to.be(2);
            expect(testRun.console.firstCall.args[2]).to.be('folder level prerequest script');
            expect(testRun.console.secondCall.args[2]).to.be('folder level test script');
        });
    });

    describe('in collection level', function () {
        before(function (done) {
            var runOptions = {
                collection: {
                    event: [
                        {
                            listen: 'prerequest',
                            script: {exec: 'console.log("collection level prerequest script")'}
                        },
                        {
                            listen: 'test',
                            script: {exec: 'console.log("collection level test script")'}
                        }
                    ],
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
            expect(testRun.test.callCount).to.be(1);
            expect(testRun.console.callCount).to.be(2);
            expect(testRun.console.firstCall.args[2]).to.be('collection level prerequest script');
            expect(testRun.console.secondCall.args[2]).to.be('collection level test script');
        });
    });

    describe('in collection and request level', function () {
        before(function (done) {
            var runOptions = {
                collection: {
                    event: [
                        {
                            listen: 'prerequest',
                            script: {exec: 'console.log("collection level prerequest script 1")'}
                        },
                        {
                            listen: 'prerequest',
                            script: {exec: 'console.log("collection level prerequest script 2")'}
                        },
                        {
                            listen: 'test',
                            script: {exec: 'console.log("collection level test script")'}
                        }
                    ],
                    item: {
                        event: [
                            {
                                listen: 'prerequest',
                                script: {exec: 'console.log("request level prerequest script")'}
                            },
                            {
                                listen: 'test',
                                script: {exec: 'console.log("request level test script")'}
                            }
                        ],
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
            expect(testRun.test.callCount).to.be(1);
            expect(testRun.console.callCount).to.be(5);

            // test for order as well
            expect(testRun.console.firstCall.args[2]).to.be('collection level prerequest script 1');
            expect(testRun.console.secondCall.args[2]).to.be('collection level prerequest script 2');
            expect(testRun.console.thirdCall.args[2]).to.be('request level prerequest script');
            expect(testRun.console.getCall(3).args[2]).to.be('collection level test script');
            expect(testRun.console.getCall(4).args[2]).to.be('request level test script');
        });
    });

    describe('in collection and item group level', function () {
        before(function (done) {
            var runOptions = {
                collection: {
                    event: [
                        {
                            listen: 'prerequest',
                            script: {exec: 'console.log("collection level prerequest script")'}
                        },
                        {
                            listen: 'test',
                            script: {exec: 'console.log("collection level test script")'}
                        }
                    ],
                    item: [{
                        event: [
                            {
                                listen: 'prerequest',
                                script: {exec: 'console.log("folder level prerequest script")'}
                            },
                            {
                                listen: 'test',
                                script: {exec: 'console.log("folder level test script")'}
                            }
                        ],
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
            expect(testRun.test.callCount).to.be(1);
            expect(testRun.console.callCount).to.be(4);

            // test for order as well
            expect(testRun.console.firstCall.args[2]).to.be('collection level prerequest script');
            expect(testRun.console.secondCall.args[2]).to.be('folder level prerequest script');
            expect(testRun.console.getCall(2).args[2]).to.be('collection level test script');
            expect(testRun.console.getCall(3).args[2]).to.be('folder level test script');
        });
    });
});
