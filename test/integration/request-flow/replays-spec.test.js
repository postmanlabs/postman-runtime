var AuthLoader = require('../../../lib/authorizer').AuthLoader,
    expect = require('chai').expect;

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
                        done(null, replayCount++ === 1);
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

        it('should have completed the run', function () {
            expect(testrun).to.be.ok;
            expect(testrun.done.getCall(0).args[0]).to.be.null;
            expect(testrun).to.nested.include({
                'done.calledOnce': true,
                'start.calledOnce': true
            });
        });

        it('should have sent two requests internally', function () {
            expect(testrun).to.nested.include({
                'io.callCount': 2,
                'request.callCount': 2
            });
        });

        it('should have sent the original request', function () {
            var request = testrun.response.getCall(0).args[3],
                response = testrun.response.getCall(0).args[2];

            expect(testrun).to.nested.include({
                'response.callCount': 1
            });
            expect(request.url.toString()).to.eql('https://postman-echo.com/get');
            expect(response).to.have.property('code', 200);
        });

        it('should send first request as part of the collection', function () {
            var error = testrun.io.firstCall.args[0],
                request = testrun.io.firstCall.args[4],
                response = testrun.io.firstCall.args[3],
                trace = testrun.io.firstCall.args[2];

            expect(error).to.be.null;

            expect(request.url.toString()).to.eql('https://postman-echo.com/get');
            expect(response).to.have.property('code', 200);

            expect(trace).to.deep.include({
                type: 'http',
                source: 'collection'
            });
        });

        it('should send second request as a replay', function () {
            var error = testrun.io.secondCall.args[0],
                request = testrun.io.secondCall.args[4],
                response = testrun.io.secondCall.args[3],
                trace = testrun.io.secondCall.args[2];

            expect(error).to.be.null;

            expect(request.url.toString()).to.eql('https://postman-echo.com/get');
            expect(response).to.have.property('code', 200);

            expect(trace).to.deep.include({
                type: 'http',
                source: 'fake.auth'
            });
        });
    });

    describe('finite times with intermediate requests', function () {
        before(function (done) {
            /**
             * A fake auth method which always forces a request to be replayed.
             *
             * @constructor
             */
            var replayCount = 0,
                intermediateReqCount = 0,
                fakeHandler = {
                    init: function (auth, response, done) {
                        done(null);
                    },

                    pre: function (auth, done) {
                        done(null, intermediateReqCount++ >= 1, 'https://postman-echo.com/fake/url');
                    },

                    post: function (auth, response, done) {
                        done(null, replayCount++ === 1);
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

        it('should have completed the run', function () {
            expect(testrun).to.be.ok;
            expect(testrun.done.getCall(0).args[0]).to.be.null;
            expect(testrun).to.nested.include({
                'done.calledOnce': true,
                'start.calledOnce': true
            });
        });

        it('should have sent three requests internally', function () {
            expect(testrun).to.nested.include({
                'io.callCount': 3,
                'request.callCount': 3
            });
        });

        it('should have sent the original request', function () {
            var request = testrun.response.firstCall.args[3],
                response = testrun.response.firstCall.args[2];

            expect(testrun).to.nested.include({
                'response.callCount': 1
            });
            expect(request.url.toString()).to.eql('https://postman-echo.com/get');
            expect(response).to.have.property('code', 200);
        });

        it('should send first request as intermediate request', function () {
            var error = testrun.io.firstCall.args[0],
                request = testrun.io.firstCall.args[4],
                trace = testrun.io.firstCall.args[2];

            expect(error).to.be.null;

            expect(request.url.toString()).to.eql('https://postman-echo.com/fake/url');

            expect(trace).to.deep.include({
                type: 'http',
                source: 'fake.auth'
            });
        });

        it('should send second request as part of the collection', function () {
            var error = testrun.io.secondCall.args[0],
                request = testrun.io.secondCall.args[4],
                response = testrun.io.secondCall.args[3],
                trace = testrun.io.secondCall.args[2];

            expect(error).to.be.null;

            expect(request.url.toString()).to.eql('https://postman-echo.com/get');
            expect(response).to.have.property('code', 200);

            expect(trace).to.deep.include({
                type: 'http',
                source: 'collection'
            });
        });

        it('should send third request as a replay', function () {
            var error = testrun.io.thirdCall.args[0],
                request = testrun.io.thirdCall.args[4],
                response = testrun.io.thirdCall.args[3],
                trace = testrun.io.thirdCall.args[2];

            expect(error).to.be.null;

            expect(request.url.toString()).to.eql('https://postman-echo.com/get');
            expect(response).to.have.property('code', 200);

            expect(trace).to.deep.include({
                type: 'http',
                source: 'fake.auth'
            });
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

        it('should have completed the run', function () {
            expect(testrun).to.be.ok;
            expect(testrun).to.nested.include({
                'done.callCount': 1
            });
            testrun.done.getCall(0).args[0] && console.error(testrun.done.getCall(0).args[0].stack);
            expect(testrun.done.getCall(0).args[0]).to.be.null;
            expect(testrun.response.firstCall.args[1]).to.include.keys(['ref', 'httpRequestId']);
            expect(testrun).to.nested.include({
                'start.callCount': 1
            });
        });


        it('should have bubbled with max count error', function () {
            var err = testrun.console.lastCall.args[2];

            expect(err).to.include('runtime: maximum intermediate request limit exceeded');
        });

        it('should complete the request with the last response', function () {
            var reqErr = testrun.request.lastCall.args[0],
                resErr = testrun.response.lastCall.args[0],
                response = testrun.response.lastCall.args[2];

            expect(reqErr).to.be.null;
            expect(resErr).to.be.null;
            expect(response).to.have.property('code', 200);
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

        it('should have completed the run', function () {
            expect(testrun).to.be.ok;
            expect(testrun).to.nested.include({
                'done.callCount': 1
            });
            testrun.done.getCall(0).args[0] && console.error(testrun.done.getCall(0).args[0].stack);
            expect(testrun.done.getCall(0).args[0]).to.be.null;
            expect(testrun.response.firstCall.args[1]).to.include.keys(['ref', 'httpRequestId']);
            expect(testrun).to.nested.include({
                'start.callCount': 1
            });
        });


        it('should have bubbled with max count error', function () {
            var message = testrun.console.lastCall.args[2];

            expect(message).to.include('runtime: maximum intermediate request limit exceeded');
        });

        it('should complete the request with the last response', function () {
            var reqErr = testrun.request.lastCall.args[0],
                resErr = testrun.response.lastCall.args[0],
                response = testrun.response.lastCall.args[2];

            expect(reqErr).to.be.null;
            expect(resErr).to.be.null;
            expect(response).to.have.property('code', 200);
        });
    });
});
