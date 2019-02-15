var sinon = require('sinon').createSandbox(),
    expect = require('chai').expect,
    AuthLoader = require('../../../../lib/authorizer/index').AuthLoader;

describe('auth control flow', function () {
    var runOptions = {
        collection: {
            item: {
                name: 'FakeAuth',
                request: {
                    url: 'https://postman-echo.com/basic-auth',
                    auth: {
                        type: 'fake',
                        fake: {
                            username: 'postman',
                            password: 'password'
                        }
                    }
                }
            }
        }
    };

    after(function () {
        sinon.restore();
    });

    describe('with working init, pre, and post', function () {
        var testrun,
            fakeHandler = {
                init: function (auth, response, done) {
                    done(null);
                },
                pre: function (auth, done) {
                    done(null, true);
                },
                post: function (auth, response, done) {
                    done(null, true);
                },
                sign: function (auth, request, done) {
                    done();
                }
            },
            handlerSpies = {
                pre: sinon.spy(fakeHandler, 'pre'),
                init: sinon.spy(fakeHandler, 'init'),
                post: sinon.spy(fakeHandler, 'post'),
                sign: sinon.spy(fakeHandler, 'sign')
            };

        before(function (done) {
            AuthLoader.addHandler(fakeHandler, 'fake');
            // perform the collection run
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
            expect(testrun).to.nested.include({
                'start.callCount': 1,
                'io.callCount': 1
            });
        });

        it('should have sent the request once', function () {
            expect(testrun).to.nested.include({
                'request.callCount': 1
            });

            var err = testrun.request.firstCall.args[0],
                request = testrun.request.firstCall.args[3];

            expect(err).to.be.null;
            expect(request.url.toString()).to.eql('https://postman-echo.com/basic-auth');
        });

        it('should call sign and post, not init', function () {
            expect(handlerSpies).to.nested.include({
                'pre.callCount': 1,
                'init.callCount': 0,
                'sign.callCount': 1,
                'post.callCount': 1
            });
        });
    });

    describe('with false result in pre', function () {
        var testrun,
            fakeHandler = {
                init: function (auth, response, done) {
                    done(null);
                },
                pre: function (auth, done) {
                    done(null, false);
                },
                post: function (auth, response, done) {
                    done(null, true);
                },
                sign: function (auth, request, done) {
                    done();
                }
            },
            handlerSpies = {
                pre: sinon.spy(fakeHandler, 'pre'),
                init: sinon.spy(fakeHandler, 'init'),
                post: sinon.spy(fakeHandler, 'post'),
                sign: sinon.spy(fakeHandler, 'sign')
            };

        before(function (done) {
            AuthLoader.addHandler(fakeHandler, 'fake');
            // perform the collection run
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
            expect(testrun).to.nested.include({
                'start.callCount': 1,
                'io.callCount': 1
            });
        });

        it('should have sent the request once', function () {
            expect(testrun).to.nested.include({
                'request.callCount': 1
            });

            var err = testrun.request.firstCall.args[0],
                request = testrun.request.firstCall.args[3];

            expect(err).to.be.null;
            expect(request.url.toString()).to.eql('https://postman-echo.com/basic-auth');
        });

        it('should skip signing', function () {
            expect(handlerSpies).to.nested.include({
                'pre.callCount': 1,
                'init.callCount': 0,
                'sign.callCount': 0,
                'post.callCount': 1
            });
        });
    });
});
