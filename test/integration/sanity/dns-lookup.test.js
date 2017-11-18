var dns = require('dns');

describe('DNS lookup', function() {
    var testrun;

    before(function(done) {
        var self = this;

        // Not hard-coding since this can change
        dns.lookup('postman-echo.com', function (err, echoIp) {
            if (err) {
                return done(err);
            }

            self.run({
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
            }, function(err, results) {
                testrun = results;
                done(err);
            });
        });
    });

    it('must have completed the run', function() {
        expect(testrun).be.ok();
        expect(testrun.done.calledOnce).be.ok();
        expect(testrun.done.getCall(0).args[0]).to.be(null);
        expect(testrun.start.calledOnce).be.ok();
    });

    it('must have used the provided hostIpMap for resolving hostname', function() {
        expect(testrun.response.getCall(0).args[0]).to.be(null);

        var response = testrun.response.firstCall.args[2];

        expect(response.code).to.be(200);
        expect(response.json().args).to.eql({foo: 'bar'});
    });
});
