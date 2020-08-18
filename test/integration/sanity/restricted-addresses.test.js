var expect = require('chai').expect;

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
                restrictedAddresses: {'169.254.169.254': true},
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
