const fs = require('fs'),
    path = require('path'),
    tmp = require('tmp'),
    expect = require('chai').expect;

(typeof window === 'undefined' ? describe : describe.skip)('Requester Spec: sslKeyLogFile', function () {
    var testrun,
        tmpDir,
        sslKeyLogFilePath;

    describe('with sslKeyLogFile', function () {
        tmpDir = tmp.dirSync({ unsafeCleanup: true });
        sslKeyLogFilePath = path.join(tmpDir.name, 'ssl-keylog.txt');

        before(function (done) {
            this.run({
                requester: {
                    strictSSL: false,
                    sslKeyLogFile: sslKeyLogFilePath
                },
                collection: {
                    item: [{
                        request: global.servers.https
                    }]
                }
            }, function (err, results) {
                testrun = results;
                done(err);
            });
        });
        after(function () {
            // Clean up temporary directory
            if (tmpDir) {
                tmpDir.removeCallback();
            }
        });

        it('should complete the run', function () {
            expect(testrun).to.be.ok;
            expect(testrun).to.nested.include({
                'done.calledOnce': true,
                'start.calledOnce': true,
                'request.calledOnce': true
            });
        });

        it('should write SSL key log data to the specified file', function () {
            // Check that the file exists
            expect(fs.existsSync(sslKeyLogFilePath)).to.be.true;

            // Read the file contents
            const fileContents = fs.readFileSync(sslKeyLogFilePath, 'utf8');

            // Verify the file has content (SSL key log entries)
            expect(fileContents).to.be.a('string');
            expect(fileContents.length).to.be.greaterThan(0);

            // SSL key log format should contain CLIENT_RANDOM or other SSL key log entries
            // The format is typically lines like: "CLIENT_RANDOM <hex> <hex>"
            expect(fileContents).to.match(/CLIENT_/);
        });
    });

    describe('with sslKeyLogFile and non-empty file', function () {
        before(function (done) {
            tmpDir = tmp.dirSync({ unsafeCleanup: true });
            sslKeyLogFilePath = path.join(tmpDir.name, 'ssl-keylog.txt');

            // Write some content to the file
            fs.writeFileSync(sslKeyLogFilePath, '1234567890');

            this.run({
                requester: {
                    strictSSL: false,
                    sslKeyLogFile: sslKeyLogFilePath
                },
                collection: {
                    item: [{
                        request: global.servers.https
                    }]
                }
            }, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        after(function () {
            // Clean up temporary directory
            if (tmpDir) {
                tmpDir.removeCallback();
            }
        });

        it('should complete the run', function () {
            expect(testrun).to.be.ok;
            expect(testrun).to.nested.include({
                'done.calledOnce': true,
                'start.calledOnce': true,
                'request.calledOnce': true
            });
        });
        it('should append to the existing SSL key log data in the specified file', function () {
            // Check that the file exists
            expect(fs.existsSync(sslKeyLogFilePath)).to.be.true;

            // Read the file contents
            const fileContents = fs.readFileSync(sslKeyLogFilePath, 'utf8');

            // Verify the file has content (SSL key log entries)
            expect(fileContents).to.be.a('string');
            expect(fileContents.length).to.be.greaterThan(0);

            // Verify the file contains the existing content
            expect(fileContents).to.include('1234567890');

            // Verify the file contains the new content
            expect(fileContents).to.include('CLIENT_HANDSHAKE_TRAFFIC_SECRET');
        });
    });

    describe('without sslKeyLogFile', function () {
        before(function (done) {
            tmpDir = tmp.dirSync({ unsafeCleanup: true });
            sslKeyLogFilePath = path.join(tmpDir.name, 'ssl-keylog.txt');

            this.run({
                requester: {
                    strictSSL: false
                },
                collection: {
                    item: [{
                        request: global.servers.https
                    }]
                }
            }, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        after(function () {
            // Clean up temporary directory
            if (tmpDir) {
                tmpDir.removeCallback();
            }
        });

        it('should complete the run', function () {
            expect(testrun).to.be.ok;
            expect(testrun).to.nested.include({
                'done.calledOnce': true,
                'start.calledOnce': true,
                'request.calledOnce': true
            });
        });

        it('should not have any SSL key log data in the file', function () {
            // Check that the file does not exist
            expect(fs.existsSync(sslKeyLogFilePath)).to.be.false;
        });
    });

    describe('with invalid sslKeyLogFile path', function () {
        before(function (done) {
            tmpDir = tmp.dirSync({ unsafeCleanup: true });
            sslKeyLogFilePath = path.join(tmpDir.name, 'ssl-keylog.txt');

            this.run({
                requester: {
                    strictSSL: false,
                    sslKeyLogFile: '/invalid/path/that/does/not/exist/ssl-keylog.txt'
                },
                collection: {
                    item: [{
                        request: global.servers.https
                    }]
                }
            }, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        after(function () {
            // Clean up temporary directory
            if (tmpDir) {
                tmpDir.removeCallback();
            }
        });

        it('should complete the run despite invalid path', function () {
            expect(testrun).to.be.ok;
            expect(testrun).to.nested.include({
                'done.calledOnce': true,
                'start.calledOnce': true,
                'request.calledOnce': true
            });
        });
        it('should not have any SSL key log data in the file', function () {
            // Check that the file does not exist
            expect(fs.existsSync(sslKeyLogFilePath)).to.be.false;
        });
    });

    describe('with multiple HTTPS requests', function () {
        before(function (done) {
            tmpDir = tmp.dirSync({ unsafeCleanup: true });
            sslKeyLogFilePath = path.join(tmpDir.name, 'ssl-keylog.txt');

            this.run({
                requester: {
                    strictSSL: false,
                    sslKeyLogFile: sslKeyLogFilePath
                },
                collection: {
                    item: [
                        {
                            request: global.servers.https
                        },
                        {
                            request: global.servers.https
                        }
                    ]
                }
            }, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        after(function () {
            // Clean up temporary directory
            if (tmpDir) {
                tmpDir.removeCallback();
            }
        });

        it('should complete the run', function () {
            expect(testrun).to.be.ok;
            expect(testrun).to.nested.include({
                'done.calledOnce': true,
                'start.calledOnce': true
            });
            expect(testrun.request.callCount).to.equal(2);
        });

        it('should write SSL key log data from all requests to the same file', function () {
            // Check that the file exists
            expect(fs.existsSync(sslKeyLogFilePath)).to.be.true;

            // Read the file contents
            const fileContents = fs.readFileSync(sslKeyLogFilePath, 'utf8');

            // Verify the file has content
            expect(fileContents).to.be.a('string');
            expect(fileContents.length).to.be.greaterThan(0);

            // Should contain SSL key log entries
            expect(fileContents).to.match(/CLIENT_/);
        });
    });
});

