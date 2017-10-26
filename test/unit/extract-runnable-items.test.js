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
        },
        {
            id: 'ID5',
            name: 'N1', // intentionally a duplicate to simulate id/name conflict
            item: [{
                name: 'N1.R1',
                request: 'https://postman-echo.com/get'
            }]
        },
        {
            id: 'N1',
            name: 'F3', // intentionally a duplicate to simulate id/name conflict
            item: [{
                name: 'F3.R1',
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
                expect(_.map(runnableItems, 'name')).to.eql(['F1.R1', 'F1.F1.R1', 'F2.R1', 'N1.R1', 'F3.R1', 'R1']);
                expect(entrypoint).to.have.property('name', 'Collection C1');
                done();
            });
        });
    });

    describe('with invalid entrypoint', function () {
        it('should handle invalid entry points as id/string', function (done) {
            extractRunnableItems(collection, 'random', function (err, runnableItems, entrypoint) {
                expect(err).to.be(null);
                expect(runnableItems).to.eql([]);
                expect(entrypoint).to.be(undefined);
                done();
            });
        });

        it('should handle invalid entry points as path', function (done) {
            extractRunnableItems(collection, ['random'], function (err, runnableItems, entrypoint) {
                expect(err).to.be(null);
                expect(runnableItems).to.eql([]);
                expect(entrypoint).to.be(undefined);
                done();
            });
        });
    });

    describe('with entrypoint as path lookup', function () {
        it('can match item in top level', function (done) {
            extractRunnableItems(
                collection,
                ['ID6'],
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
                ['ID1', 'ID3'],
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
                ['ID1'],
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
                ['ID1', 'ID4'],
                function (err, runnableItems, entrypoint) {
                    expect(err).to.be(null);
                    expect(_.map(runnableItems, 'name')).to.eql(['F1.F1.R1']);
                    expect(entrypoint).to.have.property('name', 'F1.F1');
                    done();
                }
            );
        });
    });

    describe('with entrypoint as id', function () {
        it('should filter item group by id', function (done) {
            extractRunnableItems(
                collection,
                'ID2',
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
                'ID3',
                function (err, runnableItems, entrypoint) {
                    expect(err).to.be(null);
                    expect(runnableItems).to.have.length(1);
                    expect(_.map(runnableItems, 'name')).to.eql(['F1.R1']);
                    expect(entrypoint).to.have.property('name', 'F1.R1');
                    done();
                }
            );
        });

        it('should prioritize id match over name', function (done) {
            extractRunnableItems(
                collection,
                'N1',
                function (err, runnableItems, entrypoint) {
                    expect(err).to.be(null);
                    expect(runnableItems).to.have.length(1);
                    expect(_.map(runnableItems, 'name')).to.eql(['F3.R1']);
                    expect(entrypoint).to.have.property('name', 'F3');
                    done();
                }
            );
        });
    });

    describe('with entrypoint as name', function () {
        it('should filter item group by name', function (done) {
            extractRunnableItems(
                collection,
                'F1',
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
                'F1.R1',
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
