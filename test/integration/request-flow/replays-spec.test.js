var _ = require('lodash'),
    sdk = require('postman-collection');


describe('replayed requests', function () {
    var testrun,
        Authorizer = require('../../../lib/authorizer').Authorizer;

    before(function (done) {
        /**
         * A fake auth method which always forces a request to be replayed.
         *
         * @constructor
         */
        var replayCount = 0,
            fakeHandler = {
                init: function (context, requester, done) {
                    done(null);
                },

                pre: function (context, requester, done) {
                    done(null, true);
                },

                post: function (context, requester, done) {
                    replayCount++;
                    done(null, replayCount === 2);
                },

                _sign: function (request) {
                    return request;
                }
            },
            fakeSigner = {
                update: function (params) {
                    _.assign(this, params);
                },

                authorize: function (request) {
                    return request;
                }
            };

        sdk.RequestAuth.addType(fakeSigner, 'fake');
        Authorizer.addHandler(fakeHandler, 'fake');

        this.run({
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
            authorizer: {interactive: true}
        }, function (err, results) {
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

    it('must have sent the request once', function () {
        expect(testrun.request.calledOnce).be.ok();

        var request = testrun.request.getCall(0).args[3],
            response = testrun.request.getCall(0).args[2];

        expect(request.url.toString()).to.eql('https://postman-echo.com/get');
        expect(response.code).to.eql(200);
    });

    it('must have sent two requests internally', function () {
        expect(testrun.io.calledTwice).be.ok();

        var firstRequest = testrun.io.getCall(0).args[4],
            firstResponse = testrun.io.getCall(0).args[3],
            secondRequest = testrun.io.getCall(1).args[4],
            secondResponse = testrun.io.getCall(1).args[3];

        expect(firstRequest.url.toString()).to.eql('https://postman-echo.com/get');
        expect(firstResponse.code).to.eql(200);

        expect(secondRequest.url.toString()).to.eql('https://postman-echo.com/get');
        expect(secondResponse.code).to.eql(200);
    });
});
