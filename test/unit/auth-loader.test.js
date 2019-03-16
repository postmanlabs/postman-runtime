var _ = require('lodash'),
    expect = require('chai').expect,
    AuthLoader = require('../../lib/authorizer').AuthLoader;

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
                    pre: _.noop,
                    init: _.noop,
                    sign: _.noop,
                    post: _.noop
                },
                authType = 'fake';

            expect(function () {
                AuthLoader.addHandler(_.omit(FakeAuth, 'pre'), authType);
            }).to.throw(/does not have a "pre" function/);
            expect(function () {
                AuthLoader.addHandler(_.omit(FakeAuth, 'init'), authType);
            }).to.throw(/does not have an "init" function/);
            expect(function () {
                AuthLoader.addHandler(_.omit(FakeAuth, 'sign'), authType);
            }).to.throw(/does not have a "sign" function/);
            expect(function () {
                AuthLoader.addHandler(_.omit(FakeAuth, 'post'), authType);
            }).to.throw(/does not have a "post" function/);
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

            expect(function () {
                AuthLoader.getHandler('fake');
            }).to.not.throw();
            expect(handler).to.be.undefined;
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

            expect(AuthLoader.handlers).to.not.have.property('authType');
        });

        it('should not throw for missing handler', function () {
            expect(function () {
                AuthLoader.removeHandler('fake');
            }).to.not.throw();
        });
    });
});
