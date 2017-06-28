#!/usr/bin/env node
/*
This script runs unit, integration, and integration legacy tests and generates the cumulative coverage for them.
 */
/* eslint-env node, es6 */

require('shelljs/global');
require('colors');

var COV_REPORT_PATH = '.coverage',
    SPEC_SOURCES = 'test/unit test/integration test/integration-legacy';

module.exports = function (exit) {
    var specPattern = (process.argv[2] || '.*'),
        mochaReporter = 'spec';

    // banner line
    console.log(`Generating overall code coverage for ${process.env.npm_package_name}...`.yellow.bold);

    mkdir('-p', '.tmp');
    test('-d', COV_REPORT_PATH) && rm('-rf', COV_REPORT_PATH) && mkdir('-p', COV_REPORT_PATH);

    // @todo: Replace Istanbul with nyc
    exec(`./node_modules/.bin/istanbul cover --dir ${COV_REPORT_PATH} --colors ` +
        `--print both node_modules/mocha/bin/_mocha -- ${SPEC_SOURCES} --reporter ${mochaReporter} ` +
        `--recursive --prof --colors --timeout 60000 --grep=${specPattern}`, exit);
};

// ensure we run this script exports if this is a direct stdin.tty run
!module.parent && module.exports(exit);
