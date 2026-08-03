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
            // @note the old httpbin-based redirect item was removed from this shared run;
            // its offline replacement now lives in its own describe at the end of the
            // file so a redirect-cleanup interaction cannot hang later specs
            this.run({
                collection: {
                    item: [{
                        request: '169.254.169.254'
                    }, {
                        request: 'http://vulnerable.postman.wtf'
                    }, {
                        request: 'http://fake.vulnerable.postman.wtf'
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

        it('should not send request for punycode hosts that resolve to restricted IP addresses', function () {
            expect(testrun).to.be.ok;
            var error = testrun.response.getCall(3).args[0],
                response = testrun.response.getCall(3).args[2];

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

    describe('multiple A records where one is restricted', function () {
        var testrun,
            sinon = require('sinon'),
            dns = require('dns'),
            sandbox,
            MULTI_A_HOST = 'multi-a-record.restricted.test';

        before(function (done) {
            // stub dns.lookup so MULTI_A_HOST resolves to two addresses, one of which is
            // the restricted 127.0.0.1 — exercises the options.all (Happy-Eyeballs) path
            // in core.lookup, where _.some() must reject if ANY address is restricted
            sandbox = sinon.createSandbox();
            sandbox.stub(dns, 'lookup').callsFake(function (hostname, options, callback) {
                // node may pass (hostname, callback) when options is omitted
                if (typeof options === 'function') {
                    callback = options;
                    options = {};
                }

                if (hostname === MULTI_A_HOST) {
                    if (options && options.all) {
                        return setImmediate(callback, null, [
                            { address: '203.0.113.10', family: 4 }, // not restricted
                            { address: '127.0.0.1', family: 4 } // restricted — must be rejected
                        ]);
                    }

                    return setImmediate(callback, null, '127.0.0.1', 4);
                }

                return dns.lookup.wrappedMethod.call(dns, hostname, options, callback);
            });

            this.run({
                collection: {
                    item: [{
                        request: 'http://' + MULTI_A_HOST + '/'
                    }]
                },
                network: {
                    restrictedAddresses: { '127.0.0.1': true }
                },
                timeout: { request: 5000 }
            }, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        after(function () {
            sandbox && sandbox.restore();
        });

        it('should have completed the run', function () {
            expect(testrun).to.be.ok;
            expect(testrun.done.getCall(0).args[0]).to.be.null;
            expect(testrun).to.nested.include({
                'done.calledOnce': true,
                'start.calledOnce': true
            });
        });

        it('should block a host that resolves to multiple A records when any one is restricted', function () {
            var error = testrun.response.getCall(0).args[0],
                response = testrun.response.getCall(0).args[2];

            expect(error).to.have.property('message');
            expect(error.message).to.include('NETERR:');
            expect(error.message).to.include(MULTI_A_HOST);
            expect(response).to.be.undefined;
        });
    });

    describe('AAAA record resolving to restricted IPv6', function () {
        var testrun;

        before(function (done) {
            this.run({
                collection: {
                    item: [{
                        // host resolves (via hostIpMap) to the IPv6 loopback ::1
                        request: 'http://aaaa.restricted.test/'
                    }]
                },
                network: {
                    restrictedAddresses: { '::1': true },
                    hostLookup: {
                        type: 'hostIpMap',
                        hostIpMap: {
                            'aaaa.restricted.test': '::1'
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

        it('should block a host whose AAAA record resolves to a restricted IPv6 address', function () {
            var error = testrun.response.getCall(0).args[0],
                response = testrun.response.getCall(0).args[2];

            expect(error).to.have.property('message');
            expect(error.message).to.include('NETERR:');
            expect(error.message).to.include('aaaa.restricted.test');
            expect(response).to.be.undefined;
        });
    });

    describe('wildcard DNS resolving to loopback', function () {
        var testrun;

        before(function (done) {
            this.run({
                collection: {
                    item: [{
                        // nip.io-style wildcard host that resolves to 127.0.0.1
                        request: 'http://127.0.0.1.nip.io/'
                    }]
                },
                network: {
                    restrictedAddresses: { '127.0.0.0/8': true },
                    hostLookup: {
                        type: 'hostIpMap',
                        hostIpMap: {
                            '127.0.0.1.nip.io': '127.0.0.1'
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

        it('should block a wildcard-DNS host that resolves into a restricted CIDR', function () {
            var error = testrun.response.getCall(0).args[0],
                response = testrun.response.getCall(0).args[2];

            expect(error).to.have.property('message');
            expect(error.message).to.include('NETERR:');
            expect(error.message).to.include('127.0.0.1.nip.io');
            expect(response).to.be.undefined;
        });
    });

    describe('host resolving to 0.0.0.0', function () {
        var testrun;

        before(function (done) {
            this.run({
                collection: {
                    item: [{
                        request: 'http://zeros.restricted.test/'
                    }]
                },
                network: {
                    restrictedAddresses: { '0.0.0.0/8': true },
                    hostLookup: {
                        type: 'hostIpMap',
                        hostIpMap: {
                            'zeros.restricted.test': '0.0.0.0'
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

        it('should block a host that resolves to 0.0.0.0 within 0.0.0.0/8', function () {
            var error = testrun.response.getCall(0).args[0],
                response = testrun.response.getCall(0).args[2];

            expect(error).to.have.property('message');
            expect(error.message).to.include('NETERR:');
            expect(error.message).to.include('zeros.restricted.test');
            expect(response).to.be.undefined;
        });
    });

    describe('multi-hop redirect chain landing on a restricted IP', function () {
        var testrun;

        before(function (done) {
            var redirectServer = global.servers.http,
                // hop 2: /redirect-to that points at the restricted raw IP
                hop2 = redirectServer + '/redirect-to?url=http://127.0.0.2/';

            this.run({
                collection: {
                    item: [{
                        // hop 1 -> hop 2 -> http://127.0.0.2/ (restricted); blocked at hop 2's target
                        request: redirectServer + '/redirect-to?url=' + hop2
                    }]
                },
                network: {
                    restrictedAddresses: { '127.0.0.2': true }
                },
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

        it('should block a redirect chain whose second hop lands on a restricted IP', function () {
            var error = testrun.response.getCall(0).args[0],
                response = testrun.response.getCall(0).args[2];

            expect(error).to.have.property('message');
            expect(error.message).to.include('NETERR:');
            expect(error.message).to.include('127.0.0.2');
            expect(response).to.be.undefined;
        });
    });

    describe('hosts that resolve into a restricted range', function () {
        var testrun;

        before(function (done) {
            this.run({
                collection: {
                    item: [{
                        // host resolves (via hostIpMap) to a link-local address in 169.254.0.0/16
                        request: 'http://internal.example.test/'
                    }, {
                        // direct CGNAT IP restricted by an exact entry
                        request: 'http://100.100.100.200/'
                    }]
                },
                network: {
                    restrictedAddresses: { '169.254.0.0/16': true, '100.100.100.200': true },
                    hostLookup: {
                        type: 'hostIpMap',
                        hostIpMap: {
                            'internal.example.test': '169.254.0.10'
                        }
                    }
                },
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

        it('should restrict a host that resolves into the 169.254.0.0/16 range', function () {
            var error = testrun.response.getCall(0).args[0],
                response = testrun.response.getCall(0).args[2];

            expect(error).to.have.property('message');
            expect(error.message).to.include('NETERR:');
            expect(error.message).to.include('internal.example.test');
            expect(response).to.be.undefined;
        });

        it('should restrict a direct request to the CGNAT IP 100.100.100.200', function () {
            var error = testrun.response.getCall(1).args[0],
                response = testrun.response.getCall(1).args[2];

            expect(error).to.have.property('message');
            expect(error.message).to.include('NETERR:');
            expect(error.message).to.include('100.100.100.200');
            expect(response).to.be.undefined;
        });
    });

    // @note this is intentionally the LAST describe in this file. It replaces the old
    // httpbin-dependent "redirect resolves to restricted IP" case using the local
    // redirect server + hostIpMap so it runs offline. A restricted redirect whose target
    // is resolved (and rejected) at the DNS-lookup stage leaves an IPv6 connection in a
    // state that can hang a *following* IPv6-redirect spec in this process, so this run
    // is isolated at the end where nothing runs after it.
    describe('redirect resolving to a restricted IP via DNS', function () {
        var testrun;

        before(function (done) {
            var redirectServer = global.servers.http;

            this.run({
                collection: {
                    item: [{
                        // 301s to a hostname that hostIpMap resolves to the restricted
                        // 169.254.169.254 — the follow-up request is blocked at DNS lookup
                        request: redirectServer + '/redirect-to?url=http://redirect.vulnerable.postman.wtf/'
                    }]
                },
                network: {
                    restrictedAddresses: { '169.254.169.254': true },
                    hostLookup: {
                        type: 'hostIpMap',
                        hostIpMap: {
                            'redirect.vulnerable.postman.wtf': '169.254.169.254'
                        }
                    }
                },
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

        it('should not send request for redirects that resolve to restricted IP addresses', function () {
            expect(testrun).to.be.ok;
            var error = testrun.response.getCall(0).args[0],
                response = testrun.response.getCall(0).args[2];

            // the redirect target resolves (via hostIpMap) to the restricted 169.254.169.254,
            // so the follow-up request is blocked with the DNS-resolution error shape
            // @note nodeVersionDiscrepancy
            expect(error).to.have.property('message');
            expect(error.message).to.be.oneOf([
                'NETERR: getaddrinfo ENOTFOUND redirect.vulnerable.postman.wtf',
                'NETERR: getaddrinfo ENOTFOUND redirect.vulnerable.postman.wtf redirect.vulnerable.postman.wtf:80'
            ]);

            expect(response).to.be.undefined;
        });
    });
});
