var expect = require('chai').expect;

describe('runner~timings', function () {
    var Timings = require('../../lib/runner/timings');

    it('should expose a constructor', function () {
        expect(Timings).to.be.a('function');
    });

    it('should instantiate a new timings object', function () {
        expect(function () {
            var t = new Timings();
            expect(t).to.be.an.instanceOf(Timings);
        }).to.not.throw();
    });

    it('should instantiate a new timings object with initial records', function () {
        var t = new Timings({
            labelOne: 1468345625321,
            labelTwo: 1368345625321
        });

        expect(t).to.deep.include({
            labelOne: 1468345625321,
            labelTwo: 1368345625321
        });
    });

    it('can use the create method to initialise a new instance', function () {
        var t = Timings.create({
            labelOne: 1468345625321,
            labelTwo: 1368345625321
        });

        expect(t).to.be.an.instanceof(Timings);
        expect(t).to.deep.include({
            labelOne: 1468345625321,
            labelTwo: 1368345625321
        });
    });

    it('casts non numeric initial records to numbers', function () {
        var t = new Timings({
            string: '1468345625321',
            float: 136834562532.29,
            date: new Date(1468345625321)
        });

        expect(t).to.deep.include({
            string: 1468345625321,
            float: 136834562532
        });
        expect(t).to.have.property('date').that.is.NaN;
    });

    it('records the current date time with a label', function () {
        var t = new Timings();
        t.record('capture');
        expect(t).to.have.property('capture').that.is.a('number');
        expect(t.capture <= Date.now()).to.be.ok;
    });

    it('recording twice overrides old label', function (done) {
        var t = new Timings();

        t.record('capture');
        expect(t.capture <= Date.now()).to.be.ok;

        setTimeout(function () {
            var old = t.capture;
            expect(t.record('capture') >= old).to.be.ok;
            done();
        }, 5);
    });

    it('can be serialised to an object', function () {
        var t = new Timings({
            labelOne: 1468345625321,
            labelTwo: 1368345625321
        });

        expect(t.toObject()).eql({
            labelOne: 1468345625321,
            labelTwo: 1368345625321
        });
    });
});
