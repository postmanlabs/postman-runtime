/* global describe, it, beforeEach, afterEach */

var _ = require('lodash'),
    expect = require('expect.js'),
    sdk = require('postman-collection');

describe('authorizer sanity', function () {
    var Authorizer = require('../../lib/authorizer/index').Authorizer;

    it('should expose an constructor', function () {
        expect(Authorizer).to.be.a('function');
    });

    it('should be an asynchronous constructor', function (done) {
        // eslint-disable-next-line no-new
        new Authorizer(function (err, authorizer) {
            if (err) { return done(err); }

            expect(authorizer).to.be.an(Authorizer);
            done();
        });
    });

    it('should expose a create function', function (done) {
        Authorizer.create(function (err, authorizer) {
            if (err) { return done(err); }

            expect(authorizer).to.be.an(Authorizer);
            done();
        });
    });

    it('should accept interactivity options as a boolean', function (done) {
        // eslint-disable-next-line no-new
        new Authorizer({interactive: true}, function (err, authorizer) {
            if (err) { return done(err); }

            expect(authorizer).to.be.an(Authorizer);

            _.forEach(Authorizer.Handlers, function (handler, name) {
                expect(authorizer.interactive).to.have.property(name, true);
            });
            done();
        });
    });

    it('should accept interactivity options as an object', function (done) {
        var interactivity = {ntlm: true};

        // eslint-disable-next-line no-new
        new Authorizer({
            interactive: interactivity
        }, function (err, authorizer) {
            if (err) { return done(err); }

            expect(authorizer).to.be.an(Authorizer);

            expect(authorizer.interactive).to.eql(interactivity);
            done();
        });
    });

    describe('inject new auth types dynamically', function () {
        var fakeHandler = {
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
            };

        afterEach(function () {
            Authorizer.removeHandler('fake');

            // todo: add a function in the SDK to remove an auth type.
            delete sdk.RequestAuth.types.fake;
        });

        it('should allow dynamically injecting new auth types', function () {
            expect(sdk.RequestAuth.addType.bind(sdk.RequestAuth)).withArgs(fakeSigner, 'fake').to.not.throwException();
            expect(Authorizer.addHandler.bind(Authorizer)).withArgs(fakeHandler, 'fake').to.not.throwException();
        });

        it('should perform validations when injecting new auth types', function () {
            expect(sdk.RequestAuth.addType.bind(sdk.RequestAuth)).withArgs(fakeSigner, 'fake').to.not.throwException();

            expect(Authorizer.addHandler.bind(Authorizer))
                .withArgs(_.omit(fakeHandler, 'pre'), 'fake') // do not provide the "pre" callback
                .to.throwException(function (e) {
                    expect(e.message).to.match(/"pre"/);
                });
        });

        // @todo - we can remove this later
        it('should add a hidden type to each handler', function () {
            var faked;

            sdk.RequestAuth.addType(fakeSigner, 'fake');
            Authorizer.addHandler(fakeHandler, 'fake');

            faked = new sdk.RequestAuth.types.fake();

            expect(faked).to.have.property('__auth_type', 'fake');

            // ensure that the property is hidden, and not accidentally serialized
            expect(faked.toJSON()).to.not.have.property('__auth_type');
        });
    });

    describe('functionality', function () {
        var authorizer,
            context,
            run;

        beforeEach(function (done) {
            var fakeHandler = {
                    init: function (context, requester, done) {
                        this.teststring = 'teststring';
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
                };
            sdk.RequestAuth.addType(fakeSigner, 'fake');
            Authorizer.addHandler(fakeHandler, 'fake');

            Authorizer.create({interactive: true}, function (err, a) {
                if (err) { return done(err); }

                authorizer = a;
                context = {
                    auth: new sdk.RequestAuth.types.fake()
                };
                run = {
                    requester: new (require('../../lib/requester').RequesterPool)()
                };
                done();
            });
        });

        afterEach(function () {
            Authorizer.removeHandler('fake');
            delete sdk.RequestAuth.types.fake; // todo: add a function in the SDK to remove an auth type.

            authorizer = undefined;
            context = undefined;
            run = undefined;
        });

        it('should correctly pre-verify', function (done) {
            authorizer.preVerify(context, run, function (err, result) {
                if (err) { return done(err); }

                expect(result).to.be(true);
                done();
            });
        });

        it('should correctly initialize', function (done) {
            authorizer.init(context, run, function (err) {
                if (err) { return done(err); }

                expect(context.auth).to.have.property('teststring', 'teststring');
                done();
            });
        });

        it('should correctly post-verify', function (done) {
            authorizer.postVerify(context, run, function (err, result) {
                if (err) { return done(err); }

                expect(result).to.be(true);
                done();
            });
        });
    });
});
