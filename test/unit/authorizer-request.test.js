var expect = require('expect.js'),
    sdk = require('postman-collection'),
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
});
