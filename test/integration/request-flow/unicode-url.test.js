var dns = require('dns'),
    expect = require('chai').expect;

describe('UTF-8 hostname', function () {
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
                        request: 'http://邮差.com/get?foo=bar'
                    }
                },
                network: {
                    hostLookup: {
                        type: 'hostIpMap',
                        hostIpMap: {
                            'xn--nstq34i.com': echoIp // 邮差.com is encoded to xn--nstq34i.com while sending request
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

        var response = testrun.response.firstCall.args[2];

        expect(response).to.have.property('code', 200);
        expect(response.json()).to.deep.include({
            args: {foo: 'bar'}
        });
    });
});
