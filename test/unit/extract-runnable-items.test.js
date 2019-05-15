var expect = require('chai').expect,
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
                        id: 'IDx',
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
        }),
        collectionWithDuplicates = new sdk.Collection({
            id: 'C2',
            name: 'Collection C2',
            item: [{
                id: 'ID1',
                name: 'R1',
                request: 'https://postman-echo.com/get'
            },
            {
                id: 'ID2',
                name: 'R1',
                request: 'https://postman-echo.com/post'
            }]
        });

    describe('without entrypoint', function () {
        it('should return all items on collection', function (done) {
            extractRunnableItems(collection, null, function (err, runnableItems, entrypoint) {
                expect(err).to.be.null;
                expect(_.map(runnableItems, 'name')).to.eql(['F1.R1', 'F1.F1.R1', 'F2.R1', 'R1']);
                expect(entrypoint).to.have.property('name', 'Collection C1');
                done();
            });
        });
    });

    describe('invalid entrypoint', function () {
        it('should handle invalid entry points as string', function (done) {
            extractRunnableItems(collection, 'random', function (err, runnableItems, entrypoint) {
                expect(err).to.be.null;
                expect(runnableItems).to.eql([]);
                expect(entrypoint).to.be.undefined;
                done();
            });
        });

        it('should handle invalid lookupStrategy', function (done) {
            extractRunnableItems(
                collection,
                {execute: 'random', lookupStrategy: 'dealWithIt'},
                function (err, runnableItems, entrypoint) {
                    expect(err).to.have.property(
                        'message', 'runtime~extractRunnableItems: Invalid entrypoint lookupStrategy'
                    );
                    expect(runnableItems).to.be.undefined;
                    expect(entrypoint).to.be.undefined;
                    done();
                }
            );
        });
    });

    describe('lookupStrategy: path', function () {
        it('should handle invalid entry points', function (done) {
            extractRunnableItems(
                collection, {
                    execute: 'random',
                    lookupStrategy: 'path',
                    path: ['random_path']
                },
                function (err, runnableItems, entrypoint) {
                    expect(err).to.be.null;
                    expect(runnableItems).to.eql([]);
                    expect(entrypoint).to.be.undefined;
                    done();
                }
            );
        });

        it('should match item in top level', function (done) {
            extractRunnableItems(
                collection,
                {execute: 'ID6', lookupStrategy: 'path'},
                function (err, runnableItems, entrypoint) {
                    expect(err).to.be.null;
                    expect(_.map(runnableItems, 'name')).to.eql(['R1']);
                    expect(entrypoint).to.have.property('name', 'R1');
                    done();
                }
            );
        });

        it('should match item in nested level', function (done) {
            extractRunnableItems(
                collection,
                {execute: 'ID3', lookupStrategy: 'path', path: ['ID1']},
                function (err, runnableItems, entrypoint) {
                    expect(err).to.be.null;
                    expect(_.map(runnableItems, 'name')).to.eql(['F1.R1']);
                    expect(entrypoint).to.have.property('name', 'F1.R1');
                    done();
                }
            );
        });

        it('should match item group at top level', function (done) {
            extractRunnableItems(
                collection,
                {execute: 'ID1', lookupStrategy: 'path'},
                function (err, runnableItems, entrypoint) {
                    expect(err).to.be.null;
                    expect(_.map(runnableItems, 'name')).to.eql(['F1.R1', 'F1.F1.R1']);
                    expect(entrypoint).to.have.property('name', 'F1');
                    done();
                }
            );
        });

        it('should match item group at nested level', function (done) {
            extractRunnableItems(
                collection,
                {execute: 'ID4', lookupStrategy: 'path', path: ['ID1']},
                function (err, runnableItems, entrypoint) {
                    expect(err).to.be.null;
                    expect(_.map(runnableItems, 'name')).to.eql(['F1.F1.R1']);
                    expect(entrypoint).to.have.property('name', 'F1.F1');
                    done();
                }
            );
        });
    });

    describe('lookupStrategy: idOrName', function () {
        it('should handle invalid entry points', function (done) {
            extractRunnableItems(
                collection, {
                    execute: 'random',
                    lookupStrategy: 'idOrName'
                },
                function (err, runnableItems, entrypoint) {
                    expect(err).to.be.null;
                    expect(runnableItems).to.eql([]);
                    expect(entrypoint).to.be.undefined;
                    done();
                }
            );
        });

        it('should be default', function (done) {
            extractRunnableItems(
                collection,
                {execute: 'ID2'},
                function (err, runnableItems, entrypoint) {
                    expect(err).to.be.null;
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
                    expect(err).to.be.null;
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
                    expect(err).to.be.null;
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
                    expect(err).to.be.null;
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
                    expect(err).to.be.null;
                    expect(runnableItems).to.have.length(1);
                    expect(_.map(runnableItems, 'name')).to.eql(['F1.R1']);
                    expect(entrypoint).to.have.property('name', 'F1.R1');
                    done();
                }
            );
        });

        it('should choose the first match in collection order', function (done) {
            extractRunnableItems(
                collectionWithDuplicates, {
                    execute: 'R1',
                    lookupStrategy: 'idOrName'
                },
                function (err, runnableItems, entrypoint) {
                    expect(err).to.be.null;
                    expect(runnableItems).to.have.length(1);
                    expect(_.map(runnableItems, 'id')).to.eql(['ID1']);
                    expect(entrypoint).to.have.property('name', 'R1');
                    done();
                }
            );
        });
    });

    describe('lookupStrategy: multipleIdOrName', function () {
        it('should handle invalid entry points', function (done) {
            extractRunnableItems(
                collection, {
                    execute: 'random',
                    lookupStrategy: 'multipleIdOrName'
                },
                function (err, runnableItems, entrypoint) {
                    expect(err).to.be.null;
                    expect(runnableItems).to.eql([]);
                    expect(entrypoint).to.be.undefined;
                    done();
                }
            );
        });

        it('should bail out if any of the given entrypoint is not found. ', function (done) {
            extractRunnableItems(
                collection, {
                    execute: ['ID3', 'RANDOM'],
                    lookupStrategy: 'multipleIdOrName'
                },
                function (err, runnableItems, entrypoint) {
                    expect(err).to.be.null;
                    expect(runnableItems).to.eql([]);
                    expect(entrypoint).to.be.undefined;
                    done();
                }
            );
        });

        it('should filter single item group by id', function (done) {
            extractRunnableItems(
                collection, {
                    execute: ['ID2'],
                    lookupStrategy: 'multipleIdOrName'
                },
                function (err, runnableItems, entrypoint) {
                    expect(err).to.be.null;
                    expect(_.map(runnableItems, 'name')).to.eql(['F2.R1']);
                    expect(entrypoint).to.have.property('name', 'Collection C1');
                    done();
                }
            );
        });

        it('should filter multiple item groups by id', function (done) {
            extractRunnableItems(
                collection, {
                    execute: ['ID1', 'ID2'],
                    lookupStrategy: 'multipleIdOrName'
                },
                function (err, runnableItems, entrypoint) {
                    expect(err).to.be.null;
                    expect(_.map(runnableItems, 'name')).to.eql(['F1.R1', 'F1.F1.R1', 'F2.R1']);
                    expect(entrypoint).to.have.property('name', 'Collection C1');
                    done();
                }
            );
        });

        it('should filter single item by id', function (done) {
            extractRunnableItems(
                collection, {
                    execute: ['ID3'],
                    lookupStrategy: 'multipleIdOrName'
                },
                function (err, runnableItems, entrypoint) {
                    expect(err).to.be.null;
                    expect(_.map(runnableItems, 'name')).to.eql(['F1.R1']);
                    expect(entrypoint).to.have.property('name', 'Collection C1');
                    done();
                }
            );
        });

        it('should filter multiple items by id', function (done) {
            extractRunnableItems(
                collection, {
                    execute: ['ID3', 'ID4', 'ID6'],
                    lookupStrategy: 'multipleIdOrName'
                },
                function (err, runnableItems, entrypoint) {
                    expect(err).to.be.null;
                    expect(_.map(runnableItems, 'name')).to.eql(['F1.R1', 'F1.F1.R1', 'R1']);
                    expect(entrypoint).to.have.property('name', 'Collection C1');
                    done();
                }
            );
        });

        it('should filter single item group by name', function (done) {
            extractRunnableItems(
                collection, {
                    execute: ['F1'],
                    lookupStrategy: 'multipleIdOrName'
                },
                function (err, runnableItems, entrypoint) {
                    expect(err).to.be.null;
                    expect(_.map(runnableItems, 'name')).to.eql(['F1.R1', 'F1.F1.R1']);
                    expect(entrypoint).to.have.property('name', 'Collection C1');
                    done();
                }
            );
        });

        it('should filter multiple item groups by name', function (done) {
            extractRunnableItems(
                collection, {
                    execute: ['F1', 'F2'],
                    lookupStrategy: 'multipleIdOrName'
                },
                function (err, runnableItems, entrypoint) {
                    expect(err).to.be.null;
                    expect(_.map(runnableItems, 'name')).to.eql(['F1.R1', 'F1.F1.R1', 'F2.R1']);
                    expect(entrypoint).to.have.property('name', 'Collection C1');
                    done();
                }
            );
        });

        it('should filter single item by name', function (done) {
            extractRunnableItems(
                collection, {
                    execute: ['F1.R1'],
                    lookupStrategy: 'multipleIdOrName'
                },
                function (err, runnableItems, entrypoint) {
                    expect(err).to.be.null;
                    expect(runnableItems).to.have.lengthOf(1);
                    expect(_.map(runnableItems, 'name')).to.eql(['F1.R1']);
                    expect(entrypoint).to.have.property('name', 'Collection C1');
                    done();
                }
            );
        });

        it('should filter multiple items by name', function (done) {
            extractRunnableItems(
                collection, {
                    execute: ['F1.R1', 'F2.R1'],
                    lookupStrategy: 'multipleIdOrName'
                },
                function (err, runnableItems, entrypoint) {
                    expect(err).to.be.null;
                    expect(_.map(runnableItems, 'name')).to.eql(['F1.R1', 'F2.R1']);
                    expect(entrypoint).to.have.property('name', 'Collection C1');
                    done();
                }
            );
        });

        it('should filter by combination of id and name', function (done) {
            extractRunnableItems(
                collection, {
                    execute: ['ID1', 'F2'],
                    lookupStrategy: 'multipleIdOrName'
                },
                function (err, runnableItems, entrypoint) {
                    expect(err).to.be.null;
                    expect(_.map(runnableItems, 'name')).to.eql(['F1.R1', 'F1.F1.R1', 'F2.R1']);
                    expect(entrypoint).to.have.property('name', 'Collection C1');
                    done();
                }
            );
        });

        it('should follow collection order', function (done) {
            extractRunnableItems(
                collection, {
                    execute: ['ID6', 'ID1', 'ID2'],
                    lookupStrategy: 'multipleIdOrName'
                },
                function (err, runnableItems, entrypoint) {
                    expect(err).to.be.null;
                    expect(_.map(runnableItems, 'name')).to.eql(['F1.R1', 'F1.F1.R1', 'F2.R1', 'R1']);
                    expect(entrypoint).to.have.property('name', 'Collection C1');
                    done();
                }
            );
        });

        it('should avoid nested entrypoints', function (done) {
            extractRunnableItems(
                collection, {
                    execute: ['F1', 'F1.F1', 'F1.F1.R1'],
                    lookupStrategy: 'multipleIdOrName'
                },
                function (err, runnableItems, entrypoint) {
                    expect(err).to.be.null;
                    expect(_.map(runnableItems, 'name')).to.eql(['F1.R1', 'F1.F1.R1']);
                    expect(entrypoint).to.have.property('name', 'Collection C1');
                    done();
                }
            );
        });

        it('should choose the first match in collection order', function (done) {
            extractRunnableItems(
                collectionWithDuplicates, {
                    execute: ['R1'],
                    lookupStrategy: 'multipleIdOrName'
                },
                function (err, runnableItems, entrypoint) {
                    expect(err).to.be.null;
                    expect(runnableItems).to.have.lengthOf(1);
                    expect(_.map(runnableItems, 'id')).to.eql(['ID1']);
                    expect(entrypoint).to.have.property('name', 'Collection C2');
                    done();
                }
            );
        });

        it('should ignore duplicates in name', function (done) {
            extractRunnableItems(
                collectionWithDuplicates, {
                    execute: ['R1', 'R1'],
                    lookupStrategy: 'multipleIdOrName'
                },
                function (err, runnableItems, entrypoint) {
                    expect(err).to.be.null;
                    expect(runnableItems).to.have.lengthOf(1);
                    expect(_.map(runnableItems, 'id')).to.eql(['ID1']);
                    expect(entrypoint).to.have.property('name', 'Collection C2');
                    done();
                }
            );
        });
    });

    describe('lookupStrategy: followOrder', function () {
        it('should handle invalid entry points', function (done) {
            extractRunnableItems(
                collection, {
                    execute: 'random',
                    lookupStrategy: 'followOrder'
                },
                function (err, runnableItems, entrypoint) {
                    expect(err).to.be.null;
                    expect(runnableItems).to.eql([]);
                    expect(entrypoint).to.be.undefined;
                    done();
                }
            );
        });

        it('should bail out if any of the given entrypoint is not found. ', function (done) {
            extractRunnableItems(
                collection, {
                    execute: ['ID3', 'RANDOM'],
                    lookupStrategy: 'followOrder'
                },
                function (err, runnableItems, entrypoint) {
                    expect(err).to.be.null;
                    expect(runnableItems).to.eql([]);
                    expect(entrypoint).to.be.undefined;
                    done();
                }
            );
        });

        it('should filter single item group by id', function (done) {
            extractRunnableItems(
                collection, {
                    execute: ['ID2'],
                    lookupStrategy: 'followOrder'
                },
                function (err, runnableItems, entrypoint) {
                    expect(err).to.be.null;
                    expect(_.map(runnableItems, 'name')).to.eql(['F2.R1']);
                    expect(entrypoint).to.have.property('name', 'Collection C1');
                    done();
                }
            );
        });

        it('should filter multiple item groups by id and follow the order', function (done) {
            extractRunnableItems(
                collection, {
                    execute: ['ID2', 'ID1'],
                    lookupStrategy: 'followOrder'
                },
                function (err, runnableItems, entrypoint) {
                    expect(err).to.be.null;
                    expect(_.map(runnableItems, 'name')).to.eql(['F2.R1', 'F1.R1', 'F1.F1.R1']);
                    expect(entrypoint).to.have.property('name', 'Collection C1');
                    done();
                }
            );
        });

        it('should filter single item by id', function (done) {
            extractRunnableItems(
                collection, {
                    execute: ['ID3'],
                    lookupStrategy: 'followOrder'
                },
                function (err, runnableItems, entrypoint) {
                    expect(err).to.be.null;
                    expect(_.map(runnableItems, 'name')).to.eql(['F1.R1']);
                    expect(entrypoint).to.have.property('name', 'Collection C1');
                    done();
                }
            );
        });

        it('should filter multiple items by id and follow the order', function (done) {
            extractRunnableItems(
                collection, {
                    execute: ['ID3', 'ID6', 'ID4'],
                    lookupStrategy: 'followOrder'
                },
                function (err, runnableItems, entrypoint) {
                    expect(err).to.be.null;
                    expect(_.map(runnableItems, 'name')).to.eql(['F1.R1', 'R1', 'F1.F1.R1']);
                    expect(entrypoint).to.have.property('name', 'Collection C1');
                    done();
                }
            );
        });

        it('should filter single item group by name', function (done) {
            extractRunnableItems(
                collection, {
                    execute: ['F1'],
                    lookupStrategy: 'followOrder'
                },
                function (err, runnableItems, entrypoint) {
                    expect(err).to.be.null;
                    expect(_.map(runnableItems, 'name')).to.eql(['F1.R1', 'F1.F1.R1']);
                    expect(entrypoint).to.have.property('name', 'Collection C1');
                    done();
                }
            );
        });

        it('should filter multiple item groups by name and follow the order', function (done) {
            extractRunnableItems(
                collection, {
                    execute: ['F2', 'F1'],
                    lookupStrategy: 'followOrder'
                },
                function (err, runnableItems, entrypoint) {
                    expect(err).to.be.null;
                    expect(_.map(runnableItems, 'name')).to.eql(['F2.R1', 'F1.R1', 'F1.F1.R1']);
                    expect(entrypoint).to.have.property('name', 'Collection C1');
                    done();
                }
            );
        });

        it('should filter single item by name', function (done) {
            extractRunnableItems(
                collection, {
                    execute: ['F1.R1'],
                    lookupStrategy: 'followOrder'
                },
                function (err, runnableItems, entrypoint) {
                    expect(err).to.be.null;
                    expect(runnableItems).to.have.lengthOf(1);
                    expect(_.map(runnableItems, 'name')).to.eql(['F1.R1']);
                    expect(entrypoint).to.have.property('name', 'Collection C1');
                    done();
                }
            );
        });

        it('should filter multiple items by name and follow the order', function (done) {
            extractRunnableItems(
                collection, {
                    execute: ['F2.R1', 'F1.R1'],
                    lookupStrategy: 'followOrder'
                },
                function (err, runnableItems, entrypoint) {
                    expect(err).to.be.null;
                    expect(_.map(runnableItems, 'name')).to.eql(['F2.R1', 'F1.R1']);
                    expect(entrypoint).to.have.property('name', 'Collection C1');
                    done();
                }
            );
        });

        it('should filter by combination of id and name and follow the order', function (done) {
            extractRunnableItems(
                collection, {
                    execute: ['F2', 'ID1'],
                    lookupStrategy: 'followOrder'
                },
                function (err, runnableItems, entrypoint) {
                    expect(err).to.be.null;
                    expect(_.map(runnableItems, 'name')).to.eql(['F2.R1', 'F1.R1', 'F1.F1.R1']);
                    expect(entrypoint).to.have.property('name', 'Collection C1');
                    done();
                }
            );
        });

        it('should avoid nested entrypoints', function (done) {
            extractRunnableItems(
                collection, {
                    execute: ['F1', 'F1.F1', 'F1.F1.R1'],
                    lookupStrategy: 'followOrder'
                },
                function (err, runnableItems, entrypoint) {
                    expect(err).to.be.null;
                    expect(_.map(runnableItems, 'name')).to.eql(['F1.R1', 'F1.F1.R1']);
                    expect(entrypoint).to.have.property('name', 'Collection C1');
                    done();
                }
            );
        });

        it('should choose the first match in collection order', function (done) {
            extractRunnableItems(
                collectionWithDuplicates, {
                    execute: ['R1'],
                    lookupStrategy: 'followOrder'
                },
                function (err, runnableItems, entrypoint) {
                    expect(err).to.be.null;
                    expect(runnableItems).to.have.lengthOf(1);
                    expect(_.map(runnableItems, 'id')).to.eql(['ID1']);
                    expect(entrypoint).to.have.property('name', 'Collection C2');
                    done();
                }
            );
        });

        it('should follow the order for duplicates', function (done) {
            extractRunnableItems(
                collection, {
                    execute: ['R1', 'ID4', 'R1'],
                    lookupStrategy: 'followOrder'
                },
                function (err, runnableItems, entrypoint) {
                    expect(err).to.be.null;
                    expect(runnableItems).to.have.lengthOf(3);
                    expect(_.map(runnableItems, 'id')).to.eql(['ID6', 'IDx', 'ID6']);
                    expect(entrypoint).to.have.property('name', 'Collection C1');
                    done();
                }
            );
        });
    });
});
