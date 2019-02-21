var expect = require('chai').expect,
    sinon = require('sinon').createSandbox();

describe('backpack.normalise', function () {
    var normalise = require('../../lib/backpack').normalise;

    after(function () {
        sinon.restore();
    });

    it('should exist as a function', function () {
        expect(normalise).to.be.ok;
        expect(normalise).to.be.a('function');
    });

    it('should accept a function sent as callback parameter', function () {
        expect(function () {
            normalise(function () { return 1; });
        }).to.not.throw();
        expect(normalise(function () { return 1; })).to.be.a('function');
    });

    it('should accept an object sent as callback parameter', function () {
        expect(function () { normalise({}); }).to.not.throw();
        expect(normalise({})).to.be.a('function');
    });

    it('should accept garbage sent as callback parameter', function () {
        expect(function () { normalise('garbage'); }).to.not.throw();
        expect(normalise('garbage')).to.be.a('function');
    });

    it('should accept falsey variables sent as callback parameter', function () {
        expect(function () { normalise(); }).to.not.throw();
        expect(normalise()).to.be.a('function');
    });

    it('should have internal flag to ensure it has been normalised', function () {
        expect(normalise()).to.include.key('__normalised');
    });

    it('should expose basic callback flow sub functions', function () {
        expect(normalise()).to.include.keys(['success', 'error', 'done']);
        expect(normalise().success).to.be.a('function');
        expect(normalise().error).to.be.a('function');
        expect(normalise().done).to.be.a('function');
    });

    it('should expose additional flow-control methods as requested', function () {
        expect(normalise({}, ['unexpected'])).to.include.keys(['success', 'error', 'done', 'unexpected']);
        expect(normalise({}, ['unexpected']).unexpected).to.be.a('function');
    });

    it('should execute the callback when normalised callback is called', function () {
        var callback = sinon.spy();

        expect(function () {
            (function (cb) {
                cb = normalise(cb);
                cb(null, 'arg1');
            }(callback));
        }).to.not.throw();

        sinon.assert.calledWith(callback, null, 'arg1');
    });

    it('should execute the callback when normalised callback.success is called', function () {
        var callback = sinon.spy();

        expect(function () {
            (function (cb) {
                cb = normalise(cb);
                cb.success('arg1');
            }(callback));
        }).to.not.throw();

        sinon.assert.calledWith(callback, null, 'arg1');
    });

    it('should execute the callback when normalised callback.done is called', function () {
        var callback = sinon.spy();

        expect(function () {
            (function (cb) {
                cb = normalise(cb);
                cb.done(null, 'arg1');
            }(callback));
        }).to.not.throw();

        sinon.assert.calledWith(callback, null, 'arg1');
    });

    it('should execute the callback when normalised callback.error is called', function () {
        var callback = sinon.spy();

        expect(function () {
            (function (cb) {
                cb = normalise(cb);
                cb.error('error', 'arg1');
            }(callback));
        }).to.not.throw();

        sinon.assert.calledWith(callback, 'error', 'arg1');
    });

    it('should execute the success callback when normalised callback is called without errors', function () {
        var done = sinon.spy(),
            success = sinon.spy(),
            error = sinon.spy();

        expect(function () {
            (function (cb) {
                cb = normalise(cb);
                cb(null, 'arg1');
            }({
                success: success,
                error: error,
                done: done
            }));
        }).to.not.throw();

        sinon.assert.notCalled(error);
        sinon.assert.calledWith(done, null, 'arg1');
        sinon.assert.calledWith(success, 'arg1');
    });

    it('should execute the error callback when normalised callback is called with errors', function () {
        var done = sinon.spy(),
            success = sinon.spy(),
            error = sinon.spy();

        expect(function () {
            (function (cb) {
                cb = normalise(cb);
                cb('err', 'arg1');
            }({
                success: success,
                error: error,
                done: done
            }));
        }).to.not.throw();

        sinon.assert.notCalled(success);
        sinon.assert.calledWith(error, 'err', 'arg1');
        sinon.assert.calledWith(done, 'err', 'arg1');
    });

    it('should not throw error if expected extra callback is called but not passed by user', function () {
        var done = sinon.spy(),
            success = sinon.spy(),
            error = sinon.spy();

        expect(function () {
            (function (cb) {
                cb = normalise(cb, ['custom']);
                cb.custom('arg1');
            }({
                success: success,
                error: error,
                done: done
            }));
        }).to.not.throw();

        sinon.assert.notCalled(success);
        sinon.assert.notCalled(error);
        sinon.assert.notCalled(done);
    });

    it('should not throw error if expected extra custom callback is passed', function () {
        var custom = sinon.spy(),
            done = sinon.spy(),
            success = sinon.spy(),
            error = sinon.spy();

        expect(function () {
            (function (cb) {
                cb = normalise(cb, ['custom']);
                cb.custom('arg1');
            }({
                custom: custom,
                success: success,
                error: error,
                done: done
            }));
        }).to.not.throw();

        sinon.assert.calledWith(custom, 'arg1');
        sinon.assert.notCalled(success);
        sinon.assert.notCalled(error);
        sinon.assert.notCalled(done);
    });
});
