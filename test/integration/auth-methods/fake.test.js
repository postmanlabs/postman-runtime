/* global describe, it */

var _ = require('lodash'),
    sinon = require('sinon'),
    sdk = require('postman-collection'),
    Authorizer = require('../../../lib/authorizer/index').Authorizer;

describe('fake auth', function () {
    var fakeSigner = {
            update: function (params) { _.assign(this, params); },
            authorize: function (request) { return request; }
        },
        runOptions = {
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
            authorizer: {interactive: true}
        },
        signerSpy = sinon.spy(fakeSigner, 'update');

    before(function () {
        sdk.RequestAuth.addType(fakeSigner, 'fake');
    });
    after(function () {
        delete sdk.RequestAuth.types.fake; // todo: add a function in the SDK to remove an auth type.
    });

    describe('working init, pre, and post', function () {
        var testrun,
            fakeHandler = {
                init: function (context, requester, done) { done(null); },
                pre: function (context, requester, done) { done(null, true); },
                post: function (context, requester, done) { done(null, true); },
                _sign: function (request) { return request; }
            },
            handlerSpies = {
                pre: sinon.spy(fakeHandler, 'pre'),
                post: sinon.spy(fakeHandler, 'post'),
                _sign: sinon.spy(fakeHandler, '_sign')
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
            fakeSigner.update.reset();
        });

        it('must have completed the run', function () {
            expect(testrun).be.ok();
            expect(testrun.done.calledOnce).be.ok();
            testrun.done.getCall(0).args[0] && console.error(testrun.done.getCall(0).args[0].stack);
            expect(testrun.done.getCall(0).args[0]).to.be(null);
            expect(testrun.start.calledOnce).be.ok();

            // Authorizer flow related assertions
            expect(handlerSpies.pre.calledOnce).to.be.ok();
            expect(handlerSpies.post.calledOnce).to.be.ok();
            expect(handlerSpies._sign.calledOnce).to.be.ok();
            expect(signerSpy.calledThrice).to.be.ok();
        });

        it('must have sent the request once', function () {
            expect(testrun.request.calledOnce).be.ok();

            var err = testrun.request.firstCall.args[0],
                request = testrun.request.firstCall.args[3];

            expect(err).to.be(null);
            expect(request.url.toString()).to.eql('https://postman-echo.com/basic-auth');
        });
    });

    describe('error in post helper', function () {
        var testrun,
            fakeHandler = {
                init: function (context, requester, done) { done(null); },
                pre: function (context, requester, done) { done(null, true); },
                post: function (context, requester, done) { done(new Error('Post err!')); },
                _sign: function (request) { return request; }
            },
            handlerSpies = {
                pre: sinon.spy(fakeHandler, 'pre'),
                post: sinon.spy(fakeHandler, 'post'),
                _sign: sinon.spy(fakeHandler, '_sign')
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
            fakeSigner.update.reset();
        });

        it('must have completed the run', function () {
            expect(testrun).be.ok();
            expect(testrun.done.calledOnce).be.ok();
            testrun.done.getCall(0).args[0] && console.error(testrun.done.getCall(0).args[0].stack);
            expect(testrun.done.getCall(0).args[0]).to.be(null);
            expect(testrun.start.calledOnce).be.ok();

            // Authorizer flow related assertions
            expect(handlerSpies.pre.calledOnce).to.be.ok();
            expect(handlerSpies.post.calledOnce).to.be.ok();
            expect(handlerSpies._sign.calledOnce).to.be.ok();
            expect(signerSpy.calledThrice).to.be.ok();
        });

        it('must have sent the request once', function () {
            expect(testrun.request.calledOnce).be.ok();

            var err = testrun.request.firstCall.args[0],
                request = testrun.request.firstCall.args[3];

            expect(err).to.be(null);
            expect(request.url.toString()).to.eql('https://postman-echo.com/basic-auth');
        });
    });

    describe.skip('false result in post helper', function () {
        var testrun,
            fakeHandler = {
                init: function (context, requester, done) { done(null); },
                pre: function (context, requester, done) { done(null, true); },
                post: function (context, requester, done) { done(null, false); },
                _sign: function (request) { return request; }
            },
            handlerSpies = {
                pre: sinon.spy(fakeHandler, 'pre'),
                post: sinon.spy(fakeHandler, 'post'),
                _sign: sinon.spy(fakeHandler, '_sign')
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
            fakeSigner.update.reset();
        });

        it('must have completed the run', function () {
            expect(testrun).be.ok();
            expect(testrun.done.calledOnce).be.ok();
            testrun.done.getCall(0).args[0] && console.error(testrun.done.getCall(0).args[0].stack);
            expect(testrun.done.getCall(0).args[0]).to.be(null);
            expect(testrun.start.calledOnce).be.ok();

            // Authorizer flow related assertions
            expect(handlerSpies.pre.calledOnce).to.be.ok();
            expect(handlerSpies.post.calledOnce).to.be.ok();
            expect(handlerSpies._sign.calledOnce).to.be.ok();
            expect(signerSpy.calledThrice).to.be.ok();
        });

        it('must have sent the request once', function () {
            expect(testrun.request.calledOnce).be.ok();

            var err = testrun.request.firstCall.args[0],
                request = testrun.request.firstCall.args[3];

            expect(err).to.be(null);
            expect(request.url.toString()).to.eql('https://postman-echo.com/basic-auth');
        });
    });

    describe('error in pre helper', function () {
        var testrun,
            fakeHandler = {
                init: function (context, requester, done) { done(null); },
                pre: function (context, requester, done) { done(new Error('Pre err!')); },
                post: function (context, requester, done) { done(null, true); },
                _sign: function (request) { return request; }
            },
            handlerSpies = {
                pre: sinon.spy(fakeHandler, 'pre'),
                post: sinon.spy(fakeHandler, 'post'),
                _sign: sinon.spy(fakeHandler, '_sign')
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
            fakeSigner.update.reset();
        });

        it('must have completed the run', function () {
            expect(testrun).be.ok();
            expect(testrun.done.calledOnce).be.ok();
            testrun.done.getCall(0).args[0] && console.error(testrun.done.getCall(0).args[0].stack);
            expect(testrun.done.getCall(0).args[0]).to.be(null);
            expect(testrun.start.calledOnce).be.ok();

            // Authorizer flow related assertions
            expect(handlerSpies.pre.calledOnce).to.be.ok();
            expect(handlerSpies.post.notCalled).to.be.ok();
            expect(handlerSpies._sign.notCalled).to.be.ok();
            expect(signerSpy.calledThrice).to.be.ok();
        });

        it('must have sent the request once', function () {
            expect(testrun.request.calledOnce).be.ok();

            var err = testrun.request.firstCall.args[0],
                request = testrun.request.firstCall.args[3];

            expect(err).to.be.ok();
            expect(request.url.toString()).to.eql('https://postman-echo.com/basic-auth');
        });
    });

    describe('error in pre, post helpers', function () {
        var testrun,
            fakeHandler = {
                init: function (context, requester, done) { done(null); },
                pre: function (context, requester, done) { done(new Error('Pre err!')); },
                post: function (context, requester, done) { done(new Error('Post err!')); },
                _sign: function (request) { return request; }
            },
            handlerSpies = {
                pre: sinon.spy(fakeHandler, 'pre'),
                post: sinon.spy(fakeHandler, 'post'),
                _sign: sinon.spy(fakeHandler, '_sign')
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
            fakeSigner.update.reset();
        });

        it('must have completed the run', function () {
            expect(testrun).be.ok();
            expect(testrun.done.calledOnce).be.ok();
            testrun.done.getCall(0).args[0] && console.error(testrun.done.getCall(0).args[0].stack);
            expect(testrun.done.getCall(0).args[0]).to.be(null);
            expect(testrun.start.calledOnce).be.ok();

            // Authorizer flow related assertions
            expect(handlerSpies.pre.calledOnce).to.be.ok();
            expect(handlerSpies.post.notCalled).to.be.ok();
            expect(handlerSpies._sign.notCalled).to.be.ok();
            expect(signerSpy.calledThrice).to.be.ok();
        });

        it('must have sent the request once', function () {
            expect(testrun.request.calledOnce).be.ok();

            var err = testrun.request.firstCall.args[0],
                request = testrun.request.firstCall.args[3];

            expect(err).to.be.ok();
            expect(request.url.toString()).to.eql('https://postman-echo.com/basic-auth');
        });
    });

    describe('error in pre, false result in post helper', function () {
        var testrun,
            fakeHandler = {
                init: function (context, requester, done) { done(null); },
                pre: function (context, requester, done) { done(new Error('Pre err!')); },
                post: function (context, requester, done) { done(null, false); },
                _sign: function (request) { return request; }
            },
            handlerSpies = {
                pre: sinon.spy(fakeHandler, 'pre'),
                post: sinon.spy(fakeHandler, 'post'),
                _sign: sinon.spy(fakeHandler, '_sign')
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
            fakeSigner.update.reset();
        });

        it('must have completed the run', function () {
            expect(testrun).be.ok();
            expect(testrun.done.calledOnce).be.ok();
            testrun.done.getCall(0).args[0] && console.error(testrun.done.getCall(0).args[0].stack);
            expect(testrun.done.getCall(0).args[0]).to.be(null);
            expect(testrun.start.calledOnce).be.ok();

            // Authorizer flow related assertions
            expect(handlerSpies.pre.calledOnce).to.be.ok();
            expect(handlerSpies.post.notCalled).to.be.ok();
            expect(handlerSpies._sign.notCalled).to.be.ok();
            expect(signerSpy.calledThrice).to.be.ok();
        });

        it('must have sent the request once', function () {
            expect(testrun.request.calledOnce).be.ok();

            var err = testrun.request.firstCall.args[0],
                request = testrun.request.firstCall.args[3];

            expect(err).to.be.ok();
            expect(request.url.toString()).to.eql('https://postman-echo.com/basic-auth');
        });
    });

    describe('false result in pre helper', function () {
        var testrun,
            fakeHandler = {
                init: function (context, requester, done) { done(null); },
                pre: function (context, requester, done) { done(null, false); },
                post: function (context, requester, done) { done(null, true); },
                _sign: function (request) { return request; }
            },
            handlerSpies = {
                pre: sinon.spy(fakeHandler, 'pre'),
                post: sinon.spy(fakeHandler, 'post'),
                _sign: sinon.spy(fakeHandler, '_sign')
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
            fakeSigner.update.reset();
        });

        it('must have completed the run', function () {
            expect(testrun).be.ok();
            expect(testrun.done.calledOnce).be.ok();
            testrun.done.getCall(0).args[0] && console.error(testrun.done.getCall(0).args[0].stack);
            expect(testrun.done.getCall(0).args[0]).to.be(null);
            expect(testrun.start.calledOnce).be.ok();

            // Authorizer flow related assertions
            expect(handlerSpies.pre.calledOnce).to.be.ok();
            expect(handlerSpies.post.calledOnce).to.be.ok();
            expect(handlerSpies._sign.calledOnce).to.be.ok();
            expect(signerSpy.calledThrice).to.be.ok();
        });

        it('must have sent the request once', function () {
            expect(testrun.request.calledOnce).be.ok();

            var err = testrun.request.firstCall.args[0],
                request = testrun.request.firstCall.args[3];

            expect(err).to.be(null);
            expect(request.url.toString()).to.eql('https://postman-echo.com/basic-auth');
        });
    });

    describe('false result in pre, error in post helper', function () {
        var testrun,
            fakeHandler = {
                init: function (context, requester, done) { done(null); },
                pre: function (context, requester, done) { done(null, false); },
                post: function (context, requester, done) { done(new Error('Post err!')); },
                _sign: function (request) { return request; }
            },
            handlerSpies = {
                pre: sinon.spy(fakeHandler, 'pre'),
                post: sinon.spy(fakeHandler, 'post'),
                _sign: sinon.spy(fakeHandler, '_sign')
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
            fakeSigner.update.reset();
        });

        it('must have completed the run', function () {
            expect(testrun).be.ok();
            expect(testrun.done.calledOnce).be.ok();
            testrun.done.getCall(0).args[0] && console.error(testrun.done.getCall(0).args[0].stack);
            expect(testrun.done.getCall(0).args[0]).to.be(null);
            expect(testrun.start.calledOnce).be.ok();

            // Authorizer flow related assertions
            expect(handlerSpies.pre.calledOnce).to.be.ok();
            expect(handlerSpies.post.calledOnce).to.be.ok();
            expect(handlerSpies._sign.calledOnce).to.be.ok();
            expect(signerSpy.calledThrice).to.be.ok();
        });

        it('must have sent the request once', function () {
            expect(testrun.request.calledOnce).be.ok();

            var err = testrun.request.firstCall.args[0],
                request = testrun.request.firstCall.args[3];

            expect(err).to.be(null);
            expect(request.url.toString()).to.eql('https://postman-echo.com/basic-auth');
        });
    });

    describe.skip('false results in pre, post helpers', function () {
        var testrun,
            fakeHandler = {
                init: function (context, requester, done) { done(null); },
                pre: function (context, requester, done) { done(null, false); },
                post: function (context, requester, done) { done(null, false); },
                _sign: function (request) { return request; }
            },
            handlerSpies = {
                pre: sinon.spy(fakeHandler, 'pre'),
                post: sinon.spy(fakeHandler, 'post'),
                _sign: sinon.spy(fakeHandler, '_sign')
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
            fakeSigner.update.reset();
        });

        it('must have completed the run', function () {
            expect(testrun).be.ok();
            expect(testrun.done.calledOnce).be.ok();
            testrun.done.getCall(0).args[0] && console.error(testrun.done.getCall(0).args[0].stack);
            expect(testrun.done.getCall(0).args[0]).to.be(null);
            expect(testrun.start.calledOnce).be.ok();

            // Authorizer flow related assertions
            expect(handlerSpies.pre.calledOnce).to.be.ok();
            expect(handlerSpies.post.calledOnce).to.be.ok();
            expect(handlerSpies._sign.calledOnce).to.be.ok();
            expect(signerSpy.calledThrice).to.be.ok();
        });

        it('must have sent the request once', function () {
            expect(testrun.request.calledOnce).be.ok();

            var err = testrun.request.firstCall.args[0],
                request = testrun.request.firstCall.args[3];

            expect(err).to.be(null);
            expect(request.url.toString()).to.eql('https://postman-echo.com/basic-auth');
        });
    });

    describe('error in init helper', function () {
        var testrun,
            fakeHandler = {
                init: function (context, requester, done) { done(new Error('Init err!')); },
                pre: function (context, requester, done) { done(null, true); },
                post: function (context, requester, done) { done(null, true); },
                _sign: function (request) { return request; }
            },
            handlerSpies = {
                pre: sinon.spy(fakeHandler, 'pre'),
                post: sinon.spy(fakeHandler, 'post'),
                _sign: sinon.spy(fakeHandler, '_sign')
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
            fakeSigner.update.reset();
        });

        it('must have completed the run', function () {
            expect(testrun).be.ok();
            expect(testrun.done.calledOnce).be.ok();
            testrun.done.getCall(0).args[0] && console.error(testrun.done.getCall(0).args[0].stack);
            expect(testrun.done.getCall(0).args[0]).to.be(null);
            expect(testrun.start.calledOnce).be.ok();

            // Authorizer flow related assertions
            expect(handlerSpies.pre.calledOnce).to.be.ok();
            expect(handlerSpies.post.calledOnce).to.be.ok();
            expect(handlerSpies._sign.calledOnce).to.be.ok();
            expect(signerSpy.calledThrice).to.be.ok();
        });

        it('must have sent the request once', function () {
            expect(testrun.request.calledOnce).be.ok();

            var err = testrun.request.firstCall.args[0],
                request = testrun.request.firstCall.args[3];

            expect(err).to.be(null);
            expect(request.url.toString()).to.eql('https://postman-echo.com/basic-auth');
        });
    });

    describe('error in init, post helpers', function () {
        var testrun,
            fakeHandler = {
                init: function (context, requester, done) { done(new Error('Init err!')); },
                pre: function (context, requester, done) { done(null, true); },
                post: function (context, requester, done) { done(new Error('Post err!')); },
                _sign: function (request) { return request; }
            },
            handlerSpies = {
                pre: sinon.spy(fakeHandler, 'pre'),
                post: sinon.spy(fakeHandler, 'post'),
                _sign: sinon.spy(fakeHandler, '_sign')
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
            fakeSigner.update.reset();
        });

        it('must have completed the run', function () {
            expect(testrun).be.ok();
            expect(testrun.done.calledOnce).be.ok();
            testrun.done.getCall(0).args[0] && console.error(testrun.done.getCall(0).args[0].stack);
            expect(testrun.done.getCall(0).args[0]).to.be(null);
            expect(testrun.start.calledOnce).be.ok();

            // Authorizer flow related assertions
            expect(handlerSpies.pre.calledOnce).to.be.ok();
            expect(handlerSpies.post.calledOnce).to.be.ok();
            expect(handlerSpies._sign.calledOnce).to.be.ok();
            expect(signerSpy.calledThrice).to.be.ok();
        });

        it('must have sent the request once', function () {
            expect(testrun.request.calledOnce).be.ok();

            var err = testrun.request.firstCall.args[0],
                request = testrun.request.firstCall.args[3];

            expect(err).to.be(null);
            expect(request.url.toString()).to.eql('https://postman-echo.com/basic-auth');
        });
    });

    describe.skip('error in init, false result in post helper', function () {
        var testrun,
            fakeHandler = {
                init: function (context, requester, done) { done(new Error('Init err!')); },
                pre: function (context, requester, done) { done(null, true); },
                post: function (context, requester, done) { done(null, false); },
                _sign: function (request) { return request; }
            },
            handlerSpies = {
                pre: sinon.spy(fakeHandler, 'pre'),
                post: sinon.spy(fakeHandler, 'post'),
                _sign: sinon.spy(fakeHandler, '_sign')
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
            fakeSigner.update.reset();
        });

        it('must have completed the run', function () {
            expect(testrun).be.ok();
            expect(testrun.done.calledOnce).be.ok();
            testrun.done.getCall(0).args[0] && console.error(testrun.done.getCall(0).args[0].stack);
            expect(testrun.done.getCall(0).args[0]).to.be(null);
            expect(testrun.start.calledOnce).be.ok();

            // Authorizer flow related assertions
            expect(handlerSpies.pre.calledOnce).to.be.ok();
            expect(handlerSpies.post.calledOnce).to.be.ok();
            expect(handlerSpies._sign.calledOnce).to.be.ok();
            expect(signerSpy.calledThrice).to.be.ok();
        });

        it('must have sent the request once', function () {
            expect(testrun.request.calledOnce).be.ok();

            var err = testrun.request.firstCall.args[0],
                request = testrun.request.firstCall.args[3];

            expect(err).to.be(null);
            expect(request.url.toString()).to.eql('https://postman-echo.com/basic-auth');
        });
    });
});
