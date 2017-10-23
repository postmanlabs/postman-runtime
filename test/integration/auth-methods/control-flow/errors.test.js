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

    describe('with error in pre', function () {
        var testrun,
            fakeHandler = {
                init: function (auth, response, done) {
                    done(null);
                },
                pre: function (auth, done) {
                    done(new Error('Pre Error!'));
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
        });

        it('must have sent the request once', function () {
            expect(testrun.request.callCount).to.be(1);

            var err = testrun.console.firstCall.args[3],
                request = testrun.request.firstCall.args[3];

            expect(err).to.have.property('message', 'Pre Error!');
            expect(request.url.toString()).to.eql('https://postman-echo.com/basic-auth');
        });

        it('must have not call init, sign and post', function () {
            expect(handlerSpies.pre.callCount).to.be(1);
            expect(handlerSpies.init.callCount).to.be(0);
            expect(handlerSpies.sign.callCount).to.be(0);
            expect(handlerSpies.post.callCount).to.be(1);
        });
    });

    describe('with error in post, and true in pre', function () {
        var testrun,
            fakeHandler = {
                init: function (auth, response, done) {
                    done(null);
                },
                pre: function (auth, done) {
                    done(null, true);
                },
                post: function (auth, response, done) {
                    done(new Error('Post Error!'));
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

            var request = testrun.request.firstCall.args[3],
                err = testrun.console.firstCall.args[3];

            expect(testrun.console.callCount).to.eql(1);
            expect(err).to.have.property('message', 'Post Error!');
            expect(request.url.toString()).to.eql('https://postman-echo.com/basic-auth');
        });

        it('must not repeat the auth flow', function () {
            expect(handlerSpies.pre.callCount).to.be(1);
            expect(handlerSpies.init.callCount).to.be(0);
            expect(handlerSpies.sign.callCount).to.be(1);
            expect(handlerSpies.post.callCount).to.be(1);
        });
    });

    describe('with error in post, and false in pre', function () {
        var testrun,
            fakeHandler = {
                init: function (auth, response, done) {
                    done(null);
                },
                pre: function (auth, done) {
                    done(null, false);
                },
                post: function (auth, response, done) {
                    done(new Error('Post Error!'));
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
            expect(testrun.console.callCount).to.be(1);

            var err = testrun.console.firstCall.args[3],
                request = testrun.request.firstCall.args[3];

            expect(err).to.have.property('message', 'Post Error!');
            expect(request.url.toString()).to.eql('https://postman-echo.com/basic-auth');
        });

        it('must not sign and must not repeat the auth flow', function () {
            expect(handlerSpies.pre.callCount).to.be(1);
            expect(handlerSpies.init.callCount).to.be(0);
            expect(handlerSpies.sign.callCount).to.be(0);
            expect(handlerSpies.post.callCount).to.be(1);
        });
    });


    describe('with error in pre and post', function () {
        var testrun,
            fakeHandler = {
                init: function (auth, response, done) {
                    done(null);
                },
                pre: function (auth, done) {
                    done(new Error('Pre Error!'), false);
                },
                post: function (auth, response, done) {
                    done(new Error('Post Error!'));
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
        });

        it('must have sent the request once', function () {
            expect(testrun.request.callCount).to.be(1);

            var request = testrun.request.firstCall.args[3];

            expect(request.url.toString()).to.eql('https://postman-echo.com/basic-auth');
        });

        it('should have bubbled the error to the request', function () {
            var err = testrun.console.firstCall.args[3];

            expect(err).to.have.property('message', 'Pre Error!');
        });

        it('must not sign and must not repeat the auth flow', function () {
            expect(handlerSpies.pre.callCount).to.be(1);
            expect(handlerSpies.init.callCount).to.be(0);
            expect(handlerSpies.sign.callCount).to.be(0);
            expect(handlerSpies.post.callCount).to.be(1);
        });
    });

    describe('with error in sign, and success in pre', function () {
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
                    done(new Error('Sign Error!'));
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
        });

        it('must have sent the request once', function () {
            expect(testrun.request.callCount).to.be(1);

            var request = testrun.request.firstCall.args[3];

            expect(request.url.toString()).to.eql('https://postman-echo.com/basic-auth');
        });

        it('must have bubbled the error', function () {
            var err = testrun.console.firstCall.args[3];

            expect(err).to.have.property('message', 'Sign Error!');
        });

        it('must not repeat the auth flow', function () {
            expect(handlerSpies.pre.callCount).to.be(1);
            expect(handlerSpies.init.callCount).to.be(0);
            expect(handlerSpies.sign.callCount).to.be(1);
            expect(handlerSpies.post.callCount).to.be(1);
        });
    });

    describe('with error in init', function () {
        var testrun,
            fakeHandler = {
                init: function (auth, response, done) {
                    done(new Error('Init Error!'));
                },
                pre: function (auth, done) {
                    done(null, false, 'https://postman-echo.com/get');
                },
                post: function (auth, response, done) {
                    done(null, true);
                },
                sign: function (auth, request, done) {
                    done(null);
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
        });

        it('must have sent the original request', function () {
            var request = testrun.request.secondCall.args[3];

            expect(request.url.toString()).to.eql('https://postman-echo.com/basic-auth');
        });

        it('must have sent the intermediate request', function () {
            var request = testrun.request.firstCall.args[3];

            expect(request.url.toString()).to.eql('https://postman-echo.com/get');
        });

        it('must have bubbled the error', function () {
            var err = testrun.console.firstCall.args[3];

            expect(err).to.have.property('message', 'Init Error!');
        });

        it('must not repeat the auth flow', function () {
            expect(handlerSpies.pre.callCount).to.be(1);
            expect(handlerSpies.init.callCount).to.be(1);
            expect(handlerSpies.sign.callCount).to.be(0);
            expect(handlerSpies.post.callCount).to.be(1);
        });
    });
});
