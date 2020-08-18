var _ = require('lodash'),
    sinon = require('sinon').createSandbox(),
    expect = require('chai').expect,
    Collection = require('postman-collection').Collection,
    Runner = require('../../index.js').Runner,

    runtime;

runtime = function (spec, done) {
    // restores all spies created through sandbox in the previous run
    // @todo avoid restore on the first run
    sinon.restore();

    _.isString(spec) && (spec = require('./' + spec));

    var runner = new Runner(_.merge({}, spec.options)),
        callbacks = {};

    // add a spy for each callback
    _.forEach(_.keys(Runner.Run.triggers), function (eventName) {
        callbacks[eventName] = sinon.spy();
    });

    // the final done callback needs special attention
    callbacks.done = sinon.spy(function () {
        done(null, callbacks, spec);
    });

    // eslint-disable-next-line handle-callback-err
    runner.run(new Collection(spec.collection), _.omit(spec, ['collection', 'options']), function (err, run) {
        run.start(callbacks);
    });
};

before(function () {
    global.expect = expect; // expose global
    global.servers = require('../fixtures/servers/servers.json');
    this.run = runtime;
});

after(function () {
    delete global.expect;
    // restores all spies created through sandbox in the previous run
    sinon.restore();
});
