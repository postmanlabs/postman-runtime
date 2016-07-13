/* global describe, it */
var expect = require('expect.js');

describe('runner~timings', function () {
    var Timings = require('../../lib/runner/timings');

    it('must expose a constructor', function () {
        expect(Timings).be.a('function');
    });

    it('must instantiate a new timings object', function () {
        expect(function () {
            var t = new Timings();
            expect(t instanceof Timings).be.ok();
        }).withArgs().to.not.throwError();
    });

    it('must instantiate a new timings object with initial records', function () {
        var t = new Timings({
            labelOne: 1468345625321,
            labelTwo: 1368345625321
        });

        expect(t).have.property('labelOne', 1468345625321);
        expect(t).have.property('labelTwo', 1368345625321);
    });

    it('can use the create method to initialise a new instance', function () {
        var t = Timings.create({
            labelOne: 1468345625321,
            labelTwo: 1368345625321
        });

        expect(t instanceof Timings).be.ok();
        expect(t).have.property('labelOne', 1468345625321);
        expect(t).have.property('labelTwo', 1368345625321);
    });

    it('casts non numeric initial records to numbers', function () {
        var t = new Timings({
            string: '1468345625321',
            float: 136834562532.29,
            date: new Date(1468345625321)
        });

        expect(t).have.property('string', 1468345625321);
        expect(t).have.property('float', 136834562532);
        expect(isNaN(t.date)).be.ok();
    });

    it('records the current date time with a label', function () {
        var t = new Timings();
        t.record('capture');
        expect(t).have.property('capture');
        expect(t.capture).be.a('number');
        expect(t.capture <= Date.now()).be.ok();
    });

    it('recording twice overrides old label', function (done) {
        var t = new Timings();

        t.record('capture');
        expect(t.capture <= Date.now()).be.ok();

        setTimeout(function () {
            var old = t.capture;
            expect(t.record('capture') >= old).be.ok();
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
