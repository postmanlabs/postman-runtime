/* global describe, it, before */

var expect = require('expect.js');

describe('run', function () {
    var Run = require('../../lib/runner/run.js');

    it('module must expose a constructor', function () {
        expect(Run).to.be.a('function');
        expect(Run).withArgs().to.not.throwError();
        expect(Run).withArgs({}).to.not.throwError();
        expect(new Run()).to.be.a(Run);
    });

    describe.skip('seeking', function () {
        describe('with no item', function () {
            it('must not seek when no item present', function (done) {
                var run = new Run();

                expect(run.seek.bind(run)).withArgs(0, 0, function (err) {
                    expect(err).to.be.ok();
                    done();
                }).to.not.throwError();
            });
        });

        describe('with one item', function () {
            var run;

            before(function () {
                run = new Run({
                    items: [{}]
                });
            });

            it('must seek once forward', function (done) {
                expect(run.seek.bind(run)).withArgs(0, 0, function (err, position, cycle) {
                    expect(err).to.not.be.ok();
                    expect(position).to.be(0);
                    expect(cycle).to.be(0);
                    done();
                }).to.not.throwError();
            });

            it('must not seek the second time', function (done) {
                expect(run.seek.bind(run)).withArgs(1, 0, function (err, position, cycle) {
                    expect(err).to.be.ok();
                    expect(position).to.be(0);
                    expect(cycle).to.be(0);
                    done();
                }).to.not.throwError();
            });
        });

        describe('with two items', function () {
            var run;

            before(function () {
                run = new Run({
                    items: [{}, {}]
                });
            });

            it('must seek once forward', function (done) {
                expect(run.seek.bind(run)).withArgs(0, 0, function (err, position, cycle) {
                    expect(err).to.not.be.ok();
                    expect(position).to.be(0);
                    expect(cycle).to.be(0);
                    done();
                }).to.not.throwError();
            });

            it('must seek forward the second time', function (done) {
                expect(run.seek.bind(run)).withArgs(1, 0, function (err, position, cycle) {
                    expect(err).to.not.be.ok();
                    expect(position).to.be(1);
                    expect(cycle).to.be(0);
                    done();
                }).to.not.throwError();
            });

            it('must not seek the third time', function (done) {
                expect(run.seek.bind(run)).withArgs(2, 0, function (err, position, cycle) {
                    expect(err).to.be.ok();
                    expect(position).to.be(1);
                    expect(cycle).to.be(0);
                    done();
                }).to.not.throwError();
            });

            it('must not seek to an arbitrary positive item', function (done) {
                expect(run.seek.bind(run)).withArgs(108, 0, function (err, position, cycle) {
                    expect(err).to.be.ok();
                    expect(position).to.be(1);
                    expect(cycle).to.be(0);
                    done();
                }).to.not.throwError();
            });

            it('must not seek to an arbitrary negative item', function (done) {
                expect(run.seek.bind(run)).withArgs(-108, 0, function (err, position, cycle) {
                    expect(err).to.be.ok();
                    expect(position).to.be(1);
                    expect(cycle).to.be(0);
                    done();
                }).to.not.throwError();
            });

            it('must not seek to a garbage item', function (done) {
                run.seek(NaN, 0, function (err, position, cycle) {
                    expect(err).to.be.ok();
                    expect(position).to.be(1);
                    expect(cycle).to.be(0);
                    done();
                });
            });
        });
    });
});
