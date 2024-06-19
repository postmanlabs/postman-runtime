var expect = require('chai').expect;

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
                                later = now + 200;
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
                    script: 2000
                }
            }, function (err, results) {
                // @todo fix multiple callbacks
                !testrun && (testrun = results) && done(err);
            });
        });

        it('should have completed the run', function () {
            expect(testrun).to.be.ok;
            expect(testrun.done.firstCall.args[0]).to.not.be.ok;
            expect(testrun).to.nested.include({
                'done.callCount': 1,
                'start.callCount': 1
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
            expect(testrun).to.be.ok;
            expect(testrun.done.firstCall.args[0]).to.not.be.ok;
            expect(testrun).to.nested.include({
                'done.callCount': 1,
                'start.callCount': 1
            });
        });

        it('should handle script timeouts correctly', function () {
            expect(testrun).to.be.ok;
            expect(testrun).to.have.property('prerequest').that.nested.include({
                callCount: 1,
                'firstCall.args[0]': null
            });
            expect(testrun).to.have.nested.property('prerequest.firstCall.args[2][0]').that.not.have.property('error');
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
                                        later = now + 1200;
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
                        global: 1000
                    }
                }, function (err, results) {
                    // @todo fix multiple callbacks
                    !testrun && (testrun = results) && done(err);
                });
            });

            it('should completed the run', function () {
                expect(testrun).to.be.ok;
                // expect(testrun.done.callCount).to.be(1); // @todo this is coming 2
                expect(testrun).to.nested.include({
                    'start.callCount': 1
                });

                var err = testrun.done.firstCall.args[0];

                expect(err).to.be.ok;
                expect(err).to.have.property('message', 'callback timed out');
            });

            // @todo ensure prerequest callback is called on timeout
            it.skip('should handle script timeouts correctly', function (done) {
                // @todo done callback is called before the actual script execution timeout
                setTimeout(function () {
                    expect(testrun).to.be.ok;
                    expect(testrun).to.have.property('prerequest').that.nested.include({
                        callCount: 1,
                        'firstCall.args[0]': null,
                        'firstCall.args[2][0].error.message': 'sandbox: synchronous script execution timeout.'
                    });
                    done();
                }, 3000);
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
                    },
                    __disposeTimeout: 2000 // don't dispose sandbox in bootstrap.js immediately
                }, function (err, results) {
                    !testrun && (testrun = results) && done(err);
                });
            });

            it('should completed the run', function () {
                expect(testrun).to.be.ok;
                expect(testrun).to.nested.include({
                    'done.callCount': 1,
                    'start.callCount': 1
                });
            });

            it('should handle script timeouts correctly', function () {
                expect(testrun).to.be.ok;
                expect(testrun).to.have.property('prerequest').that.nested.include({
                    callCount: 1,
                    'firstCall.args[0]': null,
                    'firstCall.args[2][0].error.message': 'sandbox not responding'
                });
            });
        });
    });
});
