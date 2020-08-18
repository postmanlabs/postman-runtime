var fs = require('fs'),
    path = require('path'),
    sinon = require('sinon'),
    expect = require('chai').expect,
    CertificateList = require('postman-collection').CertificateList;

(typeof window === 'undefined' ? describe : describe.skip)('protocolProfileBehavior', function () {
    var testrun;

    describe('with followRedirects: false', function () {
        before(function (done) {
            this.run({
                requester: {
                    followRedirects: true
                },
                collection: {
                    item: [{
                        request: {
                            url: global.servers.followRedirects + '/1/302',
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
            expect(response.headers.get('location')).to.include('/?');
            expect(JSON.parse(response.headers.get('hits'))).to.have.lengthOf(1); // no redirects
        });
    });

    describe('with followRedirects: true', function () {
        before(function (done) {
            this.run({
                requester: {
                    followRedirects: false
                },
                collection: {
                    item: [{
                        request: {
                            url: global.servers.followRedirects + '/1/302',
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
            var response = testrun.response.getCall(0).args[2],
                hits;

            expect(response).to.have.property('code', 200);
            expect(response).to.have.property('stream');

            hits = response.json();

            expect(hits).to.have.lengthOf(2);
            expect(hits[1]).to.have.property('url').that.include('/?');
        });
    });

    describe('with followOriginalHttpMethod: false', function () {
        before(function (done) {
            this.run({
                requester: {
                    followOriginalHttpMethod: true
                },
                collection: {
                    item: [{
                        request: {
                            url: global.servers.followRedirects + '/1/302',
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
            var response = testrun.response.getCall(0).args[2],
                hits;

            expect(response).to.have.property('code', 200);
            expect(response).to.have.property('stream');

            hits = response.json();

            expect(hits).to.have.lengthOf(2);
            expect(hits[1]).to.have.property('url').that.include('/?');
            expect(hits[1]).to.have.property('method', 'GET');
        });
    });

    describe('with followOriginalHttpMethod: true', function () {
        before(function (done) {
            this.run({
                requester: {
                    followOriginalHttpMethod: false
                },
                collection: {
                    item: [{
                        request: {
                            url: global.servers.followRedirects + '/1/302',
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
            var response = testrun.response.getCall(0).args[2],
                hits;

            expect(response).to.have.property('code', 200);
            expect(response).to.have.property('stream');

            hits = response.json();

            expect(hits).to.have.lengthOf(2);
            expect(hits[1]).to.have.property('url').that.include('/?');
            expect(hits[1]).to.have.property('method', 'POST');
        });
    });

    // @todo un-skip https://github.com/postmanlabs/httpbin/issues/617
    describe.skip('with followAuthorizationHeader: false', function () {
        var URL = 'https://httpbin.org/redirect-to?url=https://postman-echo.com/get';

        before(function (done) {
            this.run({
                collection: {
                    item: [{
                        request: {
                            url: URL,
                            method: 'POST',
                            header: [{key: 'authorization', value: 'supersecret'}]
                        }
                    }],
                    protocolProfileBehavior: {
                        followAuthorizationHeader: false
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

        it('should not retain `authorization` header when redirects to a different hostname', function () {
            var response = testrun.response.getCall(0).args[2],
                request = testrun.response.getCall(0).args[3];

            expect(request.headers.toJSON()).to.deep.include({key: 'authorization', value: 'supersecret'});

            expect(response).to.have.property('code', 200);
            expect(response.json().headers).to.not.have.property('authorization');
        });
    });

    // @todo un-skip https://github.com/postmanlabs/httpbin/issues/617
    describe.skip('with followAuthorizationHeader: true', function () {
        var URL = 'https://httpbin.org/redirect-to?url=https://postman-echo.com/get';

        before(function (done) {
            this.run({
                collection: {
                    item: [{
                        request: {
                            url: URL,
                            method: 'POST',
                            header: [{key: 'authorization', value: 'supersecret'}]
                        }
                    }],
                    protocolProfileBehavior: {
                        followAuthorizationHeader: true
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

        it('should retain `authorization` header when redirects to a different hostname', function () {
            var response = testrun.response.getCall(0).args[2],
                request = testrun.response.getCall(0).args[3];

            expect(request.headers.toJSON()).to.deep.include({key: 'authorization', value: 'supersecret'});

            expect(response).to.have.property('code', 200);
            expect(response.json().headers).to.have.property('authorization');
        });
    });

    describe('with disableUrlEncoding: false', function () {
        before(function (done) {
            this.run({
                collection: {
                    item: [{
                        request: {
                            url: 'https://postman-echo.com/get?q=("*")'
                        }
                    }],
                    protocolProfileBehavior: {
                        disableUrlEncoding: false
                    }
                },
                requester: {
                    // disableUrlEncoding option only works with WHATWG parser
                    useWhatWGUrlParser: true
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

        it('should percent encode URL segments', function () {
            var response = testrun.response.getCall(0).args[2].json();

            expect(response).to.have.property('url', 'https://postman-echo.com/get?q=(%22*%22)');
        });
    });

    describe('redirect with disableUrlEncoding: false', function () {
        before(function (done) {
            this.run({
                collection: {
                    item: [{
                        request: {
                            url: global.servers.disableUrlEncoding + '/redirect'
                        }
                    }],
                    protocolProfileBehavior: {
                        disableUrlEncoding: false
                    }
                },
                requester: {
                    // disableUrlEncoding option only works with WHATWG parser
                    useWhatWGUrlParser: true
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

        it('should percent encode redirect URL segments', function () {
            var response = testrun.response.getCall(0).args[2].json();

            expect(response).to.have.property('url', '/query?q={(%22*%22)}');
        });
    });

    describe('relative redirect with disableUrlEncoding: false', function () {
        before(function (done) {
            this.run({
                collection: {
                    item: [{
                        request: {
                            url: global.servers.disableUrlEncoding + '/relative_redirect'
                        }
                    }],
                    protocolProfileBehavior: {
                        disableUrlEncoding: false
                    }
                },
                requester: {
                    // disableUrlEncoding option only works with WHATWG parser
                    useWhatWGUrlParser: true
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

        it('should percent encode redirect URL segments', function () {
            var response = testrun.response.getCall(0).args[2].json();

            expect(response).to.have.property('url', '/query?q={(%22*%22)}');
        });
    });

    describe('with disableUrlEncoding: true', function () {
        before(function (done) {
            this.run({
                collection: {
                    item: [{
                        request: {
                            url: 'https://postman-echo.com/get?q=("*")'
                        }
                    }],
                    protocolProfileBehavior: {
                        disableUrlEncoding: true
                    }
                },
                requester: {
                    // disableUrlEncoding option only works with WHATWG parser
                    useWhatWGUrlParser: true
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

        it('should not percent encode URL segments', function () {
            var response = testrun.response.getCall(0).args[2].json();

            expect(response).to.have.property('url', 'https://postman-echo.com/get?q=("*")');
        });
    });

    describe('redirect with disableUrlEncoding: true', function () {
        before(function (done) {
            this.run({
                collection: {
                    item: [{
                        request: {
                            url: global.servers.disableUrlEncoding + '/redirect'
                        }
                    }],
                    protocolProfileBehavior: {
                        disableUrlEncoding: true
                    }
                },
                requester: {
                    // disableUrlEncoding option only works with WHATWG parser
                    useWhatWGUrlParser: true
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

        it('should not percent encode redirect URL segments', function () {
            var response = testrun.response.getCall(0).args[2].json();

            expect(response).to.have.property('url', '/query?q={("*")}');
        });
    });

    describe('relative redirect with disableUrlEncoding: true', function () {
        before(function (done) {
            this.run({
                collection: {
                    item: [{
                        request: {
                            url: global.servers.disableUrlEncoding + '/relative_redirect'
                        }
                    }],
                    protocolProfileBehavior: {
                        disableUrlEncoding: true
                    }
                },
                requester: {
                    // disableUrlEncoding option only works with WHATWG parser
                    useWhatWGUrlParser: true
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

        it('should not percent encode redirect URL segments', function () {
            var response = testrun.response.getCall(0).args[2].json();

            expect(response).to.have.property('url', '/query?q={("*")}');
        });
    });

    describe('with removeRefererHeaderOnRedirect: false', function () {
        var URL;

        before(function (done) {
            URL = global.servers.followRedirects + '/1/302';
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
            var response = testrun.response.getCall(0).args[2],
                hits;

            expect(response).to.have.property('code', 200);
            expect(response).to.have.property('stream');

            hits = response.json();

            expect(hits).to.have.lengthOf(2);
            expect(hits[1]).to.have.property('url').that.include('/?');
            expect(hits[1]).to.have.property('method', 'GET');
            expect(hits[1]).to.have.property('headers');
            expect(hits[1].headers).to.have.property('referer', URL);
        });
    });

    describe('with removeRefererHeaderOnRedirect: true', function () {
        var URL;

        before(function (done) {
            URL = global.servers.followRedirects + '/1/302';
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
            var response = testrun.response.getCall(0).args[2],
                hits;

            expect(response).to.have.property('code', 200);
            expect(response).to.have.property('stream');

            hits = response.json();

            expect(hits).to.have.lengthOf(2);
            expect(hits[1]).to.have.property('url').that.include('/?');
            expect(hits[1]).to.have.property('method', 'GET');
            expect(hits[1]).to.have.property('headers');
            expect(hits[1].headers).to.not.have.property('referer');
        });
    });

    describe('with disableCookies: false', function () {
        before(function (done) {
            this.run({
                collection: {
                    item: [{
                        request: 'https://postman-echo.com/cookies/set?foo=bar'
                    }],
                    protocolProfileBehavior: {
                        disableCookies: false
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
            expect(response.json()).to.eql({
                cookies: {
                    foo: 'bar'
                }
            });
        });
    });

    describe('with disableCookies: true', function () {
        before(function (done) {
            this.run({
                collection: {
                    item: [{
                        request: 'https://postman-echo.com/cookies/set?foo=bar'
                    }],
                    protocolProfileBehavior: {
                        disableCookies: true
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
            expect(response.json()).to.eql({
                cookies: {}
            });
        });
    });

    describe('with maxRedirects', function () {
        var URL;

        before(function (done) {
            URL = global.servers.followRedirects + '/11/302';
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
            var response = testrun.response.getCall(0).args[2],
                hits;

            expect(response).to.have.property('code', 200);
            expect(response).to.have.property('stream');

            hits = response.json();

            expect(hits).to.have.lengthOf(12);
            expect(hits[11]).to.have.property('url').that.include('/?');
            expect(hits[11]).to.have.property('method', 'GET');
        });
    });

    describe('with strictSSL', function () {
        var certificateId = 'test-certificate';

        before(function (done) {
            var URL = global.servers.httpsRequestCert,
                certDataPath = path.join(__dirname, '..', '..', 'fixtures', 'certificates'),
                clientKeyPath = path.join(certDataPath, 'client-key.pem'),
                clientCertPath = path.join(certDataPath, 'client-crt.pem'),

                certificateList = new CertificateList({}, [{
                    id: certificateId,
                    matches: [URL + '/*'],
                    key: {src: clientKeyPath},
                    cert: {src: clientCertPath}
                }]);

            this.run({
                collection: {
                    item: {
                        request: URL
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

            expect(response.text()).to.eql('authorized');
        });

        it('should have certificate attached to request', function () {
            var request = testrun.request.getCall(0).args[3].toJSON();

            expect(request).to.nested.include({'certificate.id': certificateId});
        });
    });
});
