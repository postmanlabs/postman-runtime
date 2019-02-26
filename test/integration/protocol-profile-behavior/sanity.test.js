var fs = require('fs'),
    path = require('path'),
    sinon = require('sinon'),
    expect = require('chai').expect,
    server = require('../../fixtures/server'),
    CertificateList = require('postman-collection').CertificateList;

describe('protocolProfileBehavior', function () {
    var redirectServer,
        testrun,
        hits = [],
        PORT = 5050,
        HOST = 'http://localhost:' + PORT;

    before(function (done) {
        redirectServer = server.createRedirectServer();

        redirectServer.on('hit', function (req) {
            // keep track of all the requests made during redirects.
            hits.push({
                url: req.url,
                method: req.method,
                headers: req.headers
            });
        });

        // This will be called on final redirect
        redirectServer.on('/', function (req, res) {
            res.writeHead(200, {'content-type': 'text/plain'});
            res.end('okay');
        });

        redirectServer.listen(PORT, done);
    });

    after(function (done) {
        redirectServer.destroy(done);
    });

    describe('with followRedirects: false', function () {
        var URL = HOST + '/1/302';

        before(function (done) {
            hits = [];
            this.run({
                requester: {
                    followRedirects: true
                },
                collection: {
                    item: [{
                        request: {
                            url: URL,
                            method: 'GET',
                            header: [{
                                key: 'Connection',
                                value: 'close'
                            }]
                        }
                    }],
                    // will override requester options
                    protocolProfileBehavior: {
                        followRedirects: false
                    }
                }
            }, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        it('should complete the run', function () {
            expect(testrun).to.be.ok;
            sinon.assert.calledOnce(testrun.start);
            sinon.assert.calledOnce(testrun.done);
            sinon.assert.calledWith(testrun.done.getCall(0), null);

            sinon.assert.calledOnce(testrun.request);
            sinon.assert.calledWith(testrun.request.getCall(0), null);

            sinon.assert.calledOnce(testrun.response);
            sinon.assert.calledWith(testrun.response.getCall(0), null);
        });

        it('should not follow redirects', function () {
            var response = testrun.response.getCall(0).args[2];

            expect(response).to.have.property('code', 302);
            expect(response).to.have.property('headers');
            expect(response.headers.toJSON()).to.deep.include({key: 'location', value: '/'});

            expect(hits).to.have.lengthOf(1); // no redirects
        });
    });

    describe('with followRedirects: true', function () {
        var URL = HOST + '/1/302';

        before(function (done) {
            hits = [];
            this.run({
                requester: {
                    followRedirects: false
                },
                collection: {
                    item: [{
                        request: {
                            url: URL,
                            method: 'GET',
                            header: [{
                                key: 'Connection',
                                value: 'close'
                            }]
                        }
                    }],
                    // will override requester options
                    protocolProfileBehavior: {
                        followRedirects: true
                    }
                }
            }, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        it('should complete the run', function () {
            expect(testrun).to.be.ok;
            sinon.assert.calledOnce(testrun.start);
            sinon.assert.calledOnce(testrun.done);
            sinon.assert.calledWith(testrun.done.getCall(0), null);

            sinon.assert.calledOnce(testrun.request);
            sinon.assert.calledWith(testrun.request.getCall(0), null);

            sinon.assert.calledOnce(testrun.response);
            sinon.assert.calledWith(testrun.response.getCall(0), null);
        });

        it('should follow redirects', function () {
            var response = testrun.response.getCall(0).args[2];

            expect(response).to.have.property('code', 200);
            expect(response).to.have.property('stream');
            expect(response.stream.toString()).to.equal('okay');

            expect(hits).to.have.lengthOf(2);
            expect(hits[1]).to.have.property('url', '/');
        });
    });

    describe('with followOriginalHttpMethod: false', function () {
        var URL = HOST + '/1/302';

        before(function (done) {
            hits = [];
            this.run({
                requester: {
                    followOriginalHttpMethod: true
                },
                collection: {
                    item: [{
                        request: {
                            url: URL,
                            method: 'POST',
                            header: [{key: 'Connection', value: 'close'}]
                        }
                    }],
                    // will override requester options
                    protocolProfileBehavior: {
                        followOriginalHttpMethod: false
                    }
                }
            }, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        it('should complete the run', function () {
            expect(testrun).to.be.ok;
            sinon.assert.calledOnce(testrun.start);
            sinon.assert.calledOnce(testrun.done);
            sinon.assert.calledWith(testrun.done.getCall(0), null);

            sinon.assert.calledOnce(testrun.request);
            sinon.assert.calledWith(testrun.request.getCall(0), null);

            sinon.assert.calledOnce(testrun.response);
            sinon.assert.calledWith(testrun.response.getCall(0), null);
        });

        it('should not follow post redirects by default', function () {
            var response = testrun.response.getCall(0).args[2];

            expect(response).to.have.property('code', 200);
            expect(response).to.have.property('stream');
            expect(response.stream.toString()).to.equal('okay');

            expect(hits).to.have.lengthOf(2);
            expect(hits[1]).to.have.property('url', '/');
            expect(hits[1]).to.have.property('method', 'GET');
        });
    });

    describe('with followOriginalHttpMethod: true', function () {
        var URL = HOST + '/1/302';

        before(function (done) {
            hits = [];
            this.run({
                requester: {
                    followOriginalHttpMethod: false
                },
                collection: {
                    item: [{
                        request: {
                            url: URL,
                            method: 'POST',
                            header: [{key: 'Connection', value: 'close'}]
                        }
                    }],
                    // will override requester options
                    protocolProfileBehavior: {
                        followOriginalHttpMethod: true
                    }
                }
            }, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        it('should complete the run', function () {
            expect(testrun).to.be.ok;
            sinon.assert.calledOnce(testrun.start);
            sinon.assert.calledOnce(testrun.done);
            sinon.assert.calledWith(testrun.done.getCall(0), null);

            sinon.assert.calledOnce(testrun.request);
            sinon.assert.calledWith(testrun.request.getCall(0), null);

            sinon.assert.calledOnce(testrun.response);
            sinon.assert.calledWith(testrun.response.getCall(0), null);
        });

        it('should follow post redirects', function () {
            var response = testrun.response.getCall(0).args[2];

            expect(response).to.have.property('code', 200);
            expect(response).to.have.property('stream');
            expect(response.stream.toString()).to.equal('okay');

            expect(hits).to.have.lengthOf(2);
            expect(hits[1]).to.have.property('url', '/');
            expect(hits[1]).to.have.property('method', 'POST');
        });
    });

    describe('with removeRefererHeaderOnRedirect: false', function () {
        var URL = HOST + '/1/302';

        before(function (done) {
            hits = [];
            this.run({
                requester: {
                    removeRefererHeaderOnRedirect: true
                },
                collection: {
                    item: [{
                        request: {
                            url: URL,
                            method: 'POST',
                            header: [{key: 'Connection', value: 'close'}]
                        }
                    }],
                    // will override requester options
                    protocolProfileBehavior: {
                        removeRefererHeaderOnRedirect: false
                    }
                }
            }, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        it('should complete the run', function () {
            expect(testrun).to.be.ok;
            sinon.assert.calledOnce(testrun.start);
            sinon.assert.calledOnce(testrun.done);
            sinon.assert.calledWith(testrun.done.getCall(0), null);

            sinon.assert.calledOnce(testrun.request);
            sinon.assert.calledWith(testrun.request.getCall(0), null);

            sinon.assert.calledOnce(testrun.response);
            sinon.assert.calledWith(testrun.response.getCall(0), null);
        });

        it('should have referer header on redirects', function () {
            var response = testrun.response.getCall(0).args[2];

            expect(response).to.have.property('code', 200);
            expect(response).to.have.property('stream');
            expect(response.stream.toString()).to.equal('okay');

            expect(hits).to.have.lengthOf(2);
            expect(hits[1]).to.have.property('url', '/');
            expect(hits[1]).to.have.property('method', 'GET');
            expect(hits[1]).to.have.property('headers');
            expect(hits[1].headers).to.have.property('referer', URL);
        });
    });

    describe('with removeRefererHeaderOnRedirect: true', function () {
        var URL = HOST + '/1/302';

        before(function (done) {
            hits = [];
            this.run({
                requester: {
                    removeRefererHeaderOnRedirect: false
                },
                collection: {
                    item: [{
                        request: {
                            url: URL,
                            method: 'POST',
                            header: [{key: 'Connection', value: 'close'}]
                        }
                    }],
                    // will override requester options
                    protocolProfileBehavior: {
                        removeRefererHeaderOnRedirect: true
                    }
                }
            }, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        it('should complete the run', function () {
            expect(testrun).to.be.ok;
            sinon.assert.calledOnce(testrun.start);
            sinon.assert.calledOnce(testrun.done);
            sinon.assert.calledWith(testrun.done.getCall(0), null);

            sinon.assert.calledOnce(testrun.request);
            sinon.assert.calledWith(testrun.request.getCall(0), null);

            sinon.assert.calledOnce(testrun.response);
            sinon.assert.calledWith(testrun.response.getCall(0), null);
        });

        it('should not have referer header when removeRefererHeaderOnRedirect is true', function () {
            var response = testrun.response.getCall(0).args[2];

            expect(response).to.have.property('code', 200);
            expect(response).to.have.property('stream');
            expect(response.stream.toString()).to.equal('okay');

            expect(hits).to.have.lengthOf(2);
            expect(hits[1]).to.have.property('url', '/');
            expect(hits[1]).to.have.property('method', 'GET');
            expect(hits[1]).to.have.property('headers');
            expect(hits[1].headers).to.not.have.property('referer');
        });
    });

    describe('with maxRedirects', function () {
        var URL = HOST + '/11/302';

        before(function (done) {
            hits = [];
            this.run({
                requester: {
                    maxRedirects: 2
                },
                collection: {
                    item: [{
                        request: {
                            url: URL,
                            method: 'POST',
                            header: [{key: 'Connection', value: 'close'}]
                        }
                    }],
                    // will override requester options
                    protocolProfileBehavior: {
                        maxRedirects: 11
                    }
                }
            }, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        it('should complete the run', function () {
            expect(testrun).to.be.ok;
            sinon.assert.calledOnce(testrun.start);
            sinon.assert.calledOnce(testrun.done);
            sinon.assert.calledWith(testrun.done.getCall(0), null);

            sinon.assert.calledOnce(testrun.request);
            sinon.assert.calledWith(testrun.request.getCall(0), null);

            sinon.assert.calledOnce(testrun.response);
            sinon.assert.calledWith(testrun.response.getCall(0), null);
        });

        it('should follow all the redirects with maxRedirects set', function () {
            var response = testrun.response.getCall(0).args[2];

            expect(response).to.have.property('code', 200);
            expect(response).to.have.property('stream');
            expect(response.stream.toString()).to.equal('okay');

            expect(hits).to.have.lengthOf(12);
            expect(hits[11]).to.have.property('url', '/');
            expect(hits[11]).to.have.property('method', 'GET');
        });
    });

    describe('with strictSSL', function () {
        var sslServer = server.createSSLServer({
                requestCert: true
            }),
            certificateId = 'test-certificate';

        sslServer.on('/', function (req, res) {
            if (req.client.authorized) {
                res.writeHead(200, {'Content-Type': 'text/plain'});
                res.end('authorized\n');
            }
            else {
                res.writeHead(401, {'Content-Type': 'text/plain'});
                res.end('unauthorized\n');
            }
        });

        before(function (done) {
            var port = 9090,
                certDataPath = path.join(__dirname, '..', '..', 'fixtures', 'certificates'),
                clientKeyPath = path.join(certDataPath, 'client-key.pem'),
                clientCertPath = path.join(certDataPath, 'client-crt.pem'),

                certificateList = new CertificateList({}, [{
                    id: certificateId,
                    matches: ['https://localhost:' + port + '/*'],
                    key: {src: clientKeyPath},
                    cert: {src: clientCertPath}
                }]);

            sslServer.listen(port, 'localhost');

            this.run({
                collection: {
                    item: {
                        request: 'https://localhost:' + port + '/'
                    },
                    // will override requester options
                    protocolProfileBehavior: {
                        strictSSL: false
                    }
                },
                requester: {
                    strictSSL: true
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

        it('should complete the run', function () {
            expect(testrun).to.be.ok;
            sinon.assert.calledOnce(testrun.start);
            sinon.assert.calledOnce(testrun.done);
            sinon.assert.calledWith(testrun.done.getCall(0), null);

            sinon.assert.calledOnce(testrun.request);
            sinon.assert.calledWith(testrun.request.getCall(0), null);

            sinon.assert.calledOnce(testrun.response);
            sinon.assert.calledWith(testrun.response.getCall(0), null);
        });

        it('should receive response from https server', function () {
            var response = testrun.request.getCall(0).args[2];

            expect(response.text()).to.eql('authorized\n');
        });

        it('should have certificate attached to request', function () {
            var request = testrun.request.getCall(0).args[3].toJSON();

            expect(request).to.nested.include({'certificate.id': certificateId});
        });
    });
});
