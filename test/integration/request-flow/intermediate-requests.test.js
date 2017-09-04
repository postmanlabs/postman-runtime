var sinon = require('sinon'),
    Authorizer = require('../../../lib/authorizer/index').Authorizer,
    sdk = require('postman-collection');

describe('intermediate requests from auth', function () {
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
        },
        authorizer: {
            interactive: true
        }
    };

    describe('with intermediate request in pre', function () {
        var testrun,
            fin = false,
            fakeHandler = {
                init: function (auth, response, done) {
                    fin = true;
                    done(null);
                },
                pre: function (auth, done) {
                    done(null, fin, 'https://postman-echo.com/get');
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
            Authorizer.addHandler(fakeHandler, 'fake');
            // perform the collection run
            this.run(runOptions, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        after(function () {
            Authorizer.removeHandler('fake');
        });

        it('must have completed the run', function () {
            expect(testrun).be.ok();
            expect(testrun.done.callCount).to.be(1);
            testrun.done.getCall(0).args[0] && console.error(testrun.done.getCall(0).args[0].stack);
            expect(testrun.done.getCall(0).args[0]).to.be(null);
            expect(testrun.start.callCount).to.be(1);
        });

        it('must have sent two requests in total', function () {
            expect(testrun.request.callCount).to.be(2);
            expect(testrun.io.callCount).to.be(2);
        });

        it('must have sent the original request', function () {
            var err = testrun.request.secondCall.args[0],
                request = testrun.request.secondCall.args[3];

            expect(err).to.be(null);
            expect(request.url.toString()).to.eql('https://postman-echo.com/basic-auth');
        });

        it('must have sent the intermediate request', function () {
            var err = testrun.request.firstCall.args[0],
                request = testrun.request.firstCall.args[3];

            expect(err).to.be(null);
            expect(request.url.toString()).to.be('https://postman-echo.com/get');
            // @todo: add trace to cursor and enable this test
            // expect(cursor.trace.source).to.be('fake.auth');
        });

        it('must have followed auth control flow', function () {
            expect(handlerSpies.pre.callCount).to.be(2);
            expect(handlerSpies.init.callCount).to.be(1);
            expect(handlerSpies.sign.callCount).to.be(1);
            expect(handlerSpies.post.callCount).to.be(1);
        });
    });

    describe('with intermediate request as sdk Request', function () {
        var testrun,
            fin = false,
            fakeHandler = {
                init: function (auth, response, done) {
                    fin = true;
                    done(null);
                },
                pre: function (auth, done) {
                    done(null, fin, new sdk.Request('https://postman-echo.com/get'));
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
            Authorizer.addHandler(fakeHandler, 'fake');
            // perform the collection run
            this.run(runOptions, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        after(function () {
            Authorizer.removeHandler('fake');
        });

        it('must have completed the run', function () {
            expect(testrun).be.ok();
            expect(testrun.done.callCount).to.be(1);
            testrun.done.getCall(0).args[0] && console.error(testrun.done.getCall(0).args[0].stack);
            expect(testrun.done.getCall(0).args[0]).to.be(null);
            expect(testrun.start.callCount).to.be(1);
        });

        it('must have sent two requests in total', function () {
            expect(testrun.request.callCount).to.be(2);
            expect(testrun.io.callCount).to.be(2);
        });

        it('must have sent the original request', function () {
            var err = testrun.request.secondCall.args[0],
                request = testrun.request.secondCall.args[3];

            expect(err).to.be(null);
            expect(request.url.toString()).to.eql('https://postman-echo.com/basic-auth');
        });

        it('must have sent the intermediate request', function () {
            var err = testrun.request.firstCall.args[0],
                request = testrun.request.firstCall.args[3];

            expect(err).to.be(null);
            expect(request.url.toString()).to.eql('https://postman-echo.com/get');
            // @todo: add trace to cursor and enable this test
            // expect(cursor.trace.source).to.be('fake.auth');
        });

        it('must have followed auth control flow', function () {
            expect(handlerSpies.pre.callCount).to.be(2);
            expect(handlerSpies.init.callCount).to.be(1);
            expect(handlerSpies.sign.callCount).to.be(1);
            expect(handlerSpies.post.callCount).to.be(1);
        });
    });

    describe('with intermediate request error', function () {
        var testrun,
            fin = false,
            fakeHandler = {
                init: function (auth, response, done) {
                    fin = true;
                    done(null);
                },
                pre: function (auth, done) {
                    done(null, fin, new sdk.Request('https://bla/blabla'));
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
            Authorizer.addHandler(fakeHandler, 'fake');
            // perform the collection run
            this.run(runOptions, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        after(function () {
            Authorizer.removeHandler('fake');
        });

        it('must have completed the run', function () {
            expect(testrun).be.ok();
            expect(testrun.done.callCount).to.be(1);
            testrun.done.getCall(0).args[0] && console.error(testrun.done.getCall(0).args[0].stack);
            expect(testrun.done.getCall(0).args[0]).to.be(null);
            expect(testrun.start.callCount).to.be(1);
        });

        it('must have sent two requests in total', function () {
            expect(testrun.request.callCount).to.be(2);
            expect(testrun.io.callCount).to.be(2);
        });

        it('must have sent the original request', function () {
            var err = testrun.request.secondCall.args[0],
                request = testrun.request.secondCall.args[3];

            expect(err).to.be(null);
            expect(request.url.toString()).to.eql('https://postman-echo.com/basic-auth');
        });

        it('must have sent the intermediate request, and passed error', function () {
            var err = testrun.request.firstCall.args[0],
                ioErr = testrun.io.firstCall.args[0],
                request = testrun.request.firstCall.args[3];

            expect(err).to.have.property('message', 'getaddrinfo ENOTFOUND bla bla:443');
            expect(ioErr).to.have.property('message', 'getaddrinfo ENOTFOUND bla bla:443');
            expect(request.url.toString()).to.eql('https://bla/blabla');
        });

        it('must have followed auth control flow', function () {
            expect(handlerSpies.pre.callCount).to.be(1);
            expect(handlerSpies.init.callCount).to.be(0);
            expect(handlerSpies.sign.callCount).to.be(0);
            expect(handlerSpies.post.callCount).to.be(1);
        });
    });

    describe('with false result in pre and an intermediate request', function () {
        var testrun,
            fakeHandler = {
                init: function (auth, response, done) {
                    done(null);
                },
                pre: function (auth, done) {
                    done(null, false, new sdk.Request('https://postman-echo.com/get'));
                },
                post: function (auth, response, done) {
                    done(null, true);
                },
                sign: function (auth, request, done) {
                    done();
                }
            };

        before(function (done) {
            Authorizer.addHandler(fakeHandler, 'fake');
            // perform the collection run
            this.run(runOptions, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        after(function () {
            Authorizer.removeHandler('fake');
        });

        it('must have completed the run', function () {
            expect(testrun).be.ok();
            expect(testrun.done.callCount).to.be(1);
            testrun.done.getCall(0).args[0] && console.error(testrun.done.getCall(0).args[0].stack);
            expect(testrun.done.getCall(0).args[0]).to.be(null);
            expect(testrun.start.callCount).to.be(1);
        });

        it('must have ended with max count error', function () {
            var err = testrun.request.lastCall.args[0];

            expect(err).to.have.property('message', 'runtime: maximum intermediate request limit exceeded');
        });
    });
});
