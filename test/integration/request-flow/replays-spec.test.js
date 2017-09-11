var AuthLoader = require('../../../lib/authorizer').AuthLoader;

describe('requests replayed', function () {
    var testrun,
        runOptions = {
            collection: {
                item: [{
                    request: {
                        url: 'https://postman-echo.com/get',
                        auth: {
                            type: 'fake',
                            fake: {}
                        }
                    }
                }]
            },
            authorizer: {
                interactive: true
            }
        };
    describe('finite times', function () {

        before(function (done) {
            /**
             * A fake auth method which always forces a request to be replayed.
             *
             * @constructor
             */
            var replayCount = 0,
                fakeHandler = {
                    init: function (auth, response, done) {
                        done(null);
                    },

                    pre: function (auth, done) {
                        done(null, true);
                    },

                    post: function (auth, response, done) {
                        replayCount++;
                        done(null, replayCount === 2);
                    },

                    sign: function (auth, request, done) {
                        done();
                    }
                };

            AuthLoader.addHandler(fakeHandler, 'fake');

            this.run(runOptions, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        after(function () {
            AuthLoader.removeHandler('fake');
        });

        it('must have completed the run', function () {
            expect(testrun).be.ok();
            expect(testrun.done.calledOnce).be.ok();
            expect(testrun.done.getCall(0).args[0]).to.be(null);
            expect(testrun.start.calledOnce).be.ok();
        });

        it('must have sent two requests internally', function () {
            expect(testrun.io.callCount).to.be(2);
            expect(testrun.request.callCount).to.be(2);
        });

        it('must have sent the original request', function () {
            var request = testrun.response.getCall(0).args[3],
                response = testrun.response.getCall(0).args[2];

            expect(testrun.response.callCount).to.be(1);
            expect(request.url.toString()).to.eql('https://postman-echo.com/get');
            expect(response.code).to.eql(200);
        });

        it('should send first request as part of the collection', function () {
            var error = testrun.io.firstCall.args[0],
                request = testrun.io.firstCall.args[4],
                response = testrun.io.firstCall.args[3],
                trace = testrun.io.firstCall.args[2];

            expect(error).to.be(null);

            expect(request.url.toString()).to.eql('https://postman-echo.com/get');
            expect(response.code).to.eql(200);

            expect(trace).to.have.property('type', 'http');
            expect(trace).to.have.property('source', 'collection');
        });

        // @todo: enable after adding trace to cursor for replace
        it.skip('should send second request as a replay', function () {
            var error = testrun.io.secondCall.args[0],
                request = testrun.io.secondCall.args[4],
                response = testrun.io.secondCall.args[3],
                trace = testrun.io.secondCall.args[2];

            expect(error).to.be(null);

            expect(request.url.toString()).to.eql('https://postman-echo.com/get');
            expect(response.code).to.eql(200);

            expect(trace).to.have.property('type', 'http');
            expect(trace).to.have.property('source', 'fake.auth');
        });
    });

    describe('infinitely', function () {

        before(function (done) {
            /**
             * A fake auth method which always forces a request to be replayed.
             *
             * @constructor
             */
            var fakeHandler = {
                init: function (auth, response, done) {
                    done(null);
                },

                pre: function (auth, done) {
                    done(null, true);
                },

                post: function (auth, response, done) {
                    done(null, false);
                },

                sign: function (auth, request, done) {
                    done();
                }
            };

            AuthLoader.addHandler(fakeHandler, 'fake');

            this.run(runOptions, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        after(function () {
            AuthLoader.removeHandler('fake');
        });

        it('must have completed the run', function () {
            expect(testrun).be.ok();
            expect(testrun.done.callCount).to.be(1);
            testrun.done.getCall(0).args[0] && console.error(testrun.done.getCall(0).args[0].stack);
            expect(testrun.done.getCall(0).args[0]).to.be(null);
            expect(testrun.start.callCount).to.be(1);
        });

        it('must have ended with max count error', function () {
            var err = testrun.response.lastCall.args[0];

            expect(err).to.have.property('message', 'runtime: maximum intermediate request limit exceeded');
        });
    });

    describe('infinitely with infinite intermediate requests', function () {

        before(function (done) {
            /**
             * A fake auth method which always forces a request to be replayed.
             *
             * @constructor
             */
            var fakeHandler = {
                init: function (auth, response, done) {
                    done(null);
                },

                pre: function (auth, done) {
                    done(null, false, 'https://postman-echo.com/get');
                },

                post: function (auth, response, done) {
                    done(null, false);
                },

                sign: function (auth, request, done) {
                    done();
                }
            };

            AuthLoader.addHandler(fakeHandler, 'fake');

            this.run(runOptions, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        after(function () {
            AuthLoader.removeHandler('fake');
        });

        it('must have completed the run', function () {
            expect(testrun).be.ok();
            expect(testrun.done.callCount).to.be(1);
            testrun.done.getCall(0).args[0] && console.error(testrun.done.getCall(0).args[0].stack);
            expect(testrun.done.getCall(0).args[0]).to.be(null);
            expect(testrun.start.callCount).to.be(1);
        });

        it('must have ended with max count error', function () {
            var err = testrun.response.lastCall.args[0];

            expect(err).to.have.property('message', 'runtime: maximum intermediate request limit exceeded');
        });
    });
});
