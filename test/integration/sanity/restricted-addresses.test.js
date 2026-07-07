var expect = require('chai').expect;

(typeof window === 'undefined' ? describe : describe.skip)('restricted addresses', function () {
    describe('redirect to raw IP', function () {
        var testrun;

        before(function (done) {
            // global.servers.http has a /redirect-to?url=<target> endpoint that issues a 301
            var redirectServer = global.servers.http;

            this.run({
                collection: {
                    item: [{
                        // server 301s to a restricted raw IP — bindOn.redirect should block it
                        request: redirectServer + '/redirect-to?url=http://127.0.0.2/'
                    }, {
                        // server 301s to an unrestricted raw IP — should not be blocked
                        request: redirectServer + '/redirect-to?url=http://127.0.0.3/'
                    }]
                },
                network: {
                    restrictedAddresses: { '127.0.0.2': true }
                },
                // 127.0.0.3 has no server; cap wait time so the run completes
                timeout: { request: 5000 }
            }, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        it('should have completed the run', function () {
            expect(testrun).to.be.ok;
            expect(testrun.done.getCall(0).args[0]).to.be.null;
            expect(testrun).to.nested.include({
                'done.calledOnce': true,
                'start.calledOnce': true
            });
        });

        it('should block a redirect to a restricted raw IP address', function () {
            var error = testrun.response.getCall(0).args[0],
                response = testrun.response.getCall(0).args[2];

            expect(error).to.have.property('message');
            expect(error.message).to.include('NETERR:');
            expect(error.message).to.include('127.0.0.2');
            expect(response).to.be.undefined;
        });

        it('should not block a redirect to an unrestricted raw IP address', function () {
            var error = testrun.response.getCall(1).args[0];

            // a connection error is expected (no server at 127.0.0.3)
            // but it must NOT be a restrictedAddresses block
            if (error) {
                expect(error.message).to.not.include('NETERR:');
            }
        });
    });

    describe('*.localhost fast-path (B4)', function () {
        var testrun;

        before(function (done) {
            this.run({
                collection: {
                    item: [{
                        // subdomain of localhost — fast-path resolves it to 127.0.0.1 / ::1
                        // should be blocked when localhost/127.0.0.1 is restricted
                        request: 'http://api.localhost/'
                    }, {
                        // localhost itself — should be blocked
                        request: 'http://localhost/'
                    }]
                },
                network: {
                    restrictedAddresses: { localhost: true, '127.0.0.1': true, '::1': true }
                }
            }, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        it('should have completed the run', function () {
            expect(testrun).to.be.ok;
            expect(testrun.done.getCall(0).args[0]).to.be.null;
            expect(testrun).to.nested.include({
                'done.calledOnce': true,
                'start.calledOnce': true
            });
        });

        it('should block a request to a *.localhost subdomain', function () {
            var error = testrun.response.getCall(0).args[0],
                response = testrun.response.getCall(0).args[2];

            expect(error).to.have.property('message');
            expect(error.message).to.include('NETERR:');
            expect(response).to.be.undefined;
        });

        it('should block a request to localhost itself', function () {
            var error = testrun.response.getCall(1).args[0],
                response = testrun.response.getCall(1).args[2];

            expect(error).to.have.property('message');
            expect(error.message).to.include('NETERR:');
            expect(response).to.be.undefined;
        });
    });

    describe('CIDR ranges', function () {
        var testrun;

        before(function (done) {
            this.run({
                collection: {
                    item: [{
                        // direct request to an IP inside the blocked /8 range (not an exact entry)
                        request: 'http://127.0.0.2/'
                    }, {
                        // hostname that resolves (via hostIpMap) to an IP inside the /8 range
                        request: 'http://fake.cidr.postman.wtf/'
                    }, {
                        // IP outside the blocked range — should succeed (or fail with a network error, not a block)
                        request: 'http://128.0.0.1/'
                    }]
                },
                network: {
                    restrictedAddresses: { '127.0.0.0/8': true },
                    hostLookup: {
                        type: 'hostIpMap',
                        hostIpMap: {
                            'fake.cidr.postman.wtf': '127.0.0.2'
                        }
                    }
                },
                // 128.0.0.1 has no server; cap wait time so the run completes
                timeout: { request: 5000 }
            }, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        it('should have completed the run', function () {
            expect(testrun).to.be.ok;
            expect(testrun.done.getCall(0).args[0]).to.be.null;
            expect(testrun).to.nested.include({
                'done.calledOnce': true,
                'start.calledOnce': true
            });
        });

        it('should block a direct request to an IP within a CIDR range', function () {
            var error = testrun.response.getCall(0).args[0],
                response = testrun.response.getCall(0).args[2];

            expect(error).to.have.property('message');
            expect(error.message).to.include('NETERR:');
            expect(response).to.be.undefined;
        });

        it('should block a request whose hostname resolves to an IP within a CIDR range', function () {
            var error = testrun.response.getCall(1).args[0],
                response = testrun.response.getCall(1).args[2];

            expect(error).to.have.property('message');
            expect(error.message).to.include('NETERR:');
            expect(response).to.be.undefined;
        });

        it('should not block a request to an IP outside the CIDR range', function () {
            var error = testrun.response.getCall(2).args[0];

            // a network/connection error is expected (no server at 128.0.0.1),
            // but it must NOT be a NETERR block from restrictedAddresses
            if (error) {
                expect(error.message).to.not.include('NETERR:');
            }
        });
    });

    describe('exact IP and DNS resolution', function () {
        var testrun;

        before(function (done) {
            this.run({
                collection: {
                    item: [{
                        request: '169.254.169.254'
                    }, {
                        request: 'http://vulnerable.postman.wtf'
                    }, {
                        request: 'http://fake.vulnerable.postman.wtf'
                    }, {
                        request: 'http://httpbin.org/redirect-to?url=http%3A%2F%2Fvulnerable.postman.wtf'
                    }, {
                        request: 'http://🦇.com/get?foo=bar'
                    }]
                },
                network: {
                    restrictedAddresses: { '169.254.169.254': true },
                    hostLookup: {
                        type: 'hostIpMap',
                        hostIpMap: {
                            'fake.vulnerable.postman.wtf': '169.254.169.254',
                            'xn--6s9h.com': '169.254.169.254'
                        }
                    }
                }
            }, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        it('should have completed the run', function () {
            expect(testrun).to.be.ok;
            expect(testrun.done.getCall(0).args[0]).to.be.null;
            expect(testrun).to.nested.include({
                'done.calledOnce': true,
                'start.calledOnce': true
            });
        });

        it('should not send request for hosts in restricted IP addresses', function () {
            expect(testrun).to.be.ok;
            var error = testrun.response.getCall(0).args[0],
                response = testrun.response.getCall(0).args[2];

            // response will always be undefined because there is no server on this IP
            // the error checks are the more important ones here
            expect(error.message).to.equal('NETERR: getaddrinfo ENOTFOUND 169.254.169.254');
            expect(response).to.be.undefined;
        });

        it('should not send request for hosts that resolve to restricted IP addresses (normal DNS lookup)',
            function () {
                expect(testrun).to.be.ok;
                var error = testrun.response.getCall(1).args[0],
                    response = testrun.response.getCall(1).args[2];

                // response will always be undefined because there is no server on this IP
                // the error checks are the more important ones here
                // @note nodeVersionDiscrepancy
                expect(error).to.have.property('message');
                expect(error.message).to.be.oneOf([
                    'NETERR: getaddrinfo ENOTFOUND vulnerable.postman.wtf',
                    'NETERR: getaddrinfo ENOTFOUND vulnerable.postman.wtf vulnerable.postman.wtf:80'
                ]);

                expect(response).to.be.undefined;
            });

        it('should not send request for hosts that resolve to restricted IP addresses (hosts file DNS lookup)',
            function () {
                expect(testrun).to.be.ok;
                var error = testrun.response.getCall(2).args[0],
                    response = testrun.response.getCall(2).args[2];

                // response will always be undefined because there is no server on this IP
                // the error checks are the more important ones here
                // @note nodeVersionDiscrepancy
                expect(error).to.have.property('message');
                expect(error.message).to.be.oneOf([
                    'NETERR: getaddrinfo ENOTFOUND fake.vulnerable.postman.wtf',
                    'NETERR: getaddrinfo ENOTFOUND fake.vulnerable.postman.wtf fake.vulnerable.postman.wtf:80'
                ]);

                expect(response).to.be.undefined;
            });

        // @todo un-skip https://github.com/postmanlabs/httpbin/issues/617
        it.skip('should not send request for redirects that resolve to restricted IP addresses', function () {
            expect(testrun).to.be.ok;
            var error = testrun.response.getCall(3).args[0],
                response = testrun.response.getCall(3).args[2];

            // response will always be undefined because there is no server on this IP
            // the error checks are the more important ones here
            // @note nodeVersionDiscrepancy
            expect(error).to.have.property('message');
            expect(error.message).to.be.oneOf([
                'NETERR: getaddrinfo ENOTFOUND vulnerable.postman.wtf',
                'NETERR: getaddrinfo ENOTFOUND vulnerable.postman.wtf vulnerable.postman.wtf:80'
            ]);

            expect(response).to.be.undefined;
        });

        it('should not send request for punycode hosts that resolve to restricted IP addresses', function () {
            expect(testrun).to.be.ok;
            var error = testrun.response.getCall(4).args[0],
                response = testrun.response.getCall(4).args[2];

            // response will always be undefined because there is no server on this IP
            // the error checks are the more important ones here
            // @note nodeVersionDiscrepancy
            expect(error).to.have.property('message');
            expect(error.message).to.be.oneOf([
                'NETERR: getaddrinfo ENOTFOUND xn--6s9h.com',
                'NETERR: getaddrinfo ENOTFOUND xn--6s9h.com xn--6s9h.com:80'
            ]);

            expect(response).to.be.undefined;
        });
    });

    describe('bracketed IPv6 redirect (B2/B3a)', function () {
        var testrun;

        before(function (done) {
            var redirectServer = global.servers.http;

            this.run({
                collection: {
                    item: [{
                        // server 301s to http://[::1]/ — the bracketed form bypassed the old net.isIP guard
                        request: redirectServer + '/redirect-to?url=http%3A%2F%2F%5B%3A%3A1%5D%2F'
                    }]
                },
                network: {
                    restrictedAddresses: { '::1': true }
                }
            }, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        it('should have completed the run', function () {
            expect(testrun).to.be.ok;
            expect(testrun.done.getCall(0).args[0]).to.be.null;
            expect(testrun).to.nested.include({
                'done.calledOnce': true,
                'start.calledOnce': true
            });
        });

        it('should block a redirect to a bracketed IPv6 address that is restricted', function () {
            var error = testrun.response.getCall(0).args[0],
                response = testrun.response.getCall(0).args[2];

            expect(error).to.have.property('message');
            expect(error.message).to.include('NETERR:');
            expect(response).to.be.undefined;
        });
    });
});
