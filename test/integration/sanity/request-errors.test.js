var AuthLoader = require('../../../lib/authorizer').AuthLoader,
    expect = require('chai').expect;

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

    it('should not call request or response callback for unhandled errors', function() {
        expect(testrun).to.be.ok;
        expect(testrun).to.nested.include({
            'request.callCount': 0,
            'response.callCount': 0
        });
    });

    it('should have bubbled to done and error callback when abortOnError is set', function() {
        expect(testrun.done.getCall(0)).to.have.nested.property('args[0].message', 'deal with it');
    });

    it('should have completed the run', function() {
        expect(testrun).to.be.ok;
        expect(testrun).to.nested.include({
            'done.calledOnce': true,
            'start.calledOnce': true
        });
    });
});
