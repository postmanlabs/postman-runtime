var sinon = require('sinon'),
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

        it('must have completed the run', function () {
            expect(testrun).be.ok();
            expect(testrun.done.callCount).to.be(1);
            testrun.done.getCall(0).args[0] && console.error(testrun.done.getCall(0).args[0].stack);
            expect(testrun.done.getCall(0).args[0]).to.be(null);
            expect(testrun.start.callCount).to.be(1);
            expect(testrun.io.callCount).to.be(1);
        });

        it('must have sent the request once', function () {
            expect(testrun.request.callCount).to.be(1);

            var err = testrun.request.firstCall.args[0],
                request = testrun.request.firstCall.args[3];

            expect(err).to.be(null);
            expect(request.url.toString()).to.eql('https://postman-echo.com/basic-auth');
        });

        it('must call sign and post, not init', function () {
            expect(handlerSpies.pre.callCount).to.be(1);
            expect(handlerSpies.init.callCount).to.be(0);
            expect(handlerSpies.post.callCount).to.be(1);
            expect(handlerSpies.sign.callCount).to.be(1);
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

        it('must have completed the run', function () {
            expect(testrun).be.ok();
            expect(testrun.done.callCount).to.be(1);
            testrun.done.getCall(0).args[0] && console.error(testrun.done.getCall(0).args[0].stack);
            expect(testrun.done.getCall(0).args[0]).to.be(null);
            expect(testrun.start.callCount).to.be(1);
            expect(testrun.io.callCount).to.be(1);
        });

        it('must have sent the request once', function () {
            expect(testrun.request.callCount).to.be(1);

            var err = testrun.request.firstCall.args[0],
                request = testrun.request.firstCall.args[3];

            expect(err).to.be(null);
            expect(request.url.toString()).to.eql('https://postman-echo.com/basic-auth');
        });

        it('must skip signing', function () {
            expect(handlerSpies.pre.callCount).to.be(1);
            expect(handlerSpies.init.callCount).to.be(0);
            expect(handlerSpies.sign.callCount).to.be(0);
            expect(handlerSpies.post.callCount).to.be(1);
        });
    });
});
