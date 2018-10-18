var AuthLoader = require('../../../lib/authorizer').AuthLoader,
    expect = require('chai').expect;

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

        it('should have completed the run', function () {
            expect(testrun).to.be.ok;
            expect(testrun.done.getCall(0).args[0]).to.be.null;
            expect(testrun).to.nested.include({
                'done.calledOnce': true,
                'start.calledOnce': true
            });
        });

        it('should be called once for request', function () {
            var request = testrun.response.firstCall.args[3],
                response = testrun.response.firstCall.args[2];

            expect(testrun).to.nested.include({
                'response.callCount': 1
            });
            expect(request.url.toString()).to.eql('https://postman-echo.com/get');
            expect(response).to.have.property('code', 200);

            // ensure parameters in response callback are same as request callback
            // cookies
            // eslint-disable-next-line max-len
            expect(testrun).to.have.deep.nested.property('request.firstCall.args[5]', testrun.response.firstCall.args[5]);
            // item
            expect(testrun.request.firstCall.args[4].toJSON()).to.eql(testrun.response.firstCall.args[4].toJSON());
            // request
            expect(testrun.request.firstCall.args[3].toJSON()).to.eql(testrun.response.firstCall.args[3].toJSON());
            // response
            expect(testrun.request.firstCall.args[2].toJSON()).to.eql(testrun.response.firstCall.args[2].toJSON());
            // cursor
            expect(testrun).to.have.nested.property('response.firstCall.args[1]').that.has.property('ref');
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

        it('should have completed the run', function () {
            expect(testrun).to.be.ok;
            expect(testrun.done.getCall(0).args[0]).to.be.null;
            expect(testrun).to.nested.include({
                'done.calledOnce': true,
                'start.calledOnce': true
            });
        });

        it('should be called once for request', function () {
            var request = testrun.response.firstCall.args[3],
                response = testrun.response.firstCall.args[2];

            // response callback is called only once for replays
            expect(testrun).to.nested.include({
                'response.callCount': 1,
                'request.callCount': 2
            });
            expect(request.url.toString()).to.eql('https://postman-echo.com/digest-auth');
            expect(response).to.have.property('code', 200);
            expect(response.json()).to.have.property('authenticated', true);

            // ensure parameters in response callback are same as request callback
            // cookies
            // eslint-disable-next-line max-len
            expect(testrun).to.have.deep.nested.property('request.secondCall.args[5]', testrun.response.firstCall.args[5]);
            // item
            expect(testrun.request.secondCall.args[4].toJSON()).to.eql(testrun.response.firstCall.args[4].toJSON());
            // request
            expect(testrun.request.secondCall.args[3].toJSON()).to.eql(testrun.response.firstCall.args[3].toJSON());
            // response
            expect(testrun.request.secondCall.args[2].toJSON()).to.eql(testrun.response.firstCall.args[2].toJSON());
            // cursor
            expect(testrun).to.have.nested.property('response.firstCall.args[1]').that.has.property('ref');
        });
    });
});
