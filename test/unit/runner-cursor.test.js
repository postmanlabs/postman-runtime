/* global describe, it */
var expect = require('expect.js'),
    UUID4_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe('cursor', function () {
    var Cursor = require('../../lib/runner/cursor');

    it('must be a constructor', function () {
        expect(function () {
            return new Cursor();
        }).withArgs().to.not.throwError();
    });

    it('must accept boundary parameters and return results', function () {
        var cur = new Cursor(5, 2, 3, 1),
            coords = cur.current();

        expect(coords).to.have.property('position', 3);
        expect(coords).to.have.property('length', 5);
        expect(coords).to.have.property('iteration', 1);
        expect(coords).to.have.property('cycles', 2);
        expect(coords).to.have.property('ref');
        expect(coords.ref).to.match(UUID4_PATTERN);
    });

    it('must seek to an arbitrary position and iteration within bounds', function (done) {
        var cur = new Cursor(5, 2, 3, 0);

        cur.seek(2, 1, function (err, changed, coords, prev) {
            expect(err).to.not.be.ok();
            expect(changed).to.be.ok();

            expect(coords).to.have.property('length', 5);
            expect(coords).to.have.property('cycles', 2);
            expect(coords).to.have.property('position', 2);
            expect(coords).to.have.property('iteration', 1);
            expect(coords).to.have.property('ref');
            expect(coords.ref).to.match(UUID4_PATTERN);

            expect(prev).to.have.property('length', 5);
            expect(prev).to.have.property('cycles', 2);
            expect(prev).to.have.property('position', 3);
            expect(prev).to.have.property('iteration', 0);
            expect(prev).to.have.property('ref');
            expect(prev.ref).to.match(UUID4_PATTERN);
            done();
        });
    });

    it('must seek to next position', function (done) {
        var cur = new Cursor(5, 2, 3, 1);

        cur.next(function (err, changed, coords) {
            expect(err).to.not.be.ok();
            expect(changed).to.be.ok();

            expect(coords).to.have.property('length', 5);
            expect(coords).to.have.property('cycles', 2);
            expect(coords).to.have.property('position', 4);
            expect(coords).to.have.property('iteration', 1);
            expect(coords).to.have.property('ref');
            expect(coords.ref).to.match(UUID4_PATTERN);

            done();
        });
    });

    it('must seek to next iteration', function (done) {
        var cur = new Cursor(5, 2, 4, 0);

        cur.next(function (err, changed, coords) {
            expect(err).to.not.be.ok();
            expect(changed).to.be.ok();

            expect(coords).to.have.property('length', 5);
            expect(coords).to.have.property('cycles', 2);
            expect(coords).to.have.property('position', 0);
            expect(coords).to.have.property('iteration', 1);
            expect(coords).to.have.property('ref');
            expect(coords.ref).to.match(UUID4_PATTERN);

            done();
        });
    });

    it('must not seek next after end of cycle', function (done) {
        var cur = new Cursor(5, 2, 4, 1);

        cur.next(function (err, changed, coords, prev) {
            expect(err).to.not.be.ok();
            expect(changed).to.not.be.ok();

            expect(coords).to.have.property('length', 5);
            expect(coords).to.have.property('cycles', 2);
            expect(coords).to.have.property('position', 4);
            expect(coords).to.have.property('iteration', 1);
            expect(coords).to.have.property('ref');
            expect(coords.ref).to.match(UUID4_PATTERN);

            expect(prev).to.have.property('length', 5);
            expect(prev).to.have.property('cycles', 2);
            expect(prev).to.have.property('position', 4);
            expect(prev).to.have.property('iteration', 1);
            expect(prev).to.have.property('ref');
            expect(prev.ref).to.match(UUID4_PATTERN);

            done();
        });
    });
});
