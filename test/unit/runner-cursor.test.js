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

    describe('partition support', function () {
        it('should accept partitionIndex and partitionCycles parameters', function () {
            var cur = new Cursor(5, 10, 2, 3, 'test-ref', 1, 5),
                coords = cur.current();

            expect(coords).to.deep.include({
                position: 2,
                length: 5,
                iteration: 3,
                cycles: 10,
                partitionIndex: 1,
                partitionCycles: 5
            });
            expect(coords).to.have.property('ref', 'test-ref');
        });

        it('should default partitionIndex and partitionCycles to 0', function () {
            var cur = new Cursor(5, 2, 3, 1),
                coords = cur.current();

            expect(coords).to.deep.include({
                partitionIndex: 0,
                partitionCycles: 0
            });
        });

        it('should validate partitionIndex and partitionCycles within bounds', function () {
            var cur = new Cursor(5, 10, 2, 3, 'test-ref', 15, 20),
                coords = cur.current();

            // Values should be preserved as-is since they're above minimum
            expect(coords).to.deep.include({
                partitionIndex: 15,
                partitionCycles: 20
            });
        });

        it('should include partition info in whatnext results', function () {
            var cur = new Cursor(3, 5, 1, 2, 'test-ref', 2, 3),
                coords = cur.current(),
                next = cur.whatnext(coords);

            expect(next).to.deep.include({
                position: 2,
                iteration: 2,
                partitionIndex: 2,
                partitionCycles: 3
            });
        });

        it('should handle partition info in whatnext when moving to next iteration', function () {
            var cur = new Cursor(3, 5, 2, 1, 'test-ref', 1, 4),
                coords = cur.current(),
                next = cur.whatnext(coords);

            expect(next).to.deep.include({
                position: 0,
                iteration: 2,
                partitionIndex: 1,
                partitionCycles: 4,
                cr: true
            });
        });

        it('should handle partition info in whatnext at end of cycles', function () {
            var cur = new Cursor(3, 5, 2, 4, 'test-ref', 1, 3),
                coords = cur.current(),
                next = cur.whatnext(coords);

            expect(next).to.deep.include({
                position: 2,
                iteration: 4,
                partitionIndex: 1,
                partitionCycles: 3,
                eof: true
            });
        });
    });

    describe('Cursor.box with partition support', function () {
        it('should create cursor from object with partition properties', function () {
            var obj = {
                    length: 5,
                    cycles: 10,
                    position: 2,
                    iteration: 3,
                    ref: 'test-ref',
                    partitionIndex: 1,
                    partitionCycles: 4
                },
                cur = Cursor.box(obj),
                coords = cur.current();

            expect(coords).to.deep.include({
                position: 2,
                length: 5,
                iteration: 3,
                cycles: 10,
                partitionIndex: 1,
                partitionCycles: 4,
                ref: 'test-ref'
            });
        });

        it('should handle missing partition properties in object', function () {
            var obj = {
                    length: 5,
                    cycles: 10,
                    position: 2,
                    iteration: 3,
                    ref: 'test-ref'
                },
                cur = Cursor.box(obj),
                coords = cur.current();

            expect(coords).to.deep.include({
                partitionIndex: 0,
                partitionCycles: 0
            });
        });

        it('should preserve existing cursor with partition info', function () {
            var originalCur = new Cursor(5, 10, 2, 3, 'test-ref', 1, 4),
                boxedCur = Cursor.box(originalCur),
                coords = boxedCur.current();

            expect(boxedCur).to.equal(originalCur);
            expect(coords).to.deep.include({
                partitionIndex: 1,
                partitionCycles: 4
            });
        });

        it('should apply bounds to cursor with partition info', function () {
            var obj = {
                    length: 5,
                    cycles: 10,
                    position: 2,
                    iteration: 3,
                    partitionIndex: 1,
                    partitionCycles: 4
                },
                bounds = { length: 8, cycles: 15 },
                cur = Cursor.box(obj, bounds),
                coords = cur.current();

            expect(coords).to.deep.include({
                length: 8,
                cycles: 15,
                position: 2,
                iteration: 3,
                partitionIndex: 1,
                partitionCycles: 4
            });
        });
    });
});
