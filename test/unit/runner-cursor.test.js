var expect = require('chai').expect,
    UUID4_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe('cursor', function () {
    var Cursor = require('../../lib/runner/cursor');

    it('should be a constructor', function () {
        expect(function () {
            return new Cursor();
        }).to.not.throw();
    });

    it('should accept boundary parameters and return results', function () {
        var cur = new Cursor(5, 2, 3, 1),
            coords = cur.current();

        expect(coords).to.deep.include({
            position: 3,
            length: 5,
            iteration: 1,
            cycles: 2
        });
        expect(coords).to.have.property('ref').that.match(UUID4_PATTERN);
    });

    it('should seek to an arbitrary position and iteration within bounds', function (done) {
        var cur = new Cursor(5, 2, 3, 0);

        cur.seek(2, 1, function (err, changed, coords, prev) {
            expect(err).to.be.null;
            expect(changed).to.be.ok;

            expect(coords).to.deep.include({
                position: 2,
                length: 5,
                iteration: 1,
                cycles: 2
            });
            expect(coords).to.have.property('ref').that.match(UUID4_PATTERN);

            expect(prev).to.deep.include({
                position: 3,
                length: 5,
                iteration: 0,
                cycles: 2
            });
            expect(prev).to.have.property('ref').that.match(UUID4_PATTERN);
            done();
        });
    });

    it('should seek to next position', function (done) {
        var cur = new Cursor(5, 2, 3, 1);

        cur.next(function (err, changed, coords) {
            expect(err).to.be.null;
            expect(changed).to.be.ok;

            expect(coords).to.deep.include({
                position: 4,
                length: 5,
                iteration: 1,
                cycles: 2
            });
            expect(coords).to.have.property('ref').that.match(UUID4_PATTERN);

            done();
        });
    });

    it('should seek to next iteration', function (done) {
        var cur = new Cursor(5, 2, 4, 0);

        cur.next(function (err, changed, coords) {
            expect(err).to.be.null;
            expect(changed).to.be.ok;

            expect(coords).to.deep.include({
                position: 0,
                length: 5,
                iteration: 1,
                cycles: 2
            });
            expect(coords).to.have.property('ref').that.match(UUID4_PATTERN);

            done();
        });
    });

    it('should not seek next after end of cycle', function (done) {
        var cur = new Cursor(5, 2, 4, 1);

        cur.next(function (err, changed, coords, prev) {
            expect(err).to.be.null;
            expect(changed).to.be.false;

            expect(coords).to.deep.include({
                position: 4,
                length: 5,
                iteration: 1,
                cycles: 2
            });
            expect(coords).to.have.property('ref').that.match(UUID4_PATTERN);

            expect(prev).to.deep.include({
                position: 4,
                length: 5,
                iteration: 1,
                cycles: 2
            });
            expect(prev).to.have.property('ref').that.match(UUID4_PATTERN);

            done();
        });
    });
});
