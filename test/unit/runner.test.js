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
                        expect(err.message).to.be('A valid folder id/name is required');
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
                        expect(err.message).to.be('A valid collection SDK instance is required');
                        expect(run).to.not.be.ok();

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

        it('should handle invalid arguments correctly', function (done) {
            Runner.extractRunnableItems(function (err, runnableItems) {
                expect(err.message).to.be('A valid collection SDK instance is required');
                expect(runnableItems).to.not.be.ok();
                done();
            });
        });

        it('should return the entire collection if no entrypoint has been specified', function (done) {
            Runner.extractRunnableItems(collection, function (err, runnableItems) {
                expect(err).to.be(null);
                expect(runnableItems).to.have.keys(['entrypoint', 'items']);
                expect(runnableItems.entrypoint).to.eql(collection);
                expect(_.map(runnableItems.items, 'name')).to.eql(['F1.R1', 'F1.R2']);
                done();
            });
        });

        it('should handle invalid entry points correctly ', function (done) {
            Runner.extractRunnableItems(collection, 'random', function (err, runnableItems) {
                expect(err).to.be(null);
                expect(runnableItems).to.eql({items: [], entrypoint: undefined});
                done();
            });
        });

        it('should filter down to the provided groupId correctly', function (done) {
            Runner.extractRunnableItems(collection, 'F1', function (err, runnableItems) {
                expect(err).to.be(null);
                expect(runnableItems).to.have.keys(['entrypoint', 'items']);
                expect(runnableItems.entrypoint).to.eql(collection.items.members[0]);
                expect(_.map(runnableItems.items, 'name')).to.eql(['F1.R1']);
                done();
            });
        });

        it('should prioritize id matches over name matches correctly', function (done) {
            Runner.extractRunnableItems(collection, 'F2', function (err, runnableItems) {
                expect(err).to.be(null);
                expect(runnableItems).to.have.keys(['entrypoint', 'items']);
                expect(runnableItems.entrypoint).to.eql(collection.items.members[0]);
                expect(_.map(runnableItems.items, 'name')).to.eql(['F1.R1']);
                done();
            });
        });
    });
});
