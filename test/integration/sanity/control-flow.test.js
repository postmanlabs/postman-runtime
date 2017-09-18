var _ = require('lodash'),
    sinon = require('sinon'),
    Collection = require('postman-collection').Collection,
    Runner = require('../../../index.js').Runner;


describe('Control Flow', function () {
    this.timeout(10 * 1000);
    var timeout = 1000,
        runner,
        spec,
        callbacks;

    beforeEach(function () {
        runner = new Runner();
        callbacks = {};
        spec = {
            collection: {
                item: [{
                    request: {
                        url: 'http://postman-echo.com/get',
                        method: 'GET'
                    }
                }]
            }
        };

        // add a spy for each callback
        _.forEach(_.keys(Runner.Run.triggers), function (eventName) {
            callbacks[eventName] = sinon.spy();
        });
    });

    it('must allow a run to be aborted', function (done) {
        callbacks.done = sinon.spy(function () {
            expect(callbacks).be.ok();
            expect(callbacks.done.calledOnce).be.ok();
            expect(callbacks.done.getCall(0).args[0]).to.be(null);
            expect(callbacks.start.calledOnce).be.ok();
            expect(callbacks.abort.calledOnce).be.ok();
            return done();
        });
        // eslint-disable-next-line handle-callback-err
        runner.run(new Collection(spec.collection), {}, function (err, run) {
            run.start(callbacks);
            run.abort();
        });
    });

    it('must allow a run to be paused and then resumed', function (done) {
        callbacks.done = sinon.spy(function () {
            expect(callbacks).be.ok();
            expect(callbacks.done.calledOnce).be.ok();
            expect(callbacks.done.getCall(0).args[0]).to.be(null);
            expect(callbacks.start.calledOnce).be.ok();
            expect(callbacks.pause.calledOnce).be.ok();
            expect(callbacks.resume.calledOnce).be.ok();
            return done();
        });

        // eslint-disable-next-line handle-callback-err
        runner.run(new Collection(spec.collection), {}, function (err, run) {
            run.start(callbacks);
            run.pause(() => {
                setTimeout(run.resume.bind(run), timeout);
            });
        });
    });

    it('must allow a run to be paused and then aborted', function (done) {
        callbacks.done = sinon.spy(function () {
            expect(callbacks).be.ok();
            expect(callbacks.done.calledOnce).be.ok();
            expect(callbacks.done.getCall(0).args[0]).to.be(null);
            expect(callbacks.start.calledOnce).be.ok();
            expect(callbacks.pause.calledOnce).be.ok();
            expect(callbacks.abort.calledOnce).be.ok();
            return done();
        });

        // eslint-disable-next-line handle-callback-err
        runner.run(new Collection(spec.collection), {}, function (err, run) {
            run.start(callbacks);
            run.pause(() => {
                setTimeout(run.abort.bind(run), timeout);
            });
        });
    });
});
