#!/usr/bin/env node
// ---------------------------------------------------------------------------------------------------------------------
// This script is intended to execute all Newman tests with the local Runtime version.
// ---------------------------------------------------------------------------------------------------------------------

const path = require('path'),

    tmp = require('tmp'),
    chalk = require('chalk'),
    async = require('async'),
    { exec, rm, pushd, popd } = require('shelljs');

module.exports = function (exit) {
    console.info(chalk.yellow.bold('Running newman integration tests...'));

    tmp.dir(function (err, dir, cleanup) {
        if (err || dir.length < 4) {
            console.error(err);

            return exit(1);
        }

        const installDir = path.join('node_modules', 'newman');

        pushd(dir);

        return async.waterfall([
            function (next) {
                console.info(chalk.green('Setting up integration package at ' + dir));
                exec('npm i newman --loglevel error', function (code, out, err) {
                    next(code === 0 ? null : err);
                });
            },
            function (next) {
                console.info(chalk.green('Installing dev dependencies of newman at ' + installDir));
                pushd(installDir);
                exec('npm i . --loglevel error', function (code, out, err) {
                    popd();
                    next(code === 0 ? null : err);
                });
            },
            function (next) {
                console.info(chalk.green('Migrating local runtime to ' + installDir));
                pushd(installDir);
                exec('npm i ' + path.join(__dirname, '..') + ' --loglevel error', function (code, out, err) {
                    popd();
                    next(code === 0 ? null : err);
                });
            },
            function (next) {
                console.info(chalk.green('Running newman tests...'));
                pushd(installDir);
                // @todo figure out a way to bypass packity
                exec('npm run test-unit && npm run test-integration && npm run test-cli', function (code, out, err) {
                    popd();
                    next(code === 0 ? null : err);
                });
            }
        ], function (err) {
            popd();
            rm('-rf', path.join(dir, '*'));
            cleanup();
            err && console.error(err);
            exit(err ? 1 : 0);
        });
    });
};

// ensure we run this script exports if this is a direct stdin.tty run
!module.parent && module.exports(process.exit);
