var sinon = require('sinon'),
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

        it('should have completed the run', function () {
            expect(testrun).to.be.ok;
            expect(testrun).to.nested.include({
                'done.callCount': 1
            });
            testrun.done.getCall(0).args[0] && console.error(testrun.done.getCall(0).args[0].stack);
            expect(testrun.done.getCall(0).args[0]).to.be.null;
            expect(testrun).to.nested.include({
                'start.callCount': 1
            });
        });

        it('should have sent the request once', function () {
            expect(testrun).to.nested.include({
                'request.callCount': 1
            });

            var err = testrun.console.firstCall.args[3],
                request = testrun.request.firstCall.args[3];

            expect(err).to.have.property('message', 'Pre Error!');
            expect(request.url.toString()).to.eql('https://postman-echo.com/basic-auth');
        });

        it('should have not call init, sign and post', function () {
            expect(handlerSpies).to.nested.include({
                'pre.callCount': 1,
                'init.callCount': 0,
                'sign.callCount': 0,
                'post.callCount': 1
            });
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

            var request = testrun.request.firstCall.args[3],
                err = testrun.console.firstCall.args[3];

            expect(testrun).to.nested.include({
                'console.callCount': 1
            });
            expect(err).to.have.property('message', 'Post Error!');
            expect(request.url.toString()).to.eql('https://postman-echo.com/basic-auth');
        });

        it('should not repeat the auth flow', function () {
            expect(handlerSpies).to.nested.include({
                'pre.callCount': 1,
                'init.callCount': 0,
                'sign.callCount': 1,
                'post.callCount': 1
            });
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
                'request.callCount': 1,
                'console.callCount': 1
            });

            var err = testrun.console.firstCall.args[3],
                request = testrun.request.firstCall.args[3];

            expect(err).to.have.property('message', 'Post Error!');
            expect(request.url.toString()).to.eql('https://postman-echo.com/basic-auth');
        });

        it('should not sign and should not repeat the auth flow', function () {
            expect(handlerSpies).to.nested.include({
                'pre.callCount': 1,
                'init.callCount': 0,
                'sign.callCount': 0,
                'post.callCount': 1
            });
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

        it('should have completed the run', function () {
            expect(testrun).to.be.ok;
            expect(testrun).to.nested.include({
                'done.callCount': 1
            });
            testrun.done.getCall(0).args[0] && console.error(testrun.done.getCall(0).args[0].stack);
            expect(testrun.done.getCall(0).args[0]).to.be.null;
            expect(testrun).to.nested.include({
                'start.callCount': 1
            });
        });

        it('should have sent the request once', function () {
            expect(testrun).to.nested.include({
                'request.callCount': 1
            });

            var request = testrun.request.firstCall.args[3];

            expect(request.url.toString()).to.eql('https://postman-echo.com/basic-auth');
        });

        it('should have bubbled the error to the request', function () {
            var err = testrun.console.firstCall.args[3];

            expect(err).to.have.property('message', 'Pre Error!');
        });

        it('should not sign and should not repeat the auth flow', function () {
            expect(handlerSpies).to.nested.include({
                'pre.callCount': 1,
                'init.callCount': 0,
                'sign.callCount': 0,
                'post.callCount': 1
            });
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

        it('should have completed the run', function () {
            expect(testrun).to.be.ok;
            expect(testrun).to.nested.include({
                'done.callCount': 1
            });
            testrun.done.getCall(0).args[0] && console.error(testrun.done.getCall(0).args[0].stack);
            expect(testrun.done.getCall(0).args[0]).to.be.null;
            expect(testrun).to.nested.include({
                'start.callCount': 1
            });
        });

        it('should have sent the request once', function () {
            expect(testrun).to.nested.include({
                'request.callCount': 1
            });

            var request = testrun.request.firstCall.args[3];

            expect(request.url.toString()).to.eql('https://postman-echo.com/basic-auth');
        });

        it('should have bubbled the error', function () {
            var err = testrun.console.firstCall.args[3];

            expect(err).to.have.property('message', 'Sign Error!');
        });

        it('should not repeat the auth flow', function () {
            expect(handlerSpies).to.nested.include({
                'pre.callCount': 1,
                'init.callCount': 0,
                'sign.callCount': 1,
                'post.callCount': 1
            });
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

        it('should have completed the run', function () {
            expect(testrun).to.be.ok;
            expect(testrun).to.nested.include({
                'done.callCount': 1
            });
            testrun.done.getCall(0).args[0] && console.error(testrun.done.getCall(0).args[0].stack);
            expect(testrun.done.getCall(0).args[0]).to.be.null;
            expect(testrun).to.nested.include({
                'start.callCount': 1
            });
        });

        it('should have sent the original request', function () {
            var request = testrun.request.secondCall.args[3];

            expect(request.url.toString()).to.eql('https://postman-echo.com/basic-auth');
        });

        it('should have sent the intermediate request', function () {
            var request = testrun.request.firstCall.args[3];

            expect(request.url.toString()).to.eql('https://postman-echo.com/get');
        });

        it('should have bubbled the error', function () {
            var err = testrun.console.firstCall.args[3];

            expect(err).to.have.property('message', 'Init Error!');
        });

        it('should not repeat the auth flow', function () {
            expect(handlerSpies).to.nested.include({
                'pre.callCount': 1,
                'init.callCount': 1,
                'sign.callCount': 0,
                'post.callCount': 1
            });
        });
    });
});
