#!/usr/bin/env node
require('shelljs/global');
require('colors');

var path = require('path'),
    async = require('async'),
    tmp = require('tmp');

module.exports = function (exit) {
    // banner line
    console.info('Running newman integration tests...'.yellow.bold);

    tmp.dir(function (err, dir, cleanup) {
        if (err || dir.length < 4) {
            console.error(err);

            return exit(1);
        }

        var installDir = path.join('node_modules', 'newman');

        pushd(dir);

        return async.waterfall([
            function (next) {
                console.info(('Setting up integration package at ' + dir).green);
                exec('npm i newman --loglevel error', function (code, out, err) {
                    next(code === 0 ? null : err);
                });
            },
            function (next) {
                console.info(('Installing dev dependencies of newman at ' + installDir).green);
                pushd(installDir);
                exec('npm i . --loglevel error', function (code, out, err) {
                    popd();
                    next(code === 0 ? null : err);
                });
            },
            function (next) {
                console.info(('Migrating local runtime to ' + installDir).green);
                pushd(installDir);
                exec('npm i ' + path.join(__dirname, '..') + ' --loglevel error', function (code, out, err) {
                    popd();
                    next(code === 0 ? null : err);
                });
            },
            function (next) {
                console.info('Running newman tests...'.green);
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
!module.parent && module.exports(exit);
