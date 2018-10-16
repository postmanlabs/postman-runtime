var expect = require('chai').expect;

describe('run', function () {
    var Run = require('../../lib/runner/run.js');

    it('module should expose a constructor', function () {
        expect(Run).to.be.a('function');
        expect(Run).to.not.throw();
        expect(function () {
            Run({});
        }).to.not.throw();
        expect(new Run()).to.be.an.instanceOf(Run);
    });

    describe.skip('seeking', function () {
        describe('with no item', function () {
            it('should not seek when no item present', function (done) {
                var run = new Run();

                expect(function () {
                    run.seek.bind(run)(0, 0, function (err) {
                        expect(err).to.be.ok;
                        done();
                    });
                }).to.not.throw();
            });
        });

        describe('with one item', function () {
            var run;

            before(function () {
                run = new Run({
                    items: [{}]
                });
            });

            it('should seek once forward', function (done) {
                expect(function () {
                    run.seek.bind(run)(0, 0, function (err, position, cycle) {
                        expect(err).to.not.be.ok;
                        expect(position).to.equal(0);
                        expect(cycle).to.equal(0);
                        done();
                    });
                }).to.not.throw();
            });

            it('should not seek the second time', function (done) {
                expect(function () {
                    run.seek.bind(run)(1, 0, function (err, position, cycle) {
                        expect(err).to.be.ok;
                        expect(position).to.equal(0);
                        expect(cycle).to.equal(0);
                        done();
                    });
                }).to.not.throw();
            });
        });

        describe('with two items', function () {
            var run;

            before(function () {
                run = new Run({
                    items: [{}, {}]
                });
            });

            it('should seek once forward', function (done) {
                expect(function () {
                    run.seek.bind(run)(0, 0, function (err, position, cycle) {
                        expect(err).to.not.be.ok;
                        expect(position).to.equal(0);
                        expect(cycle).to.equal(0);
                        done();
                    });
                }).to.not.throw();
            });

            it('should seek forward the second time', function (done) {
                expect(function () {
                    run.seek.bind(run)(1, 0, function (err, position, cycle) {
                        expect(err).to.not.be.ok;
                        expect(position).to.equal(1);
                        expect(cycle).to.equal(0);
                        done();
                    });
                }).to.not.throw();
            });

            it('should not seek the third time', function (done) {
                expect(function () {
                    run.seek.bind(run)(2, 0, function (err, position, cycle) {
                        expect(err).to.be.ok;
                        expect(position).to.equal(1);
                        expect(cycle).to.equal(0);
                        done();
                    });
                }).to.not.throw();
            });

            it('should not seek to an arbitrary positive item', function (done) {
                expect(function () {
                    run.seek.bind(run)(108, 0, function (err, position, cycle) {
                        expect(err).to.be.ok;
                        expect(position).to.equal(1);
                        expect(cycle).to.equal(0);
                        done();
                    });
                }).to.not.throw();
            });

            it('should not seek to an arbitrary negative item', function (done) {
                expect(function () {
                    run.seek.bind(run)(-108, 0, function (err, position, cycle) {
                        expect(err).to.be.ok;
                        expect(position).to.equal(1);
                        expect(cycle).to.equal(0);
                        done();
                    });
                }).to.not.throw();
            });

            it('should not seek to a garbage item', function (done) {
                run.seek(NaN, 0, function (err, position, cycle) {
                    expect(err).to.be.ok;
                    expect(position).to.equal(1);
                    expect(cycle).to.equal(0);
                    done();
                });
            });
        });
    });
});
