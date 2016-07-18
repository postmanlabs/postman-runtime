/* global describe, it */
var expect = require('expect.js');

describe('backpack.multiback', function () {
    var ensure = require('../../lib/backpack').ensure;

    it('should bind functions', function () {
        expect(ensure).to.be.ok();
        expect(ensure).to.be.a('function');
    });

    it('must accept a function and a context', function () {
        var ctx = {},
            ensured = ensure(function () {
                expect(this).to.be(ctx);
            }, ctx);
        expect(ensured).to.be.a('function');
        ensured();
    });

    it('must accept only a function', function () {
        var ensured = ensure(function () {
            expect(this).to.be(global);
        });
        expect(ensured).to.be.a('function');
        ensured();
    });
});
