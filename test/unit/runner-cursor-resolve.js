var expect = require('expect.js');

describe('cursor resolution', function () {
    var Run = require('../../lib/runner/run.js');

    it('must resolve to the item specified', function () {
        var run = new Run({
            items: [{id: 'one'}, {id: 'two'}, {id: 'three'}]
        });

        expect(run.resolveCursor({
            position: 1
        })).to.eql({
            id: 'two'
        });
    });

    it('must return undefined for an item not found', function () {
        var run = new Run({
            items: [{id: 'one'}, {id: 'two'}, {id: 'three'}]
        });

        expect(run.resolveCursor({
            position: 12
        })).to.not.be.ok();
    });

    it('must return undefined for a missing cursor', function () {
        var run = new Run({
            items: [{id: 'one'}, {id: 'two'}, {id: 'three'}]
        });

        expect(run.resolveCursor()).to.not.be.ok();
    });
});
