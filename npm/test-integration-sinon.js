#!/usr/bin/env node
require('shelljs/global');
require('colors');

var fs = require('fs'),
    path = require('path'),
    Mocha = require('mocha'),

    SPEC_SOURCE_DIR = 'test/integration-sinon';

module.exports = function (exit) {
    // banner line
    console.log('Running integration tests using mocha on node...'.yellow.bold);

    // add all spec files to mocha
    fs.readdir(SPEC_SOURCE_DIR, function (err, files) {
        if (err) { console.error(err); return exit(1); }

        var mocha = new Mocha({timeout: 1000 * 60});

        // load the bootstrap file before all other files
        mocha.addFile('./' + path.join(SPEC_SOURCE_DIR, 'bootstrap.js'));

        files.filter(function (file) { // extract all test files
            return (file.substr(-8) === '.test.js');
        }).forEach(function (file) {
            mocha.addFile('./' + path.join(SPEC_SOURCE_DIR, file));
        });

        mocha.run(function (err) {
            exit(err ? 1 : 0);
        });
    });
};

// ensure we run this script exports if this is a direct stdin.tty run
!module.parent && module.exports(exit);
