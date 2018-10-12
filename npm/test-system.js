#!/usr/bin/env node
require('shelljs/global');
require('colors');

var async = require('async'),
    fs = require('fs'),
    path = require('path'),
    expect = require('chai').expect,
    Mocha = require('mocha'),

    SPEC_SOURCE_DIR = './test/system';

module.exports = function (exit) {
    // banner line
    console.log('\nRunning system tests using mocha...'.yellow.bold);

    async.series([
        // run test specs using mocha
        function (next) {
            var mocha = new Mocha();

            fs.readdir(SPEC_SOURCE_DIR, function (err, files) {
                if (err) { return next(err); }

                files.filter(function (file) {
                    return (file.substr(-8) === '.test.js');
                }).forEach(function (file) {
                    mocha.addFile(path.join(SPEC_SOURCE_DIR, file));
                });

                // start the mocha run
                global.expect = expect; // for easy reference

                mocha.run(function (err) {
                    // clear references and overrides
                    delete global.expect;

                    err && console.error(err.stack || err);
                    next(err ? 1 : 0);
                });
                // cleanup
                mocha = null;
            });
        }
    ], exit);
};

// ensure we run this script exports if this is a direct stdin.tty run
!module.parent && module.exports(exit);
