var fs = require('fs'),
    path = require('path'),
    https = require('https'),
    expect = require('chai').expect,
    enableServerDestroy = require('server-destroy'),
    CertificateList = require('postman-collection').CertificateList;

describe('certificates', function () {
    var certificateId = 'test-certificate',
        server,
        testrun;

    describe('valid', function () {
        before(function (done) {
            var port = 9090,
                certDataPath = path.join(__dirname, '..', '..', 'integration-legacy', 'data'),
                clientKeyPath = path.join(certDataPath, 'client1-key.pem'),
                clientCertPath = path.join(certDataPath, 'client1-crt.pem'),

                serverKeyPath = path.join(certDataPath, 'server-key.pem'),
                serverCertPath = path.join(certDataPath, 'server-crt.pem'),
                serverCaPath = path.join(certDataPath, 'ca-crt.pem'),

                certificateList = new CertificateList({}, [{
                    id: certificateId,
                    matches: ['https://localhost:' + port + '/*'],
                    key: {src: clientKeyPath},
                    cert: {src: clientCertPath}
                }]);

            server = https.createServer({
                key: fs.readFileSync(serverKeyPath),
                cert: fs.readFileSync(serverCertPath),
                ca: fs.readFileSync(serverCaPath),
                requestCert: true
            });

            server.on('request', function (req, res) {
                if (req.client.authorized) {
                    res.writeHead(200, {'Content-Type': 'text/plain'});
                    res.end('authorized\n');
                }
                else {
                    res.writeHead(401, {'Content-Type': 'text/plain'});
                    res.end('unauthorized\n');
                }
            });

            server.listen(port, 'localhost');

            enableServerDestroy(server);

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

            expect(response.text()).to.eql('authorized\n');
        });

        it('should have certificate attached to request', function () {
            var request = testrun.request.getCall(0).args[3].toJSON();

            expect(request).to.nested.include({
                'certificate.id': certificateId
            });
        });

        after(function (done) {
            server.destroy(done);
        });
    });

    describe('invalid', function () {
        before(function (done) {
            var port = 9090,
                certDataPath = path.join(__dirname, '..', '..', 'integration-legacy', 'data'),
                clientKeyPath = path.join('/tmp/non-existent/', 'client1-key.pem'),
                clientCertPath = path.join('/tmp/non-existent/', 'client1-crt.pem'),

                serverKeyPath = path.join(certDataPath, 'server-key.pem'),
                serverCertPath = path.join(certDataPath, 'server-crt.pem'),
                serverCaPath = path.join(certDataPath, 'ca-crt.pem'),

                certificateList = new CertificateList({}, [{
                    id: certificateId,
                    matches: ['https://localhost:' + port + '/*'],
                    key: {src: clientKeyPath},
                    cert: {src: clientCertPath}
                }]);

            server = https.createServer({
                key: fs.readFileSync(serverKeyPath),
                cert: fs.readFileSync(serverCertPath),
                ca: fs.readFileSync(serverCaPath)
            });

            server.on('request', function (req, res) {
                if (req.client.authorized) {
                    res.writeHead(200, {'Content-Type': 'text/plain'});
                    res.end('authorized\n');
                }
                else {
                    res.writeHead(401, {'Content-Type': 'text/plain'});
                    res.end('unauthorized\n');
                }
            });

            server.listen(port, 'localhost');

            enableServerDestroy(server);

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
            server.destroy(done);
        });
    });
});
