/* global describe, it */
var expect = require('expect.js'),
    sinon = require('sinon');

describe('backpack.normalise', function () {
    var normalise = require('../../lib/backpack').normalise;

    it('function must exist', function () {
        expect(normalise).to.be.ok();
        expect(normalise).to.be.a('function');
    });

    it('must accept a function sent as callback parameter', function () {
        expect(normalise).withArgs(function () { return 1; }).to.not.throwException();
        expect(normalise(function () { return 1; })).to.be.a('function');
    });

    it('must accept an object sent as callback parameter', function () {
        expect(normalise).withArgs({}).to.not.throwException();
        expect(normalise({})).to.be.a('function');
    });

    it('must accept garbage sent as callback parameter', function () {
        expect(normalise).withArgs('garbage').to.not.throwException();
        expect(normalise('garbage')).to.be.a('function');
    });

    it('must accept falsey variables sent as callback parameter', function () {
        expect(normalise).withArgs().to.not.throwException();
        expect(normalise()).to.be.a('function');
    });

    it('must have internal flag to ensure it has been normalised', function () {
        expect(normalise()).to.have.key('__normalised');
    });

    it('must expose basic callback flow sub functions', function () {
        expect(normalise()).to.have.keys('success', 'error', 'done');
        expect(normalise().success).to.be.a('function');
        expect(normalise().error).to.be.a('function');
        expect(normalise().done).to.be.a('function');
    });

    it('must expose additional flow-control methods as requested', function () {
        expect(normalise({}, ['unexpected'])).to.have.keys('success', 'error', 'done', 'unexpected');
        expect(normalise({}, ['unexpected']).unexpected).to.be.a('function');
    });

    it('must execute the callback when normalised callback is called', function () {
        var callback = sinon.spy();

        expect(function (cb) {
            cb = normalise(cb);
            cb(null, 'arg1');
        }).withArgs(callback).to.not.throwError();

        sinon.assert.calledWith(callback, null, 'arg1');
    });

    it('must execute the callback when normalised callback.success is called', function () {
        var callback = sinon.spy();

        expect(function (cb) {
            cb = normalise(cb);
            cb.success('arg1');
        }).withArgs(callback).to.not.throwError();

        sinon.assert.calledWith(callback, null, 'arg1');
    });

    it('must execute the callback when normalised callback.done is called', function () {
        var callback = sinon.spy();

        expect(function (cb) {
            cb = normalise(cb);
            cb.done(null, 'arg1');
        }).withArgs(callback).to.not.throwError();

        sinon.assert.calledWith(callback, null, 'arg1');
    });

    it('must execute the callback when normalised callback.error is called', function () {
        var callback = sinon.spy();

        expect(function (cb) {
            cb = normalise(cb);
            cb.error('error', 'arg1');
        }).withArgs(callback).to.not.throwError();

        sinon.assert.calledWith(callback, 'error', 'arg1');
    });

    it('must execute the success callback when normalised callback is called without errors', function () {
        var done = sinon.spy(),
            success = sinon.spy(),
            error = sinon.spy();

        expect(function (cb) {
            cb = normalise(cb);
            cb(null, 'arg1');
        }).withArgs({
            success: success,
            error: error,
            done: done
        }).to.not.throwError();

        sinon.assert.notCalled(error);
        sinon.assert.calledWith(done, null, 'arg1');
        sinon.assert.calledWith(success, 'arg1');
    });

    it('must execute the error callback when normalised callback is called with errors', function () {
        var done = sinon.spy(),
            success = sinon.spy(),
            error = sinon.spy();

        expect(function (cb) {
            cb = normalise(cb);
            cb('err', 'arg1');
        }).withArgs({
            success: success,
            error: error,
            done: done
        }).to.not.throwError();

        sinon.assert.notCalled(success);
        sinon.assert.calledWith(error, 'err', 'arg1');
        sinon.assert.calledWith(done, 'err', 'arg1');
    });

    it('must not throw error if expected extra callback is called but not passed by user', function () {
        var done = sinon.spy(),
            success = sinon.spy(),
            error = sinon.spy();

        expect(function (cb) {
            cb = normalise(cb, ['custom']);
            cb.custom('arg1');
        }).withArgs({
            success: success,
            error: error,
            done: done
        }).to.not.throwError();

        sinon.assert.notCalled(success);
        sinon.assert.notCalled(error);
        sinon.assert.notCalled(done);
    });

    it('must not throw error if expected extra custom callback is passed', function () {
        var custom = sinon.spy(),
            done = sinon.spy(),
            success = sinon.spy(),
            error = sinon.spy();

        expect(function (cb) {
            cb = normalise(cb, ['custom']);
            cb.custom('arg1');
        }).withArgs({
            custom: custom,
            success: success,
            error: error,
            done: done
        }).to.not.throwError();

        sinon.assert.calledWith(custom, 'arg1');
        sinon.assert.notCalled(success);
        sinon.assert.notCalled(error);
        sinon.assert.notCalled(done);
    });
});
