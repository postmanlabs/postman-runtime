var _ = require('lodash'),
    expect = require('expect.js'),
    AuthLoader = require('../../lib/authorizer').AuthLoader;

/* global describe, it */
describe('Auth Loader', function () {
    afterEach(function () {
        AuthLoader.removeHandler('fake');
    });

    describe('.addHandler', function () {
        it('should add handler for a valid Handler', function () {
            var FakeAuth = {
                pre: _.noop,
                init: _.noop,
                sign: _.noop,
                post: _.noop
            };

            AuthLoader.addHandler(FakeAuth, 'fake');

            expect(AuthLoader.handlers).to.have.property('fake', FakeAuth);
            expect(AuthLoader.handlers.fake).to.have.property('__auth_type', 'fake');
        });

        it('should throw if pre, init, sign or post is not implemented', function () {
            var FakeAuth = {
                init: _.noop,
                sign: _.noop,
                post: _.noop
            };
            expect(AuthLoader.addHandler).withArgs(_.omit(FakeAuth, 'pre'))
                .to.throwError('The handler for "fake" does not have an "pre" function, which is necessary');
            expect(AuthLoader.addHandler).withArgs(_.omit(FakeAuth, 'init'))
                .to.throwError('The handler for "fake" does not have an "init" function, which is necessary');
            expect(AuthLoader.addHandler).withArgs(_.omit(FakeAuth, 'sign'))
                .to.throwError('The handler for "fake" does not have an "sign" function, which is necessary');
            expect(AuthLoader.addHandler).withArgs(_.omit(FakeAuth, 'post'))
                .to.throwError('The handler for "fake" does not have an "post" function, which is necessary');
        });
    });

    describe('.getHandler', function () {
        it('should return the Handler for a type', function () {
            var FakeAuth = {
                    pre: _.noop,
                    init: _.noop,
                    sign: _.noop,
                    post: _.noop
                },
                authType = 'fake',
                handler;

            AuthLoader.addHandler(FakeAuth, authType);

            handler = AuthLoader.getHandler(authType);

            expect(handler).to.equal(FakeAuth);
            expect(handler).to.have.property('__auth_type', authType);
        });

        it('should return undefined if no Handler is found for a type', function () {
            var handler;

            expect(AuthLoader.getHandler).withArgs('fake').to.not.throwException();
            expect(handler).to.be(undefined);
        });
    });

    describe('.removeHandler', function () {
        it('should remove a handler', function () {
            var FakeAuth = {
                    pre: _.noop,
                    init: _.noop,
                    sign: _.noop,
                    post: _.noop
                },
                authType = 'fake';

            AuthLoader.addHandler(FakeAuth, authType);
            AuthLoader.removeHandler(authType);

            expect(AuthLoader.handlers).to.not.have.property(authType);
        });

        it('should not throw for missing handler', function () {
            expect(AuthLoader.removeHandler).withArgs('fake').to.not.throwException();
        });
    });
});
