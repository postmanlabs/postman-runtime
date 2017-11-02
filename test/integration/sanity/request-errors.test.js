var AuthLoader = require('../../../lib/authorizer/index').AuthLoader;

describe('unhandled errors in request send', function() {
    var testrun;

    before(function(done) {
        this.run({
            collection: {
                item: [{
                    request: {
                        url: 'https://postman-echo.com/get',
                        auth: {
                            type: 'fake',
                            fake: {
                                username: 'postman',
                                password: 'password'
                            }
                        }
                    }
                }]
            },
            abortOnError: true,
            authorizer: {
                interactive: true
            }
        }, function(err, results) {
            testrun = results;
            done(err);
        });

        AuthLoader.addHandler({
            init: function (auth, response, done) {
                done(null);
            },
            pre: function () {
                // two things
                // 1. Auth pre hooks do not catch errors because of our control over all Auth implementations. We might
                // have to handle errors when we allow custom Auth handlers.
                // 2. We use Auth hooks to throw errors because that is the only place where we execute code outside
                // core runtime. Think about a way to replace this test when unhandled errors are caught in Auth.
                throw new Error('deal with it');
            },
            post: function (auth, response, done) {
                done(null, true);
            },
            sign: function (auth, request, done) {
                done();
            }
        }, 'fake');
    });

    it('must not call request or response callback for unhandled errors', function() {
        expect(testrun).be.ok();
        expect(testrun.request.callCount).to.be(0);
        expect(testrun.response.callCount).to.be(0);
    });

    it('must have bubbled to done and error callback when abortOnError is set', function() {
        expect(testrun.done.getCall(0).args[0]).to.have.property('message', 'deal with it');
    });

    it('must have completed the run', function() {
        expect(testrun).be.ok();
        expect(testrun.done.calledOnce).be.ok();
        expect(testrun.start.calledOnce).be.ok();
    });
});
