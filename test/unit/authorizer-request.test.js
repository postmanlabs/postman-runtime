var expect = require('expect.js'),
    sdk = require('postman-collection'),
    _ = require('lodash'),

    authorizeRequest = require('../../lib/authorizer').authorizeRequest,

    Request = sdk.Request,
    rawRequests = require('../fixtures/auth-requests');

/* global describe, it */
describe('.authorizeRequest (Static function)', function () {
    it('must authorize a request statically', function () {
        var request = new Request(rawRequests.basic);

        authorizeRequest(request, function (err, signedRequest) {
            var headers = signedRequest.headers.all(),
                authHeader = headers[0];

            expect(err).to.be(null);
            expect(authHeader.toString()).to.eql('Authorization: Basic YWJoaWppdDprYW5l');
        });
    });

    it('must return without any error when auth is not present in the request', function () {
        var request = new Request(_.omit(rawRequests.basic, 'auth'));

        authorizeRequest(request, function (err, signedRequest) {
            expect(err).to.be(undefined);
            expect(signedRequest).to.be(undefined);
        });
    });

    it('must return error when handler is not found for a given auth', function () {
        var fakeAuth = {
                type: 'fake',
                fake: {
                    user: 'user',
                    pass: 'pass'
                }
            },
            request = new Request(_.assign({}, rawRequests.basic, {auth: fakeAuth}));

        authorizeRequest(request, function (err, signedRequest) {
            expect(err).not.to.be(undefined);
            expect(err.message).to.be('runtime~authorizeRequest: could not find handler for auth type fake');
            expect(signedRequest).to.be(undefined);
        });
    });
});
