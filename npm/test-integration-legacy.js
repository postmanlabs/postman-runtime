#!/usr/bin/env node
require('shelljs/global');
require('colors');

var fs = require('fs'),
    path = require('path'),
    Mocha = require('mocha'),

    SPEC_SOURCE_DIR = './test/integration-legacy';

module.exports = function (exit) {
    // banner line
    console.log('Running integration tests using mocha on node...'.yellow.bold);

    var mocha = new Mocha({
        timeout: 10000
    });

    fs.readdir(SPEC_SOURCE_DIR, function (err, files) {
        if (err) { return next(err); }

        files.filter(function (file) {
            return (file.substr(-8) === '.test.js');
        }).forEach(function (file) {
            mocha.addFile(path.join(SPEC_SOURCE_DIR, file));
        });

        // start the mocha run
        mocha.run(exit);
        mocha = null; // cleanup
    });
};

// ensure we run this script exports if this is a direct stdin.tty run
!module.parent && module.exports(exit);
