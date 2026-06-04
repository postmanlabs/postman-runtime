var expect = require('chai').expect;

(typeof window === 'undefined' ? describe : describe.skip)('restricted addresses - CIDR ranges', function () {
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
            expect(error.message).to.not.include('ECONNREFUSED');
        }
    });
});

(typeof window === 'undefined' ? describe : describe.skip)('restricted addresses', function () {
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

    it('should not send request for hosts that resolve to restricted IP addresses (normal DNS lookup)', function () {
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
