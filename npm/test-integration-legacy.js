#!/usr/bin/env node
// ---------------------------------------------------------------------------------------------------------------------
// This script is intended to execute all integration-legacy tests.
// ---------------------------------------------------------------------------------------------------------------------

// set directories and files for test and coverage report
const path = require('path'),

    chalk = require('chalk'),
    Mocha = require('mocha'),
    recursive = require('recursive-readdir'),

    SPEC_SOURCE_DIR = path.join(__dirname, '..', 'test', 'integration-legacy');

module.exports = function (exit) {
    // banner line
    console.info(chalk.yellow.bold('Running integration-legacy tests using mocha on node...'));

    // add all spec files to mocha
    recursive(SPEC_SOURCE_DIR, function (err, files) {
        if (err) {
            console.error(err);

            return exit(1);
        }

        const mocha = new Mocha({ timeout: 1000 * 60 });

        files.filter(function (file) { // extract all test files
            return (file.substr(-8) === '.test.js');
        }).forEach(mocha.addFile.bind(mocha));

        mocha.run(function (err) {
            err && console.error(err.stack || err);
            exit(err ? 1 : 0);
        });
    });
};

// ensure we run this script exports if this is a direct stdin.tty run
!module.parent && module.exports(process.exit);
