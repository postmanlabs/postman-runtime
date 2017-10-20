/* global describe, it */
var _ = require('lodash'),
    expect = require('expect.js'),
    Runner = require('../../lib/runner/'),
    sdk = require('postman-collection');

describe('runner', function () {
    describe('Run', function () {
        it('must be a constructor', function () {
            expect(function () {
                return new Runner();
            }).withArgs().to.not.throwError();
        });

        it('must expose the run method', function () {
            var runner = new Runner();
            expect(runner.run).to.be.a('function');
        });

        describe('.run', function () {
            var collection = new sdk.Collection({
                item: [{
                    id: 'F2', // This is intended, so that id vs name match precedence can be tested
                    name: 'F1',
                    item: [{
                        name: 'F1.R1',
                        request: 'https://postman-echo.com/get'
                    }]
                }, {
                    name: 'F2',
                    item: [{
                        name: 'F1.R2',
                        request: 'https://postman-echo.com/get'
                    }]
                }]
            });

            describe('invalid entrypoint', function () {
                it('must bail out if options.abortOnError is set', function (done) {
                    var runner = new Runner();

                    runner.run(collection, {
                        entrypoint: 'random',
                        abortOnError: true
                    }, function (err, run) {
                        expect(err.message).to.be('Unable to find a folder or request: random');
                        expect(run).to.not.be.ok();

                        done();
                    });
                });

                it('must NOT bail out if options.abortOnError is not set', function (done) {
                    var runner = new Runner();

                    runner.run(collection, {
                        entrypoint: 'random'
                    }, function (err, run) {
                        expect(err).to.not.be.ok();

                        expect(run).to.be.ok();
                        expect(run.start).to.be.a('function');
                        done();
                    });
                });
            });

            describe('malformed collections', function () {
                it('should handle invalid collections correctly', function (done) {
                    var runner = new Runner();

                    runner.run('random', {}, function (err, run) {
                        expect(err).to.be(null);
                        expect(run).to.be.ok();
                        expect(run.state.items).to.eql([]);

                        done();
                    });
                });
            });

            describe('edge cases', function () {
                it('should handle malformed run options correctly', function (done) {
                    var runner = new Runner();

                    runner.run(collection, 'random', function (err, run) {
                        expect(err).to.not.be.ok();

                        expect(run).to.be.ok();
                        expect(run.start).to.be.a('function');
                        done();
                    });
                });

                it('should override prototype globals with those passed from the run options', function (done) {
                    var runner = new Runner({
                        globals: new sdk.VariableScope({}, [{key: 'alpha', value: 'foo'}])
                    });

                    runner.run(collection, {
                        globals: new sdk.VariableScope({}, [{key: 'beta', value: 'bar'}])
                    }, function (err, run) {
                        expect(err).to.not.be.ok();

                        expect(run).to.be.ok();
                        expect(run.start).to.be.a('function');
                        done();
                    });
                });
            });
        });
    });

    describe('normaliseIterationData', function () {
        it('should handle insane arguments correctly', function () {
            expect(Runner.normaliseIterationData()).to.eql([{}]);
        });

        it('should trim the provided data set to the specified length', function () {
            expect(Runner.normaliseIterationData([{foo: 'alpha'}, {bar: 'beta'}], 1)).to.eql([{foo: 'alpha'}]);
        });

        it('should duplicate the last element of the data set if length is greater', function () {
            expect(Runner.normaliseIterationData([{foo: 'alpha'}], 2)).to.eql([{foo: 'alpha'}, {foo: 'alpha'}]);
        });
    });

    describe('extractRunnableItems', function () {
        var collection = new sdk.Collection({
            item: [{
                id: 'ID1',
                name: 'F1',
                item: [{
                    name: 'F1.R1',
                    request: 'https://postman-echo.com/get'
                }, {
                    id: 'ID3',
                    name: 'F1.R2',
                    request: 'https://postman-echo.com/cookies'
                }]
            }, {
                id: 'ID2',
                name: 'F2',
                item: [{
                    name: 'F2.R1',
                    request: 'https://postman-echo.com/get'
                }]
            }]
        });

        describe('with invalid entrypoint', function () {
            it('should handle invalid entry points correctly ', function (done) {
                Runner.extractRunnableItems(collection, 'random', function (err, runnableItems, entrypoint) {
                    expect(err).to.be(null);
                    expect(runnableItems).to.eql([]);
                    expect(entrypoint).to.be(undefined);
                    done();
                });
            });
        });

        describe('with entrypoint matching folder', function () {
            it('should filter item group by name', function (done) {
                Runner.extractRunnableItems(collection, 'F1', function (err, runnableItems, entrypoint) {
                    expect(err).to.be(null);
                    expect(_.map(runnableItems, 'name')).to.eql(['F1.R1', 'F1.R2']);
                    expect(entrypoint).to.eql(collection.items.members[0]);
                    done();
                });
            });

            it('should filter item group by id', function (done) {
                Runner.extractRunnableItems(collection, 'ID2', function (err, runnableItems, entrypoint) {
                    expect(err).to.be(null);
                    expect(_.map(runnableItems, 'name')).to.eql(['F2.R1']);
                    expect(entrypoint).to.eql(collection.items.members[1]);
                    done();
                });
            });
        });

        describe('with entrypoint matching request', function () {
            it('should filter item correctly by name', function (done) {
                Runner.extractRunnableItems(collection, 'F1.R1', function (err, runnableItems, entrypoint) {
                    expect(err).to.be(null);
                    expect(runnableItems).to.have.length(1);
                    expect(_.map(runnableItems, 'name')).to.eql(['F1.R1']);
                    expect(entrypoint).to.have.property('name', 'F1.R1');
                    done();
                });
            });

            it('should filter item correctly by id', function (done) {
                Runner.extractRunnableItems(collection, 'ID3', function (err, runnableItems, entrypoint) {
                    expect(err).to.be(null);
                    expect(runnableItems).to.have.length(1);
                    expect(_.map(runnableItems, 'name')).to.eql(['F1.R2']);
                    expect(entrypoint).to.have.property('name', 'F1.R2');
                    done();
                });
            });
        });
    });
});
