var sinon = require('sinon'),
    AuthLoader = require('../../../lib/authorizer/index').AuthLoader;

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

        it('must have sent two requests in total', function () {
            expect(testrun.request.callCount).to.be(2);
            expect(testrun.io.callCount).to.be(2);
        });

        it('must have sent the original request', function () {
            var err = testrun.response.firstCall.args[0],
                cursor = testrun.response.firstCall.args[1],
                request = testrun.response.firstCall.args[3];

            expect(err).to.be(null);
            expect(cursor).to.have.keys('ref', 'httpRequestId');
            expect(request.url.toString()).to.eql('https://postman-echo.com/basic-auth');
        });

        it('must have sent the intermediate request', function () {
            var err = testrun.request.firstCall.args[0],
                request = testrun.request.firstCall.args[3];

            expect(err).to.be(null);
            expect(request.url.toString()).to.be('https://postman-echo.com/get');
        });

        it('must have the right trace', function () {
            expect(testrun.io.firstCall.args[2]).to.have.property('source', 'fake.auth');
            expect(testrun.io.secondCall.args[2]).to.have.property('source', 'collection');
        });

        it('must have followed auth control flow', function () {
            expect(handlerSpies.pre.callCount).to.be(2);
            expect(handlerSpies.init.callCount).to.be(1);
            expect(handlerSpies.sign.callCount).to.be(1);
            expect(handlerSpies.post.callCount).to.be(1);
        });
    });

    describe('with intermediate request as Request json', function () {
        var testrun,
            fin = false,
            fakeHandler = {
                init: function (auth, response, done) {
                    fin = true;
                    done(null);
                },
                pre: function (auth, done) {
                    done(null, fin, {url: 'https://postman-echo.com/get'});
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

        it('must have sent two requests in total', function () {
            expect(testrun.request.callCount).to.be(2);
            expect(testrun.io.callCount).to.be(2);
        });

        it('must have sent the original request', function () {
            var err = testrun.response.firstCall.args[0],
                request = testrun.response.firstCall.args[3];

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
                    done(null, fin, 'https://bla/blabla');
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

        it('must have sent two requests in total', function () {
            expect(testrun.request.callCount).to.be(2);
            expect(testrun.io.callCount).to.be(2);
        });

        it('must have sent the original request', function () {
            var err = testrun.response.firstCall.args[0],
                request = testrun.response.firstCall.args[3];

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
                    done(null, false, 'https://postman-echo.com/get');
                },
                post: function (auth, response, done) {
                    done(null, true);
                },
                sign: function (auth, request, done) {
                    done();
                }
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

        it('must have bubbled with max count error', function () {
            var err = testrun.console.lastCall.args[2];

            expect(err).to.contain('runtime: maximum intermediate request limit exceeded');
        });

        it('must complete the request with the last response', function () {
            var reqErr = testrun.request.lastCall.args[0],
                resErr = testrun.response.lastCall.args[0],
                response = testrun.response.lastCall.args[2];

            expect(reqErr).to.be(null);
            expect(resErr).to.be(null);
            expect(response.code).to.be(401);
            expect(response.text()).to.contain('Unauthorized');
        });
    });
});
