var _ = require('lodash'),
    expect = require('chai').expect,
    Ajv = require('ajv'),
    ajv = new Ajv(),
    AuthLoader = require('../../../lib/authorizer').AuthLoader,
    manifestSchema = require('../../fixtures/auth-manifest-schema.json');

describe('manifest', function () {
    var authHandlers = AuthLoader.handlers;
    _.forEach(authHandlers, function (value, key) {
        it('should be valid for ' + key + ' auth', function () {
            ajv.validate(manifestSchema, value.manifest);

            // this gives meaningful assertions for failures than asserting on boolean return
            expect(ajv).to.have.property('errors', null);
        });
    });
});
