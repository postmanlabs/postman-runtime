var AuthLoader = require('../../../lib/authorizer').AuthLoader;

describe('response callback', function () {
    var testrun;

    describe('in a collection', function () {

        before(function (done) {
            /**
             * A fake auth method which always forces a request to be replayed.
             *
             * @constructor
             */
            var runOptions = {
                collection: {
                    item: [{
                        request: 'https://postman-echo.com/get'
                    }]
                }
            };

            this.run(runOptions, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        it('must have completed the run', function () {
            expect(testrun).be.ok();
            expect(testrun.done.calledOnce).be.ok();
            expect(testrun.done.getCall(0).args[0]).to.be(null);
            expect(testrun.start.calledOnce).be.ok();
        });

        it('must be called once for request', function () {
            var request = testrun.response.firstCall.args[3],
                response = testrun.response.firstCall.args[2];

            expect(testrun.response.callCount).to.be(1);
            expect(request.url.toString()).to.eql('https://postman-echo.com/get');
            expect(response.code).to.eql(200);

            // ensure parameters in response callback are same as request callback
            // cookies
            expect(testrun.request.firstCall.args[5]).to.eql(testrun.response.firstCall.args[5]);
            // item
            expect(testrun.request.firstCall.args[4].toJSON()).to.eql(testrun.response.firstCall.args[4].toJSON());
            // request
            expect(testrun.request.firstCall.args[3].toJSON()).to.eql(testrun.response.firstCall.args[3].toJSON());
            // response
            expect(testrun.request.firstCall.args[2].toJSON()).to.eql(testrun.response.firstCall.args[2].toJSON());
            // cursor
            expect(testrun.response.firstCall.args[1]).to.have.property('ref');
        });
    });

    describe('in a collection with replays', function () {

        before(function (done) {
            /**
             * A fake auth method which always forces a request to be replayed.
             *
             * @constructor
             */
            var replayCount = 0,
                runOptions = {
                    collection: {
                        item: [{
                            request: {
                                url: 'https://postman-echo.com/digest-auth',
                                auth: {
                                    type: 'digest',
                                    digest: {
                                        username: 'postman',
                                        password: 'password'
                                    }
                                }
                            }
                        }]
                    }
                },
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

        it('must have completed the run', function () {
            expect(testrun).be.ok();
            expect(testrun.done.calledOnce).be.ok();
            expect(testrun.done.getCall(0).args[0]).to.be(null);
            expect(testrun.start.calledOnce).be.ok();
        });

        it('must be called once for request', function () {
            var request = testrun.response.firstCall.args[3],
                response = testrun.response.firstCall.args[2];

            // response callback is called only once for replays
            expect(testrun.response.callCount).to.be(1);
            expect(testrun.request.callCount).to.be(2);
            expect(request.url.toString()).to.eql('https://postman-echo.com/digest-auth');
            expect(response.code).to.eql(200);
            expect(response.json()).to.have.property('authenticated', true);

            // ensure parameters in response callback are same as request callback
            // cookies
            expect(testrun.request.secondCall.args[5]).to.eql(testrun.response.firstCall.args[5]);
            // item
            expect(testrun.request.secondCall.args[4].toJSON()).to.eql(testrun.response.firstCall.args[4].toJSON());
            // request
            expect(testrun.request.secondCall.args[3].toJSON()).to.eql(testrun.response.firstCall.args[3].toJSON());
            // response
            expect(testrun.request.secondCall.args[2].toJSON()).to.eql(testrun.response.firstCall.args[2].toJSON());
            // cursor
            expect(testrun.response.firstCall.args[1]).to.have.property('ref');
        });
    });
});
