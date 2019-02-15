var expect = require('chai').expect,
    sinon = require('sinon').createSandbox();

describe('backpack.timeback', function () {
    var timeback = require('../../lib/backpack').timeback;

    after(function () {
        sinon.restore();
    });

    it('should exist as a function', function () {
        expect(timeback).to.be.ok;
        expect(timeback).to.be.a('function');
    });

    it('should accept a function sent as callback parameter', function () {
        expect(function () {
            timeback(function () { return 1; });
        }).to.not.throw();
        expect(timeback(function () { return 1; })).to.be.a('function');
    });

    it('should execute the callback with timeout error when a timeout is passed', function (done) {
        var now = Date.now();

        expect(function () {
            timeback(function (err) {
                expect(err).to.be.ok;
                expect(err).to.have.property('message', 'callback timed out');
                expect(Date.now() - now).to.be.greaterThan(9);
                done();
            }, 10);
        }).to.not.throw();
    });

    it('should not fire timeout error if callback is called', function (done) {
        var callback = sinon.spy();

        // execute the callback before timeout value ms
        expect(function () {
            timeback(callback, 10)(null, true);
        }).to.not.throw();

        // do the testing whether callback was called only once
        setTimeout(function () {
            sinon.assert.calledOnce(callback);
            sinon.assert.calledWith(callback, null, true);
            done();
        }, 20);
    });

    it('should accept a scope when calling a timed callback', function (done) {
        var callback = sinon.spy(),
            scope = {};

        // execute the callback before timeout value ms
        expect(function () {
            timeback(callback, 10, scope)(null, true);
        }).to.not.throw();

        // do the testing whether callback was called only once
        setTimeout(function () {
            sinon.assert.calledOnce(callback);
            sinon.assert.calledOn(callback, scope);
            done();
        }, 20);
    });

    it('should accept a scope when calling a timed callback even when timed out', function (done) {
        var callback = sinon.spy(),
            scope = {};

        // create a timeback with the scope
        expect(function () {
            timeback(callback, 10, scope);
        }).to.not.throw();

        // do the testing whether callback was called only once
        setTimeout(function () {
            sinon.assert.calledOnce(callback);
            sinon.assert.calledOn(callback, scope);
            done();
        }, 20);
    });

    it('should execute the timeout hook when timed out', function (done) {
        var callback = sinon.spy(),
            timeout = sinon.spy();

        // create a timeback with the scope
        expect(function () {
            timeback(callback, 10, null, timeout);
        }).to.not.throw();

        // do the testing whether callback was called only once
        setTimeout(function () {
            sinon.assert.calledOnce(callback);
            sinon.assert.calledOnce(timeout);
            done();
        }, 20);
    });

    it('should not execute the timeout hook if genuine callback is called', function (done) {
        var callback = sinon.spy(),
            timeout = sinon.spy();

        // create a timeback with the scope
        expect(function () {
            timeback(callback, 10, null, timeout)(null);
        }).to.not.throw();

        // do the testing whether callback was called only once
        setTimeout(function () {
            sinon.assert.calledOnce(callback);
            sinon.assert.notCalled(timeout);
            done();
        }, 20);
    });
});
