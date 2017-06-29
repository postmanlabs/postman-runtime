/* global describe, it */

var _ = require('lodash'),
    sinon = require('sinon'),
    sdk = require('postman-collection'),
    Authorizer = require('../../../lib/authorizer').Authorizer;

describe('fake auth', function () {
    var testrun,
        fakeHandler = {
            init: function (context, requester, done) {
                done(null);
            },

            pre: function (context, requester, done) {
                done(null, true);
            },

            post: function (context, requester, done) {
                done(null, true);
            },

            _sign: function (request) {
                return request;
            }
        },
        fakeSigner = {
            update: function (params) {
                _.assign(this, params);
            },

            authorize: function (request) {
                return request;
            }
        },
        handlerSpies = {
            pre: sinon.spy(fakeHandler, 'pre'),
            post: sinon.spy(fakeHandler, 'post'),
            _sign: sinon.spy(fakeHandler, '_sign')
        },
        signerSpy = sinon.spy(fakeSigner, 'update');

    before(function (done) {
        sdk.RequestAuth.addType(fakeSigner, 'fake');
        Authorizer.addHandler(fakeHandler, 'fake');

        // perform the collection run
        this.run({
            collection: {
                item: {
                    name: 'FakeAuth',
                    request: {
                        url: 'https://postman-echo.com/basic-auth',
                        auth: {
                            type: 'fake',
                            fake: {
                                username: '{{uname}}',
                                password: '{{pass}}'
                            }
                        }
                    }
                }
            },
            environment: {
                values: [{
                    key: 'uname',
                    value: 'postman'
                }, {
                    key: 'pass',
                    value: 'password'
                }]
            },
            authorizer: {interactive: true}
        }, function (err, results) {
            testrun = results;
            done(err);
        });
    });

    after(function () {
        Authorizer.removeHandler('fake');
        delete sdk.RequestAuth.types.fake; // todo: add a function in the SDK to remove an auth type.
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
