var expect = require('chai').expect;

describe('cursor resolution', function () {
    var Run = require('../../lib/runner/run.js');

    it('should resolve to the item specified', function () {
        var run = new Run({
            items: [{id: 'one'}, {id: 'two'}, {id: 'three'}]
        });

        expect(run.resolveCursor({
            position: 1
        })).to.eql({
            id: 'two'
        });
    });

    it('should return undefined for an item not found', function () {
        var run = new Run({
            items: [{id: 'one'}, {id: 'two'}, {id: 'three'}]
        });

        expect(run.resolveCursor({
            position: 12
        })).to.be.undefined;
    });

    it('should return undefined for a missing cursor', function () {
        var run = new Run({
            items: [{id: 'one'}, {id: 'two'}, {id: 'three'}]
        });

        expect(run.resolveCursor()).to.be.undefined;
    });
});
