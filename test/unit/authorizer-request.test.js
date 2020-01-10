var expect = require('chai').expect,
    sdk = require('postman-collection'),
    _ = require('lodash'),

    authorizer = require('../../lib/authorizer'),
    authorizeRequest = authorizer.authorizeRequest,

    Request = sdk.Request,
    rawRequests = require('../fixtures/auth-requests');

describe('.authorizeRequest (Static function)', function () {
    it('should authorize a request statically', function () {
        var request = new Request(rawRequests.basic);

        authorizeRequest(request, function (err, signedRequest) {
            var headers = signedRequest.headers.all(),
                authHeader = headers[0];

            expect(err).to.be.null;
            expect(authHeader.toString()).to.eql('Authorization: Basic YWJoaWppdDprYW5l');
        });
    });

    it('should return without any error when auth is not present in the request', function () {
        var request = new Request(_.omit(rawRequests.basic, 'auth'));

        authorizeRequest(request, function (err, signedRequest) {
            expect(err).to.be.undefined;
            expect(signedRequest).to.be.undefined;
        });
    });

    it('should return error when handler is not found for a given auth', function () {
        var fakeAuth = {
                type: 'fake',
                fake: {
                    user: 'user',
                    pass: 'pass'
                }
            },
            request = new Request(_.assign({}, rawRequests.basic, {auth: fakeAuth}));

        authorizeRequest(request, function (err, signedRequest) {
            expect(err).not.to.be.undefined;
            expect(err.message).to.equal('runtime~authorizeRequest: could not find handler for auth type fake');
            expect(signedRequest).to.be.undefined;
        });
    });

    it('should return without error when required auth params are absent', function () {
        _.forEach(authorizer.AuthLoader.handlers, function (handler, authName) {
            var authWithoutParams = {type: authName},
                request;

            // set auth without any params
            authWithoutParams[authName] = {};

            request = new Request(_.assign({}, rawRequests.basic, {auth: authWithoutParams}));

            authorizeRequest(request, function (err) {
                expect(err, authName).to.not.be.ok;
            });
        });
    });
});
