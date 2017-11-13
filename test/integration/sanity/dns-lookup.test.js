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
                    item: [{
                        request: 'http://fakepostman-echo.com/get?foo=bar'
                    }, {
                        request: 'http://fake2postman-echo.com/get?foo=bar'
                    }]
                },
                hostIpMap: {
                    'fakepostman-echo.com': echoIp,
                    'fake2postman-echo.com': {
                        ip: echoIp,
                        family: 4
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
        expect(testrun.response.getCall(1).args[0]).to.be(null);

        var response1 = testrun.response.firstCall.args[2],
            response2 = testrun.response.firstCall.args[2];

        expect(response1.code).to.be(200);
        expect(response2.code).to.be(200);
        expect(response1.json().args).to.eql({foo: 'bar'});
        expect(response2.json().args).to.eql({foo: 'bar'});
    });
});
