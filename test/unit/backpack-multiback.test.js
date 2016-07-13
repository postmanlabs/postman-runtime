/* global describe, it */
var expect = require('expect.js'),
    sinon = require('sinon');

describe('backpack.multiback', function () {
    var multiback = require('../../lib/backpack').multiback;

    it('function must exist', function () {
        expect(multiback).to.be.ok();
        expect(multiback).to.be.a('function');
    });

    it('must accept empty flags and a callback', function () {
        expect(multiback).withArgs([], function () { return 1; }).to.not.throwException();
        expect(multiback([], function () { return 1; })).to.be.a('function');
    });

    it('must execute callback on first try when no flags', function (done) {
        var callback = sinon.spy(setImmediate.bind(this, done));

        done = multiback([], callback);
        sinon.assert.notCalled(callback);

        done();
        sinon.assert.calledOnce(callback);
    });

    it('must execute callback on first flag', function (done) {
        done = multiback(['flag1'], done);
        done(null, 'flag1', true);
    });

    it('must execute callback when all flags are truthy', function (done) {
        var callback = sinon.spy(setImmediate.bind(this, done));

        done = multiback(['flag1', 'flag2'], callback);
        sinon.assert.notCalled(callback);

        done(null, 'flag1', 1);
        sinon.assert.notCalled(callback);

        done(null, 'flag2', 2);
        sinon.assert.calledOnce(callback);
    });

    it('must early call on error and callback only once', function (done) {
        var callback = sinon.spy(function (err) {
                expect(err).be(true);
                setImmediate(done); // to wait for last expects
            }),
            flagback;

        flagback = multiback(['flag1', 'flag2'], callback);
        sinon.assert.notCalled(callback);

        flagback(true, 'flag1', 1);
        sinon.assert.calledOnce(callback);

        flagback(null, 'flag2', 2);
        sinon.assert.calledOnce(callback);
    });

    it('can pass a definitive set of arguments', function (done) {
        var callback = sinon.spy(setImmediate.bind(this, done)),
            flagback;

        flagback = multiback(['flag1', 'flag2'], callback, [null, true]);
        sinon.assert.notCalled(callback);

        flagback(null, 'flag1', 1);
        flagback(null, 'flag2', 2);
        sinon.assert.calledOnce(callback);
        sinon.assert.calledWith(callback, null, true);
    });

    it('should not pass a definitive set of arguments on error', function (done) {
        var callback = sinon.spy(function (err, res) {
                expect(err).be('err');
                expect(res).be(undefined);
                setImmediate(done); // to wait for last expects
            }),
            flagback;

        flagback = multiback(['flag1', 'flag2'], callback, [null, true]);
        sinon.assert.notCalled(callback);

        flagback(null, 'flag1', 1);
        flagback('err', 'flag2', 2);
        sinon.assert.calledOnce(callback);
        sinon.assert.calledWith(callback, 'err');
    });

    it.skip('should not suppress repeated callback for success flag', function () {
        var callback = sinon.spy(function () { return 1; }),
            flagback;

        flagback = multiback(['flag1', 'flag2'], callback, [null, true]);
        sinon.assert.notCalled(callback);

        flagback(null, 'flag1', 1);
        flagback(null, 'flag2', 2);
        flagback(null, 'flag2', 3);
        sinon.assert.calledTwice(callback);
    });
});
