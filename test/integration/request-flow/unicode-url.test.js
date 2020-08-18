var dns = require('dns'),
    expect = require('chai').expect;

(typeof window === 'undefined' ? describe : describe.skip)('UTF-8 hostname', function () {
    var testrun;

    before(function (done) {
        var self = this;

        // Not hard-coding since this can change
        dns.lookup('postman-echo.com', function (err, echoIp) {
            if (err) {
                return done(err);
            }

            return self.run({
                collection: {
                    item: {
                        request: 'http://邮差.com/get?foo=bar',
                        event: [{
                            listen: 'prerequest',
                            script: {exec: 'console.log(pm.request.url.toString())'}
                        }, {
                            listen: 'test',
                            script: {exec: 'console.log(pm.request.url.toString())'}
                        }]
                    }
                },
                network: {
                    hostLookup: {
                        type: 'hostIpMap',
                        hostIpMap: {
                            // 邮差.com is encoded to xn--nstq34i.com while sending request
                            'xn--nstq34i.com': echoIp
                        }
                    }
                }
            }, function (err, results) {
                testrun = results;
                done(err);
            });
        });
    });

    it('should have the Host header with correct value in sent request', function () {
        var request = testrun.request.getCall(0).args[3];

        expect(request.headers.get('Host')).to.equal('xn--nstq34i.com');
    });

    it('should have completed the run', function () {
        expect(testrun).to.be.ok;
        expect(testrun.done.getCall(0).args[0]).to.be.null;
        expect(testrun).to.nested.include({
            'done.calledOnce': true,
            'start.calledOnce': true
        });
    });

    it('should have used the provided hostIpMap for resolving UTF-8 hostname', function () {
        expect(testrun.response.getCall(0).args[0]).to.be.null;

        var request = testrun.response.firstCall.args[3],
            response = testrun.response.firstCall.args[2];

        expect(request.url.toString()).to.equal('http://xn--nstq34i.com/get?foo=bar');

        // @note pm.request.url is different in prerequest and test scripts
        // pm.request in prerequest is what users authored
        // pm.request in test is what runtime sent
        expect(testrun.console.firstCall.args[2]).to.equal('http://邮差.com/get?foo=bar');
        expect(testrun.console.secondCall.args[2]).to.equal('http://xn--nstq34i.com/get?foo=bar');

        expect(response).to.have.property('code', 200);
        expect(response.json()).to.deep.include({
            args: {foo: 'bar'}
        });
    });
});
