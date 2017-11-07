var expect = require('expect.js'),
    extractRunnableItems = require('../../lib/runner/extract-runnable-items').extractRunnableItems,
    sdk = require('postman-collection'),
    _ = require('lodash');

describe('extractRunnableItems', function () {
    var collection = new sdk.Collection({
        id: 'C1',
        name: 'Collection C1',
        item: [{
            id: 'ID1',
            name: 'F1',
            item: [{
                id: 'ID3',
                name: 'F1.R1',
                request: 'https://postman-echo.com/get'
            }, {
                id: 'ID4',
                name: 'F1.F1',
                item: [{
                    name: 'F1.F1.R1',
                    request: 'https://postman-echo.com/cookies'
                }]
            }]
        },
        {
            id: 'ID2',
            name: 'F2',
            item: [{
                name: 'F2.R1',
                request: 'https://postman-echo.com/get'
            }]
        }, {
            id: 'ID6',
            name: 'R1',
            request: 'https://postman-echo.com/get'
        }]
    });

    describe('without entrypoint', function () {
        it('should return all items on collection', function (done) {
            extractRunnableItems(collection, null, function (err, runnableItems, entrypoint) {
                expect(err).to.be(null);
                expect(_.map(runnableItems, 'name')).to.eql(['F1.R1', 'F1.F1.R1', 'F2.R1', 'R1']);
                expect(entrypoint).to.have.property('name', 'Collection C1');
                done();
            });
        });
    });

    describe('with invalid entrypoint', function () {
        it('should handle invalid entry points as string', function (done) {
            extractRunnableItems(collection, 'random', function (err, runnableItems, entrypoint) {
                expect(err).to.be(null);
                expect(runnableItems).to.eql([]);
                expect(entrypoint).to.be(undefined);
                done();
            });
        });

        it('should handle invalid entry points for path lookupStrategy', function (done) {
            extractRunnableItems(
                collection,
                {execute: 'random', lookupStrategy: 'path', path: ['random_path']},
                function (err, runnableItems, entrypoint) {
                    expect(err).to.be(null);
                    expect(runnableItems).to.eql([]);
                    expect(entrypoint).to.be(undefined);
                    done();
                }
            );
        });

        it('should handle invalid entry points for idOrName lookupStrategy', function (done) {
            extractRunnableItems(
                collection,
                {execute: 'random', lookupStrategy: 'idOrName'},
                function (err, runnableItems, entrypoint) {
                    expect(err).to.be(null);
                    expect(runnableItems).to.eql([]);
                    expect(entrypoint).to.be(undefined);
                    done();
                }
            );
        });

        it('should handle invalid lookupStrategy', function (done) {
            extractRunnableItems(
                collection,
                {execute: 'random', lookupStrategy: 'dealWithIt'},
                function (err, runnableItems, entrypoint) {
                    expect(err).to.have.property(
                        'message', 'runtime~extractRunnableItems: Invalid entrypoint lookupStrategy'
                    );
                    expect(runnableItems).to.be(undefined);
                    expect(entrypoint).to.be(undefined);
                    done();
                }
            );
        });
    });

    describe('with entrypoint with lookupStrategy as path', function () {
        it('can match item in top level', function (done) {
            extractRunnableItems(
                collection,
                {execute: 'ID6', lookupStrategy: 'path'},
                function (err, runnableItems, entrypoint) {
                    expect(err).to.be(null);
                    expect(_.map(runnableItems, 'name')).to.eql(['R1']);
                    expect(entrypoint).to.have.property('name', 'R1');
                    done();
                }
            );
        });

        it('can match item in nested level', function (done) {
            extractRunnableItems(
                collection,
                {execute: 'ID3', lookupStrategy: 'path', path: ['ID1']},
                function (err, runnableItems, entrypoint) {
                    expect(err).to.be(null);
                    expect(_.map(runnableItems, 'name')).to.eql(['F1.R1']);
                    expect(entrypoint).to.have.property('name', 'F1.R1');
                    done();
                }
            );
        });

        it('can match item group at top level', function (done) {
            extractRunnableItems(
                collection,
                {execute: 'ID1', lookupStrategy: 'path'},
                function (err, runnableItems, entrypoint) {
                    expect(err).to.be(null);
                    expect(_.map(runnableItems, 'name')).to.eql(['F1.R1', 'F1.F1.R1']);
                    expect(entrypoint).to.have.property('name', 'F1');
                    done();
                }
            );
        });

        it('can match item group at nested level', function (done) {
            extractRunnableItems(
                collection,
                {execute: 'ID4', lookupStrategy: 'path', path: ['ID1']},
                function (err, runnableItems, entrypoint) {
                    expect(err).to.be(null);
                    expect(_.map(runnableItems, 'name')).to.eql(['F1.F1.R1']);
                    expect(entrypoint).to.have.property('name', 'F1.F1');
                    done();
                }
            );
        });
    });

    describe('with lookupStrategy idOrName', function () {
        it('should be default', function (done) {
            extractRunnableItems(
                collection,
                {execute: 'ID2'},
                function (err, runnableItems, entrypoint) {
                    expect(err).to.be(null);
                    expect(_.map(runnableItems, 'name')).to.eql(['F2.R1']);
                    expect(entrypoint).to.eql(collection.items.members[1]);
                    done();
                }
            );
        });

        it('should filter item group by id', function (done) {
            extractRunnableItems(
                collection,
                {execute: 'ID2', lookupStrategy: 'idOrName'},
                function (err, runnableItems, entrypoint) {
                    expect(err).to.be(null);
                    expect(_.map(runnableItems, 'name')).to.eql(['F2.R1']);
                    expect(entrypoint).to.eql(collection.items.members[1]);
                    done();
                }
            );
        });

        it('should filter item correctly by id', function (done) {
            extractRunnableItems(
                collection,
                {execute: 'ID3', lookupStrategy: 'idOrName'},
                function (err, runnableItems, entrypoint) {
                    expect(err).to.be(null);
                    expect(runnableItems).to.have.length(1);
                    expect(_.map(runnableItems, 'name')).to.eql(['F1.R1']);
                    expect(entrypoint).to.have.property('name', 'F1.R1');
                    done();
                }
            );
        });

        it('should filter item group by name', function (done) {
            extractRunnableItems(
                collection,
                {execute: 'F1', lookupStrategy: 'idOrName'},
                function (err, runnableItems, entrypoint) {
                    expect(err).to.be(null);
                    expect(_.map(runnableItems, 'name')).to.eql(['F1.R1', 'F1.F1.R1']);
                    expect(entrypoint).to.eql(collection.items.members[0]);
                    done();
                }
            );
        });

        it('should filter item correctly by name', function (done) {
            extractRunnableItems(
                collection,
                {execute: 'F1.R1', lookupStrategy: 'idOrName'},
                function (err, runnableItems, entrypoint) {
                    expect(err).to.be(null);
                    expect(runnableItems).to.have.length(1);
                    expect(_.map(runnableItems, 'name')).to.eql(['F1.R1']);
                    expect(entrypoint).to.have.property('name', 'F1.R1');
                    done();
                }
            );
        });
    });
});
