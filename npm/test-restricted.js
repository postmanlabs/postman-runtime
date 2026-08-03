#!/usr/bin/env node
// ---------------------------------------------------------------------------------------------------------------------
// Scoped integration runner: starts the shared fixture servers, then runs ONLY the
// restricted-addresses integration suite (with the standard bootstrap). Mirrors
// npm/test-integration.js but avoids loading every integration spec. Worktree-only.
// ---------------------------------------------------------------------------------------------------------------------

const path = require('path'),

    Mocha = require('mocha'),
    servers = require('../test/fixtures/servers'),

    SPEC_SOURCE_DIR = path.join(__dirname, '..', 'test', 'integration'),
    SPEC_FILE = path.join(SPEC_SOURCE_DIR, 'sanity', 'restricted-addresses.test.js');

module.exports = function (exit) {
    servers.start(function (err) {
        if (err) {
            throw new Error('Server start failure');
        }

        const mocha = new Mocha({ timeout: 1000 * 60 });

        mocha.addFile(path.join(SPEC_SOURCE_DIR, 'bootstrap.js'));
        mocha.addFile(SPEC_FILE);

        mocha.run(function (runErr) {
            runErr && console.error(runErr.stack || runErr);
            servers.close(function (e) {
                exit(runErr || e ? 1 : 0);
            });
        });
    });
};

!module.parent && module.exports(process.exit);
