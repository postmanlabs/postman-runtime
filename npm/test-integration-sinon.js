#!/usr/bin/env node
require('shelljs/global');
require('colors');

var _ = require('lodash'),
    fs = require('fs'),
    path = require('path'),
    asyncEachSeries = require('async/eachSeries'),
    Mocha = require('mocha'),
    sinon = require('sinon'),
    expect = require('expect.js'),
    Collection = require('postman-collection').Collection,
    Runner = require('../index.js').Runner,

    SPEC_SOURCE_DIR = 'test/integration-sinon';

module.exports = function (exit) {
    // banner line
    console.log('Running integration tests using mocha on node...'.yellow.bold);

    fs.readdir(SPEC_SOURCE_DIR, function (err, files) {
        if (err) {
            console.error(err);
            return exit(1);
        }

        var suites = files.filter(function (file) { // extract all test files
            return (file.substr(-8) === '.test.js');
        }).map(function (file) {
            return {
                test: './' + path.join(SPEC_SOURCE_DIR, file),
                spec: '../' + path.join(SPEC_SOURCE_DIR, file.slice(0, -8) + '.spec.js')
            };
        });

        global.sinon = sinon; // expose global for ease of use
        global.expect = expect; // expose global

        console.log('will be running test on ' + suites.length + ' suites.');
        asyncEachSeries(suites, function (suite, next) {
            var spec = require(suite.spec),
                runner = new Runner(_.merge({}, spec.options)),
                callbacks = {};

            // add a spy for each callback
            _.each(_.keys(Runner.Run.triggers), function (eventName) {
                callbacks[eventName] = sinon.spy();
            });

            // the final done callback needs special attention
            callbacks.done = sinon.spy(function () {
                console.log('testing: ' + suite.test);

                var mocha = new Mocha();
                mocha.addFile(suite.test);

                global.testrun = callbacks;
                mocha.run(function () {
                    delete global.testrun;
                    // move enxt
                    next.apply(this, arguments);
                });
            });

            console.log('running: ' + suite.spec);
            runner.run(new Collection(spec.collection), _.omit(spec, ['collection', 'options']), function (err, run) {
                run.start(callbacks);
            });
        }, function (err) {
            err && console.log(err);

            delete global.testrun;
            delete global.sinon;
            delete global.expect;
            exit(err ? 1 : 0);
        });
    });
};

// ensure we run this script exports if this is a direct stdin.tty run
!module.parent && module.exports(exit);
