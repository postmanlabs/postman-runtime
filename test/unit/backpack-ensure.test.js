/* global describe, it */
var expect = require('expect.js'),
    sinon = require('sinon');

describe('backpack.ensure', function () {
    var ensure = require('../../lib/backpack').ensure;

    it('should return a function if the original argument is a function and not otherwise', function () {
        var fn = function () { return 1; };

        expect(ensure(fn)).be(fn);
        expect(ensure('blah')).be(undefined);
        expect(ensure(1234)).be(undefined);
    });

    it('must execute original function that was ensured', function () {
        var fn = sinon.spy(),
            ensured = ensure(fn);

        // call the ensured function and test if original was executed
        ensured('hello');

        sinon.assert.calledOnce(fn);
        sinon.assert.calledWith(fn, 'hello');
    });

    it('must bind the function to a context', function () {
        var fn = sinon.spy(),
            ctx = {},
            ensured = ensure(fn, ctx);

        // call the ensured function and test if original was executed
        ensured('hello');

        sinon.assert.calledOnce(fn);
        sinon.assert.calledWith(fn, 'hello');
        sinon.assert.calledOn(fn, ctx);
    });
});
