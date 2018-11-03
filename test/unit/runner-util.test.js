var sinon = require('sinon'),
    expect = require('chai').expect,
    runnerUtil = require('../../lib/runner/util');

describe('runner util', function () {
    describe('.safeCall', function () {
        it('should not throw an error if a non function is passed', function () {
            var err = runnerUtil.safeCall('not a function');
            expect(err).to.be.undefined;
        });

        it('should pass arguments correctly', function () {
            var err,
                call,
                func = sinon.spy();

            err = runnerUtil.safeCall(func, {alpha: 'foo'}, 'bar', 'baz');

            expect(err).to.be.undefined;
            expect(func.calledOnce).to.be.true;

            call = func.getCall(0);
            expect(call).to.deep.include({
                thisValue: {alpha: 'foo'},
                args: ['bar', 'baz']
            });
        });

        it('should pass a default global context correctly', function () {
            var err,
                call,
                func = sinon.spy();

            err = runnerUtil.safeCall(func);

            expect(err).to.be.undefined;
            expect(func.calledOnce).to.be.true;

            call = func.getCall(0);
            expect(call).to.deep.include({
                thisValue: global,
                args: []
            });
        });

        it('should correctly handle functions that throw errors', function () {
            var err,
                call,
                func = sinon.stub().throws();

            err = runnerUtil.safeCall(func);

            expect(err).to.be.ok;
            expect(func.calledOnce).to.be.true;

            call = func.getCall(0);
            expect(call).to.deep.include({
                thisValue: global,
                args: []
            });
        });
    });

    describe('.syncObject', function () {
        it('should synchronize the provided objects correctly', function () {
            var target = {delta: 4},
                source = {alpha: 0, beta: 2, gamma: 3};

            runnerUtil.syncObject(target, source);
            expect(target).to.eql(source);
        });
    });
});
