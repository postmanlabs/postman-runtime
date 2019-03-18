var expect = require('chai').expect;

describe('restricted addresses', function () {
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
                }]
            },
            network: {
                restrictedAddresses: {'169.254.169.254': true},
                hostLookup: {
                    type: 'hostIpMap',
                    hostIpMap: {
                        'fake.vulnerable.postman.wtf': '169.254.169.254'
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
        var response = testrun.response.getCall(0).args[2];

        // response will always be undefined because there is no server on this IP
        // the error checks are the more important ones here
        expect(testrun).to.have.property('request').that.nested.include({
            'firstCall.args[0].message': 'NETERR: getaddrinfo ENOTFOUND 169.254.169.254'
        });
        expect(response).to.be.undefined;
    });

    it('should not send request for hosts that resolve to restricted IP addresses (normal DNS lookup)', function () {
        expect(testrun).to.be.ok;
        var response = testrun.response.getCall(1).args[2];

        // response will always be undefined because there is no server on this IP
        // the error checks are the more important ones here
        expect(testrun).to.have.property('request').that.nested.include({
            'firstCall.args[0].message': 'NETERR: getaddrinfo ENOTFOUND 169.254.169.254'
        });
        expect(response).to.be.undefined;
    });

    it('should not send request for hosts that resolve to restricted IP addresses (hosts file DNS lookup)',
        function () {
            expect(testrun).to.be.ok;
            var response = testrun.response.getCall(2).args[2];

            // response will always be undefined because there is no server on this IP
            // the error checks are the more important ones here
            expect(testrun).to.have.property('request').that.nested.include({
                'firstCall.args[0].message': 'NETERR: getaddrinfo ENOTFOUND 169.254.169.254'
            });
            expect(response).to.be.undefined;
        });

    it('should not send request for redirects that resolve to restricted IP addresses', function () {
        expect(testrun).to.be.ok;
        var response = testrun.response.getCall(3).args[2];

        // response will always be undefined because there is no server on this IP
        // the error checks are the more important ones here
        expect(testrun).to.have.property('request').that.nested.include({
            'firstCall.args[0].message': 'NETERR: getaddrinfo ENOTFOUND 169.254.169.254'
        });
        expect(response).to.be.undefined;
    });
});
