var dns = require('dns'),
    expect = require('chai').expect;

(typeof window === 'undefined' ? describe : describe.skip)('DNS lookup', function () {
    var testrun;

    before(function (done) {
        var self = this,
            echoUrl = new URL(global.ECHO_SERVER);

        // Not hard-coding since this can change
        dns.lookup(echoUrl.hostname, function (err, echoIp) {
            if (err) {
                return done(err);
            }

            return self.run({
                collection: {
                    item: {
                        request: `http://echo-server.test:${echoUrl.port}/get?foo=bar`
                    }
                },
                network: {
                    hostLookup: {
                        type: 'hostIpMap',
                        hostIpMap: {
                            'echo-server.test': echoIp
                        }
                    }
                }
            }, function (err, results) {
                testrun = results;
                done(err);
            });
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

    it('should have used the provided hostIpMap for resolving hostname', function () {
        expect(testrun.response.getCall(0).args[0]).to.be.null;

        var response = testrun.response.firstCall.args[2];

        expect(response).to.have.property('code', 200);
        expect(response.json()).to.deep.include({
            args: { foo: 'bar' }
        });
    });
});
