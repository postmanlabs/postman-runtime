var _ = require('lodash'),
    sinon = require('sinon').createSandbox(),
    expect = require('chai').expect,
    Collection = require('postman-collection').Collection,
    Runner = require('../../index.js').Runner,

    runtime;

// by default Node 12 throws error on using anything below TLSv1.2
require('tls').DEFAULT_MIN_VERSION = 'TLSv1';

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

    // eslint-disable-next-line n/handle-callback-err
    runner.run(new Collection(spec.collection), _.omit(spec, ['collection', 'options']), function (err, run) {
        // the final done callback needs special attention
        callbacks.done = sinon.spy(function () {
            setTimeout(function () { run.host.dispose(); }, spec.__disposeTimeout || 0);
            done(null, callbacks, spec);
        });

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
