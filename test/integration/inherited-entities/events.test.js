var expect = require('chai').expect;

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

        it('should have completed the run', function () {
            expect(testRun).to.be.ok;
            expect(testRun).to.nested.include({
                'done.callCount': 1
            });
            testRun.done.getCall(0).args[0] && console.error(testRun.done.getCall(0).args[0].stack);
            expect(testRun.done.getCall(0).args[0]).to.be.null;
            expect(testRun).to.nested.include({
                'start.callCount': 1
            });
        });

        it('should have executed the event once', function () {
            expect(testRun).to.nested.include({
                'prerequest.callCount': 1,
                'test.callCount': 1,
                'console.callCount': 2
            });
            expect(testRun).to.have.property('console').that.nested.include({
                'firstCall.args[2]': 'request level prerequest script',
                'secondCall.args[2]': 'request level test script'
            });
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

        it('should have completed the run', function () {
            expect(testRun).to.be.ok;
            expect(testRun).to.nested.include({
                'done.callCount': 1
            });
            testRun.done.getCall(0).args[0] && console.error(testRun.done.getCall(0).args[0].stack);
            expect(testRun.done.getCall(0).args[0]).to.be.null;
            expect(testRun).to.nested.include({
                'start.callCount': 1
            });
        });

        it('should have executed the event once', function () {
            expect(testRun).to.nested.include({
                'prerequest.callCount': 1,
                'test.callCount': 1,
                'console.callCount': 2
            });
            expect(testRun).to.have.property('console').that.nested.include({
                'firstCall.args[2]': 'folder level prerequest script',
                'secondCall.args[2]': 'folder level test script'
            });
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

        it('should have completed the run', function () {
            expect(testRun).to.be.ok;
            expect(testRun).to.nested.include({
                'done.callCount': 1
            });
            testRun.done.getCall(0).args[0] && console.error(testRun.done.getCall(0).args[0].stack);
            expect(testRun.done.getCall(0).args[0]).to.be.null;
            expect(testRun).to.nested.include({
                'start.callCount': 1
            });
        });

        it('should have executed the event once', function () {
            expect(testRun).to.nested.include({
                'prerequest.callCount': 1,
                'test.callCount': 1,
                'console.callCount': 2
            });
            expect(testRun).to.have.property('console').that.nested.include({
                'firstCall.args[2]': 'collection level prerequest script',
                'secondCall.args[2]': 'collection level test script'
            });
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

        it('should have completed the run', function () {
            expect(testRun).to.be.ok;
            expect(testRun).to.nested.include({
                'done.callCount': 1
            });
            testRun.done.getCall(0).args[0] && console.error(testRun.done.getCall(0).args[0].stack);
            expect(testRun.done.getCall(0).args[0]).to.be.null;
            expect(testRun).to.nested.include({
                'start.callCount': 1
            });
        });

        it('should have executed all the events, and called prerequest callback once', function () {
            expect(testRun).to.nested.include({
                'prerequest.callCount': 1,
                'test.callCount': 1,
                'console.callCount': 5
            });

            // test for order as well
            expect(testRun).to.have.property('console').that.nested.include({
                'firstCall.args[2]': 'collection level prerequest script 1',
                'secondCall.args[2]': 'collection level prerequest script 2',
                'thirdCall.args[2]': 'request level prerequest script'
            });
            expect(testRun.console.getCall(3).args[2]).to.equal('collection level test script');
            expect(testRun.console.getCall(4).args[2]).to.equal('request level test script');
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

        it('should have completed the run', function () {
            expect(testRun).to.be.ok;
            expect(testRun).to.nested.include({
                'done.callCount': 1
            });
            testRun.done.getCall(0).args[0] && console.error(testRun.done.getCall(0).args[0].stack);
            expect(testRun.done.getCall(0).args[0]).to.be.null;
            expect(testRun).to.nested.include({
                'start.callCount': 1
            });
        });

        it('should have executed all the events, and called prerequest callback once', function () {
            expect(testRun).to.nested.include({
                'prerequest.callCount': 1,
                'test.callCount': 1,
                'console.callCount': 4
            });

            // test for order as well
            expect(testRun).to.have.property('console').that.nested.include({
                'firstCall.args[2]': 'collection level prerequest script',
                'secondCall.args[2]': 'folder level prerequest script'
            });
            expect(testRun.console.getCall(2).args[2]).to.equal('collection level test script');
            expect(testRun.console.getCall(3).args[2]).to.equal('folder level test script');
        });
    });
});
