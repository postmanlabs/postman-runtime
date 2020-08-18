#!/usr/bin/env node
// ---------------------------------------------------------------------------------------------------------------------
// This script is intended to execute all unit tests in the Chrome Browser.
// ---------------------------------------------------------------------------------------------------------------------
/* eslint-env node, es6 */

require('shelljs/global');

var chalk = require('chalk'),
    path = require('path'),

    servers = require('../test/fixtures/servers'),
    KARMA_CONFIG_PATH = path.join(__dirname, '..', 'test', 'karma.conf');

module.exports = function (exit) {
    console.info(chalk.yellow.bold('Running unit and integration tests within browser...'));

    servers.start(function (err) {
        if (err) {
            throw new Error('Server start failure');
        }

        var KarmaServer = require('karma').Server;

        (new KarmaServer({ // eslint-disable no-new
            cmd: 'start',
            configFile: KARMA_CONFIG_PATH
        }, function (runError) {
            servers.close(function (err) {
                exit(process.exitCode || runError || err ? 1 : 0);
            });
        })).start();
    });
};

// ensure we run this script exports if this is a direct stdin.tty run
!module.parent && module.exports(exit);
