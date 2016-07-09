/* global describe, it */
var expect = require('expect.js'),
    sinon = require('sinon');

describe('backpack.timeback', function () {
    var timeback = require('../../lib/backpack').timeback;

    it('function must exist', function () {
        expect(timeback).to.be.ok();
        expect(timeback).to.be.a('function');
    });

    it('must accept a function sent as callback parameter', function () {
        expect(timeback).withArgs(function () { return 1; }).to.not.throwException();
        expect(timeback(function () { return 1; })).to.be.a('function');
    });

    it('must execute the callback with timeout error when a timeout is passed', function (done) {
        var now = Date.now();

        expect(timeback).withArgs(function (err) {
            expect(err).to.be.ok();
            expect(err && err.message).to.be('callback timed out');
            expect(Date.now() - now).to.be.greaterThan(9);
            done();
        }, 10).to.not.throwException();
    });

    it('must not fire timeout error if callback is called', function (done) {
        var callback = sinon.spy();

        // execute the callback before timeout value ms
        expect(timeback(callback, 10)).withArgs(null, true).to.not.throwException();

        // do the testing whether callback was called only once
        setTimeout(function () {
            sinon.assert.calledOnce(callback);
            sinon.assert.calledWith(callback, null, true);
            done();
        }, 20);
    });

    it('must accept a scope when calling a timed callback', function (done) {
        var callback = sinon.spy(),
            scope = {};

        // execute the callback before timeout value ms
        expect(timeback(callback, 10, scope)).withArgs(null, true).to.not.throwException();

        // do the testing whether callback was called only once
        setTimeout(function () {
            sinon.assert.calledOnce(callback);
            sinon.assert.calledOn(callback, scope);
            done();
        }, 20);
    });

    it('must accept a scope when calling a timed callback even when timed out', function (done) {
        var callback = sinon.spy(),
            scope = {};

        // create a timeback with the scope
        expect(timeback).withArgs(callback, 10, scope).to.not.throwException();

        // do the testing whether callback was called only once
        setTimeout(function () {
            sinon.assert.calledOnce(callback);
            sinon.assert.calledOn(callback, scope);
            done();
        }, 20);
    });

    it('must execute the timeout hook when timed out', function (done) {
        var callback = sinon.spy(),
            timeout = sinon.spy();

        // create a timeback with the scope
        expect(timeback).withArgs(callback, 10, null, timeout).to.not.throwException();

        // do the testing whether callback was called only once
        setTimeout(function () {
            sinon.assert.calledOnce(callback);
            sinon.assert.calledOnce(timeout);
            done();
        }, 20);
    });

    it('must not execute the timeout hook if genuine callback is called', function (done) {
        var callback = sinon.spy(),
            timeout = sinon.spy();

        // create a timeback with the scope
        expect(timeback(callback, 10, null, timeout)).withArgs(null).to.not.throwException();

        // do the testing whether callback was called only once
        setTimeout(function () {
            sinon.assert.calledOnce(callback);
            sinon.assert.notCalled(timeout);
            done();
        }, 20);
    });
});
