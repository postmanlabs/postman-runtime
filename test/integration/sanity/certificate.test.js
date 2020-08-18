var fs = require('fs'),
    path = require('path'),
    expect = require('chai').expect,
    CertificateList = require('postman-collection').CertificateList;

(typeof window === 'undefined' ? describe : describe.skip)('certificates', function () {
    var certDataPath = path.join(__dirname, '..', '..', 'fixtures', 'certificates'),
        certificateId = 'test-certificate',
        testrun;

    describe('valid', function () {
        before(function (done) {
            var clientKeyPath = path.join(certDataPath, 'client-key.pem'),
                clientCertPath = path.join(certDataPath, 'client-crt.pem'),
                certificateList = new CertificateList({}, [{
                    id: certificateId,
                    matches: [global.servers.httpsRequestCert + '/*'],
                    key: {src: clientKeyPath},
                    cert: {src: clientCertPath}
                }]);

            this.run({
                collection: {
                    item: {
                        request: global.servers.httpsRequestCert + '/'
                    }
                },
                requester: {
                    strictSSL: false
                },
                fileResolver: fs,
                certificates: certificateList
            }, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        it('should have started and completed the test run', function () {
            expect(testrun).to.be.ok;
            expect(testrun).to.nested.include({
                'done.calledOnce': true,
                'start.calledOnce': true
            });
        });

        it('should receive response from https server', function () {
            var response = testrun.request.getCall(0).args[2];

            expect(response.reason()).to.eql('OK');
            expect(response.text()).to.eql('authorized');
        });

        it('should have certificate attached to request', function () {
            var request = testrun.request.getCall(0).args[3].toJSON();

            expect(request).to.nested.include({
                'certificate.id': certificateId
            });
        });
    });

    describe('invalid', function () {
        before(function (done) {
            var clientKeyPath = path.join('/tmp/non-existent/', 'client-key.pem'),
                clientCertPath = path.join('/tmp/non-existent/', 'client-crt.pem'),
                certificateList = new CertificateList({}, [{
                    id: certificateId,
                    matches: [global.servers.https + '/*'],
                    key: {src: clientKeyPath},
                    cert: {src: clientCertPath}
                }]);

            this.run({
                collection: {
                    item: {
                        request: global.servers.https + '/verify'
                    }
                },
                requester: {
                    strictSSL: false
                },
                fileResolver: fs,
                certificates: certificateList
            }, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        it('should have started and completed the test run', function () {
            expect(testrun).to.be.ok;
            expect(testrun).to.nested.include({
                'done.calledOnce': true,
                'start.calledOnce': true
            });
        });

        it('should not throw an error', function () {
            expect(testrun).to.nested.include({
                'request.calledOnce': true
            });

            var err = testrun.request.firstCall.args[0],
                request = testrun.request.firstCall.args[3];

            expect(err).to.not.be.ok;
            expect(request).to.not.have.property('certificate');
        });

        it('should receive response from https server', function () {
            var response = testrun.request.getCall(0).args[2];

            expect(response.reason()).to.eql('Unauthorized');
            expect(response.text()).to.eql('unauthorized');
        });

        it('should trigger a console warning', function () {
            expect(testrun).to.nested.include({
                'console.calledTwice': true
            });

            var call1 = testrun.console.firstCall.args,
                call2 = testrun.console.secondCall.args;

            expect(call1[0]).to.have.property('ref');
            expect(call1[1]).to.equal('warn');
            expect(call1[2]).to.match(/^certificate ("key"|"cert") load error:/);

            expect(call2[0]).to.have.property('ref');
            expect(call2[1]).to.equal('warn');
            expect(call2[2]).to.match(/^certificate ("key"|"cert") load error:/);
        });
    });

    describe('PFX: valid', function () {
        before(function (done) {
            var clientPfxPath = path.join(certDataPath, 'client-pkcs12.pfx'),
                certificateList = new CertificateList({}, [{
                    id: certificateId,
                    matches: [global.servers.httpsRequestCert + '/*'],
                    pfx: {src: clientPfxPath}
                }]);

            this.run({
                collection: {
                    item: {
                        request: global.servers.httpsRequestCert
                    }
                },
                requester: {
                    strictSSL: false
                },
                fileResolver: fs,
                certificates: certificateList
            }, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        it('should have started and completed the test run', function () {
            expect(testrun).to.be.ok;
            expect(testrun).to.nested.include({
                'done.calledOnce': true,
                'start.calledOnce': true
            });
        });

        it('should receive response from https server', function () {
            var response = testrun.request.getCall(0).args[2];

            expect(response.reason()).to.eql('OK');
            expect(response.text()).to.eql('authorized');
        });

        it('should have certificate attached to request', function () {
            var request = testrun.request.getCall(0).args[3].toJSON();

            expect(request).to.nested.include({
                'certificate.id': certificateId
            });
        });
    });

    describe('PFX: invalid', function () {
        before(function (done) {
            // pkcs12 generated using a different crt and key
            var clientPfxPath = path.join(certDataPath, 'client-pkcs12-invalid.pfx'),
                certificateList = new CertificateList({}, [{
                    id: certificateId,
                    matches: [global.servers.httpsRequestCert + '/*'],
                    pfx: {src: clientPfxPath},
                    passphrase: 'random'
                }]);

            this.run({
                collection: {
                    item: {
                        request: global.servers.httpsRequestCert
                    }
                },
                requester: {
                    strictSSL: false
                },
                fileResolver: fs,
                certificates: certificateList
            }, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        it('should have started and completed the test run', function () {
            expect(testrun).to.be.ok;
            expect(testrun).to.nested.include({
                'done.calledOnce': true,
                'start.calledOnce': true
            });
        });

        it('should throw error on request', function () {
            var err = testrun.request.getCall(0).args[0];

            expect(err).to.be.ok;
            expect(err).to.have.property('message', 'mac verify failure');
        });

        it('should have certificate attached to request', function () {
            var request = testrun.request.getCall(0).args[3].toJSON();

            expect(request).to.nested.include({
                'certificate.id': certificateId
            });
        });
    });

    describe('PFX: missing', function () {
        before(function (done) {
            var clientPfxPath = path.join('/tmp/non-existent/', 'client-pkcs12.pfx'),
                certificateList = new CertificateList({}, [{
                    id: certificateId,
                    matches: [global.servers.https + '/*'],
                    pfx: {src: clientPfxPath}
                }]);

            this.run({
                collection: {
                    item: {
                        request: global.servers.https + '/verify'
                    }
                },
                requester: {
                    strictSSL: false
                },
                fileResolver: fs,
                certificates: certificateList
            }, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        it('should have started and completed the test run', function () {
            expect(testrun).to.be.ok;
            expect(testrun).to.nested.include({
                'done.calledOnce': true,
                'start.calledOnce': true
            });
        });

        it('should receive response from https server', function () {
            var response = testrun.request.getCall(0).args[2];

            expect(response.reason()).to.eql('Unauthorized');
            expect(response.text()).to.eql('unauthorized');
        });

        it('should not throw an error', function () {
            expect(testrun).to.nested.include({
                'request.calledOnce': true
            });

            var err = testrun.request.firstCall.args[0],
                request = testrun.request.firstCall.args[3];

            expect(err).to.not.be.ok;
            expect(request).to.not.have.property('certificate');
        });

        it('should trigger a console warning', function () {
            expect(testrun).to.nested.include({
                'console.calledOnce': true
            });

            var log = testrun.console.firstCall.args;

            expect(log[0]).to.have.property('ref');
            expect(log[1]).to.equal('warn');
            expect(log[2]).to.match(/^certificate "pfx" load error:/);
        });
    });

    describe('PFX: valid passphrase', function () {
        before(function (done) {
            var clientPfxPath = path.join(certDataPath, 'client-pkcs12-passphrase.pfx'),
                certificateList = new CertificateList({}, [{
                    id: certificateId,
                    matches: [global.servers.httpsRequestCert + '/*'],
                    pfx: {src: clientPfxPath},
                    passphrase: 'password'
                }]);

            this.run({
                collection: {
                    item: {
                        request: global.servers.httpsRequestCert
                    }
                },
                requester: {
                    strictSSL: false
                },
                fileResolver: fs,
                certificates: certificateList
            }, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        it('should have started and completed the test run', function () {
            expect(testrun).to.be.ok;
            expect(testrun).to.nested.include({
                'done.calledOnce': true,
                'start.calledOnce': true
            });
        });

        it('should receive response from https server', function () {
            var response = testrun.request.getCall(0).args[2];

            expect(response.reason()).to.eql('OK');
            expect(response.text()).to.eql('authorized');
        });

        it('should have certificate attached to request', function () {
            var request = testrun.request.getCall(0).args[3].toJSON();

            expect(request).to.nested.include({
                'certificate.id': certificateId
            });
        });
    });

    describe('PFX: invalid passphrase', function () {
        before(function (done) {
            var clientPfxPath = path.join(certDataPath, 'client-pkcs12-passphrase.pfx'),
                certificateList = new CertificateList({}, [{
                    id: certificateId,
                    matches: [global.servers.httpsRequestCert + '/*'],
                    pfx: {src: clientPfxPath},
                    passphrase: 'random'
                }]);

            this.run({
                collection: {
                    item: {
                        request: global.servers.httpsRequestCert
                    }
                },
                requester: {
                    strictSSL: false
                },
                fileResolver: fs,
                certificates: certificateList
            }, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        it('should have started and completed the test run', function () {
            expect(testrun).to.be.ok;
            expect(testrun).to.nested.include({
                'done.calledOnce': true,
                'start.calledOnce': true
            });
        });

        it('should throw error on request', function () {
            var err = testrun.request.getCall(0).args[0];

            expect(err).to.be.ok;
            expect(err).to.have.property('message', 'mac verify failure');
        });

        it('should have certificate attached to request', function () {
            var request = testrun.request.getCall(0).args[3].toJSON();

            expect(request).to.nested.include({
                'certificate.id': certificateId
            });
        });
    });
});
