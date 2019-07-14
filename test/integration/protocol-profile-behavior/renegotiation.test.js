var fs = require('fs'),
    path = require('path'),
    expect = require('chai').expect,
    server = require('../../fixtures/server'),
    CertificateList = require('postman-collection').CertificateList;

// @todo add protocol-profile-behavior to enable/disable renegotiation request
describe('TLS renegotiation', function () {
    var testrun,
        sslServer,
        certificateId = 'test-certificate',
        certDataPath = path.join(__dirname, '..', '..', 'fixtures', 'certificates'),
        CACertPath = path.join(certDataPath, 'ca.pem'),
        clientKeyPath = path.join(certDataPath, 'client-key.pem'),
        clientCertPath = path.join(certDataPath, 'client-crt.pem');

    before(function (done) {
        sslServer = server.createSSLServer({
            // renegotiation not supported in TLSv1.3
            secureProtocol: 'TLSv1_2_method',
            requestCert: true,
            rejectUnauthorized: false
        });
        sslServer.on('request', function (req, res) {
            req.connection.renegotiate({
                requestCert: true,
                rejectUnauthorized: true
            }, function (err) {
                if (err) {
                    res.writeHead(500);
                    res.write('Renegotiation Failed');
                    res.end(err.message);

                    return;
                }

                res.writeHead(200);
                res.end('Renegotiated');
            });
        });
        sslServer.listen(0, done);
    });

    after(function (done) {
        sslServer.destroy(done);
    });

    describe('with client certificate', function () {
        before(function (done) {
            var certificateList = new CertificateList({}, [{
                id: certificateId,
                matches: ['https://localhost:' + sslServer.port + '/*'],
                key: {src: clientKeyPath},
                cert: {src: clientCertPath}
            }]);

            this.run({
                fileResolver: fs,
                certificates: certificateList,
                requester: {
                    extendedRootCA: CACertPath,
                    verbose: true
                },
                collection: {
                    item: [{
                        request: {
                            url: sslServer.url,
                            header: [{
                                key: 'Connection',
                                value: 'close'
                            }]
                        }
                    }]
                }
            }, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        it('should complete the run', function () {
            expect(testrun).to.be.ok;
            expect(testrun).to.nested.include({
                'done.calledOnce': true,
                'start.calledOnce': true,
                'request.calledOnce': true
            });
        });

        it('should renegotiate successfully', function () {
            expect(testrun.response.getCall(0).calledWith(null)).to.be.true;

            var response = testrun.response.getCall(0).args[2],
                history = testrun.response.getCall(0).args[6],
                executionData,
                sessions;

            // @todo add renegotiation details in to history object
            expect(history).to.have.property('execution').that.include.property('sessions');
            sessions = history.execution.sessions;
            executionData = history.execution.data[0];

            expect(response.reason()).to.eql('OK');
            expect(response.text()).to.eql('Renegotiated');
            expect(sessions[executionData.session.id].tls).to.have.property('peerCertificate', 'TLSv1.2');
        });
    });
});


