var sinon = require('sinon'),
    AuthLoader = require('../../../lib/authorizer').AuthLoader,
    expect = require('chai').expect;

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

        it('should have sent two requests in total', function () {
            expect(testrun).to.nested.include({
                'io.callCount': 2,
                'request.callCount': 2
            });
        });

        it('should have sent the original request', function () {
            var err = testrun.response.firstCall.args[0],
                cursor = testrun.response.firstCall.args[1],
                request = testrun.response.firstCall.args[3];

            expect(err).to.be.null;
            expect(cursor).to.include.keys(['ref', 'httpRequestId']);
            expect(request.url.toString()).to.eql('https://postman-echo.com/basic-auth');
        });

        it('should have sent the intermediate request', function () {
            var err = testrun.request.firstCall.args[0],
                request = testrun.request.firstCall.args[3];

            expect(err).to.be.null;
            expect(request.url.toString()).to.equal('https://postman-echo.com/get');
        });

        it('should have the right trace', function () {
            expect(testrun).to.have.property('io').that.nested.include({
                'firstCall.args[2].source': 'fake.auth',
                'secondCall.args[2].source': 'collection'
            });
        });

        it('should have followed auth control flow', function () {
            expect(handlerSpies).to.nested.include({
                'pre.callCount': 2,
                'init.callCount': 1,
                'sign.callCount': 1,
                'post.callCount': 1
            });
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

        it('should have sent two requests in total', function () {
            expect(testrun).to.nested.include({
                'io.callCount': 2,
                'request.callCount': 2
            });
        });

        it('should have sent the original request', function () {
            var err = testrun.response.firstCall.args[0],
                request = testrun.response.firstCall.args[3];

            expect(err).to.be.null;
            expect(request.url.toString()).to.eql('https://postman-echo.com/basic-auth');
        });

        it('should have sent the intermediate request', function () {
            var err = testrun.request.firstCall.args[0],
                request = testrun.request.firstCall.args[3];

            expect(err).to.be.null;
            expect(request.url.toString()).to.eql('https://postman-echo.com/get');
            // @todo: add trace to cursor and enable this test
            // expect(cursor.trace.source).to.equal('fake.auth');
        });

        it('should have followed auth control flow', function () {
            expect(handlerSpies).to.nested.include({
                'pre.callCount': 2,
                'init.callCount': 1,
                'sign.callCount': 1,
                'post.callCount': 1
            });
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

        it('should have sent two requests in total', function () {
            expect(testrun).to.nested.include({
                'io.callCount': 2,
                'request.callCount': 2
            });
        });

        it('should have sent the original request', function () {
            var err = testrun.response.firstCall.args[0],
                request = testrun.response.firstCall.args[3];

            expect(err).to.be.null;
            expect(request.url.toString()).to.eql('https://postman-echo.com/basic-auth');
        });

        it('should have sent the intermediate request, and passed error', function () {
            var err = testrun.request.firstCall.args[0],
                ioErr = testrun.io.firstCall.args[0],
                request = testrun.request.firstCall.args[3];

            expect(err).to.have.property('message', 'getaddrinfo ENOTFOUND bla bla:443');
            expect(ioErr).to.have.property('message', 'getaddrinfo ENOTFOUND bla bla:443');
            expect(request.url.toString()).to.eql('https://bla/blabla');
        });

        it('should have followed auth control flow', function () {
            expect(handlerSpies).to.nested.include({
                'pre.callCount': 1,
                'init.callCount': 0,
                'sign.callCount': 0,
                'post.callCount': 1
            });
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

        it('should have bubbled with max count error', function () {
            var err = testrun.console.lastCall.args[2];

            expect(err).to.include('runtime: maximum intermediate request limit exceeded');
        });

        it('should complete the request with the last response', function () {
            var reqErr = testrun.request.lastCall.args[0],
                resErr = testrun.response.lastCall.args[0],
                response = testrun.response.lastCall.args[2];

            expect(reqErr).to.be.null;
            expect(resErr).to.be.null;
            expect(response).to.have.property('code', 401);
            expect(response.text()).to.include('Unauthorized');
        });
    });
});
