describe('certificates', function () {
    var fs = require('fs'),
        path = require('path'),
        CertificateList = require('postman-collection').CertificateList,
        https = require('https'),

        certificateId = 'test-certificate',

        server,
        testrun;

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

        this.run({
            collection: {
                item: {
                    request: 'https://localhost:' + port + '/'
                }
            },
            requester: {
                certificateList: certificateList,
                fileResolver: fs,
                strictSSL: false
            }
        }, function (err, results) {
            testrun = results;
            done(err);
        });
    });

    it('must have started and completed the test run', function () {
        expect(testrun).be.ok();
        expect(testrun.done.calledOnce).be.ok();
        expect(testrun.start.calledOnce).be.ok();
    });

    it('must receive response from https server', function () {
        var response = testrun.request.getCall(0).args[2];

        expect(response.text()).to.eql('authorized\n');
    });

    it('must have certificate attached to request', function () {
        var request = testrun.request.getCall(0).args[3].toJSON();

        expect(request.certificate.id).to.eql(certificateId);
    });

    after(function () {
        server.close();
    });
});
