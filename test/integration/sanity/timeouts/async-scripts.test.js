var expect = require('chai').expect;

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

        it('should have completed the run', function () {
            expect(testrun).to.be.ok;
            expect(testrun.done.firstCall.args[0]).to.not.be.ok;
            expect(testrun).to.nested.include({
                'done.calledOnce': true,
                'start.calledOnce': true
            });
        });

        it('should handle script timeouts correctly', function () {
            expect(testrun).to.be.ok;
            expect(testrun).to.have.property('prerequest').that.nested.include({
                callCount: 1,
                'firstCall.args[0]': null
            });
            expect(testrun).to.have.nested.property('prerequest.firstCall.args[2][0]')
                .that.does.not.have.property('error');
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

            it('should have completed the run', function () {
                expect(testrun).to.be.ok;
                expect(testrun.done.firstCall.args[0]).to.not.be.ok;
                expect(testrun).to.nested.include({
                    'done.calledOnce': true,
                    'start.calledOnce': true
                });
            });

            it('should handle script timeouts correctly', function () {
                expect(testrun).to.be.ok;
                expect(testrun).to.have.property('prerequest').that.nested.include({
                    callCount: 1,
                    'firstCall.args[0]': null,
                    'firstCall.args[2][0].error.message': 'sandbox: asynchronous script execution timeout'
                });
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
                expect(testrun).to.nested.include({
                    'prerequest.calledOnce': false,
                    'done.calledOnce': true
                });

                var err = testrun.done.firstCall.args[0];

                expect(err).to.be.ok;
                expect(err).to.have.property('message', 'callback timed out');
            });

            it('should clear all the timers', function (done) {
                // @todo: done callback is called before the actual script execution timeout
                // so we wait for the sandbox to timeout, before testing the effects of timeout
                setTimeout(function () {
                    var consoleCountsBefore = testrun.console.callCount;
                    setTimeout(function() {
                        expect(testrun).to.nested.include({
                            'console.callCount': consoleCountsBefore
                        });
                        done();
                    }, 2000);
                }, 2000);
            });
        });
    });
});
