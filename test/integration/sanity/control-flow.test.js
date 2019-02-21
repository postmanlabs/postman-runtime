var _ = require('lodash'),
    sinon = require('sinon').createSandbox(),
    expect = require('chai').expect,
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
                        url: 'https://postman-echo.com/get',
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

    after(function () {
        sinon.restore();
    });

    it('should allow a run to be aborted', function (done) {
        callbacks.done = sinon.spy(function () {
            expect(callbacks).to.be.ok;
            expect(callbacks.done.getCall(0).args[0]).to.be.null;
            expect(callbacks).to.nested.include({
                'done.calledOnce': true,
                'start.calledOnce': true,
                'abort.calledOnce': true
            });

            return done();
        });
        // eslint-disable-next-line handle-callback-err
        runner.run(new Collection(spec.collection), {}, function (err, run) {
            run.start(callbacks);
            run.abort();
        });
    });

    it('should allow a run to be paused and then resumed', function (done) {
        callbacks.done = sinon.spy(function () {
            expect(callbacks).to.be.ok;
            expect(callbacks.done.getCall(0).args[0]).to.be.null;
            expect(callbacks).to.nested.include({
                'done.calledOnce': true,
                'start.calledOnce': true,
                'pause.calledOnce': true,
                'resume.calledOnce': true
            });

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

    it('should allow a run to be paused and then aborted', function (done) {
        callbacks.done = sinon.spy(function () {
            expect(callbacks).to.be.ok;
            expect(callbacks.done.getCall(0).args[0]).to.be.null;
            expect(callbacks).to.nested.include({
                'done.calledOnce': true,
                'start.calledOnce': true,
                'pause.calledOnce': true,
                'abort.calledOnce': true
            });

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

    it('should allow a run to be aborted with interrupting the script execution', function (done) {
        var collection = {
            item: [{
                event: [{
                    listen: 'prerequest',
                    script: {
                        exec: 'setTimeout(function () { throw "RUN ABORT FAILED" }, 10000);'
                    }
                }],
                request: {
                    url: 'https://postman-echo.com/get',
                    method: 'GET'
                }
            }]
        };

        callbacks.script = function (err) {
            expect(err).to.be.an('object');
            expect(err).to.have.property('message', 'sandbox: execution interrupted, bridge disconnecting.');
        };

        callbacks.done = sinon.spy(function () {
            expect(callbacks).to.be.ok;
            expect(callbacks.done.getCall(0).args[0]).to.be.null;
            expect(callbacks).to.nested.include({
                'done.calledOnce': true,
                'start.calledOnce': true,
                'abort.calledOnce': true
            });

            return done();
        });

        // eslint-disable-next-line handle-callback-err
        runner.run(new Collection(collection), {}, function (err, run) {
            callbacks.beforeScript = function () {
                // wait until execution starts
                setTimeout(function () {
                    run.host.dispose(); // stop script execution
                    run.abort(); // abort the run
                }, 1000);
            };

            run.start(callbacks);
        });
    });
});
