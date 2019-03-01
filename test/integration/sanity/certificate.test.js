var fs = require('fs'),
    path = require('path'),
    expect = require('chai').expect,
    server = require('../../fixtures/server'),
    CertificateList = require('postman-collection').CertificateList;

describe('certificates', function () {
    var certDataPath = path.join(__dirname, '..', '..', 'fixtures', 'certificates'),
        certificateId = 'test-certificate',
        port = 9090,
        sslServer,
        testrun;

    describe('valid', function () {
        before(function (done) {
            var clientKeyPath = path.join(certDataPath, 'client-key.pem'),
                clientCertPath = path.join(certDataPath, 'client-crt.pem'),
                certificateList = new CertificateList({}, [{
                    id: certificateId,
                    matches: ['https://localhost:' + port + '/*'],
                    key: {src: clientKeyPath},
                    cert: {src: clientCertPath}
                }]);

            sslServer = server.createSSLServer({
                requestCert: true
            });

            sslServer.on('/', function (req, res) {
                if (req.client.authorized) {
                    res.writeHead(200, {'Content-Type': 'text/plain'});
                    res.end('authorized');
                }
                else {
                    res.writeHead(401, {'Content-Type': 'text/plain'});
                    res.end('unauthorized');
                }
            });

            sslServer.listen(port, 'localhost');

            this.run({
                collection: {
                    item: {
                        request: 'https://localhost:' + port + '/'
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

        after(function (done) {
            sslServer.destroy(done);
        });
    });

    describe('invalid', function () {
        before(function (done) {
            var clientKeyPath = path.join('/tmp/non-existent/', 'client-key.pem'),
                clientCertPath = path.join('/tmp/non-existent/', 'client-crt.pem'),
                certificateList = new CertificateList({}, [{
                    id: certificateId,
                    matches: ['https://localhost:' + port + '/*'],
                    key: {src: clientKeyPath},
                    cert: {src: clientCertPath}
                }]);

            sslServer = server.createSSLServer();

            sslServer.on('/', function (req, res) {
                if (req.client.authorized) {
                    res.writeHead(200, {'Content-Type': 'text/plain'});
                    res.end('authorized');
                }
                else {
                    res.writeHead(401, {'Content-Type': 'text/plain'});
                    res.end('unauthorized');
                }
            });

            sslServer.listen(port, 'localhost');

            this.run({
                collection: {
                    item: {
                        request: 'https://localhost:' + port + '/'
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

        after(function (done) {
            sslServer.destroy(done);
        });
    });

    describe('PFX: valid', function () {
        before(function (done) {
            var clientPfxPath = path.join(certDataPath, 'client-pkcs12.pfx'),
                certificateList = new CertificateList({}, [{
                    id: certificateId,
                    matches: ['https://localhost:' + port + '/*'],
                    pfx: {src: clientPfxPath}
                }]);

            sslServer = server.createSSLServer({
                requestCert: true
            });

            sslServer.on('/', function (req, res) {
                if (req.client.authorized) {
                    res.writeHead(200, {'Content-Type': 'text/plain'});
                    res.end('authorized');
                }
                else {
                    res.writeHead(401, {'Content-Type': 'text/plain'});
                    res.end('unauthorized');
                }
            });

            sslServer.listen(port, 'localhost');

            this.run({
                collection: {
                    item: {
                        request: 'https://localhost:' + port + '/'
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

        after(function (done) {
            sslServer.destroy(done);
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
                    matches: ['https://localhost:' + port + '/*'],
                    pfx: {src: clientPfxPath},
                    passphrase: 'random'
                }]);

            sslServer = server.createSSLServer({
                requestCert: true
            });

            sslServer.on('/', function (req, res) {
                if (req.client.authorized) {
                    res.writeHead(200, {'Content-Type': 'text/plain'});
                    res.end('authorized');
                }
                else {
                    res.writeHead(401, {'Content-Type': 'text/plain'});
                    res.end('unauthorized');
                }
            });

            sslServer.listen(port, 'localhost');

            this.run({
                collection: {
                    item: {
                        request: 'https://localhost:' + port + '/'
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

        after(function (done) {
            sslServer.destroy(done);
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
                    matches: ['https://localhost:' + port + '/*'],
                    pfx: {src: clientPfxPath}
                }]);

            sslServer = server.createSSLServer();

            sslServer.on('/', function (req, res) {
                if (req.client.authorized) {
                    res.writeHead(200, {'Content-Type': 'text/plain'});
                    res.end('authorized');
                }
                else {
                    res.writeHead(401, {'Content-Type': 'text/plain'});
                    res.end('unauthorized');
                }
            });

            sslServer.listen(port, 'localhost');

            this.run({
                collection: {
                    item: {
                        request: 'https://localhost:' + port + '/'
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

        after(function (done) {
            sslServer.destroy(done);
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
                    matches: ['https://localhost:' + port + '/*'],
                    pfx: {src: clientPfxPath},
                    passphrase: 'password'
                }]);

            sslServer = server.createSSLServer({
                requestCert: true
            });

            sslServer.on('/', function (req, res) {
                if (req.client.authorized) {
                    res.writeHead(200, {'Content-Type': 'text/plain'});
                    res.end('authorized');
                }
                else {
                    res.writeHead(401, {'Content-Type': 'text/plain'});
                    res.end('unauthorized');
                }
            });

            sslServer.listen(port, 'localhost');

            this.run({
                collection: {
                    item: {
                        request: 'https://localhost:' + port + '/'
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

        after(function (done) {
            sslServer.destroy(done);
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
                    matches: ['https://localhost:' + port + '/*'],
                    pfx: {src: clientPfxPath},
                    passphrase: 'random'
                }]);

            sslServer = server.createSSLServer({
                requestCert: true
            });

            sslServer.on('/', function (req, res) {
                if (req.client.authorized) {
                    res.writeHead(200, {'Content-Type': 'text/plain'});
                    res.end('authorized');
                }
                else {
                    res.writeHead(401, {'Content-Type': 'text/plain'});
                    res.end('unauthorized');
                }
            });

            sslServer.listen(port, 'localhost');

            this.run({
                collection: {
                    item: {
                        request: 'https://localhost:' + port + '/'
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

        after(function (done) {
            sslServer.destroy(done);
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
