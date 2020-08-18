var dns = require('dns'),
    expect = require('chai').expect;

(typeof window === 'undefined' ? describe : describe.skip)('DNS lookup', function () {
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
                        request: 'http://fakepostman-echo.com/get?foo=bar'
                    }
                },
                network: {
                    hostLookup: {
                        type: 'hostIpMap',
                        hostIpMap: {
                            'fakepostman-echo.com': echoIp
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
            args: {foo: 'bar'}
        });
    });
});
