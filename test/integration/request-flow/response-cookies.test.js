var sinon = require('sinon'),
    expect = require('chai').expect,
    server = require('../../fixtures/server');

describe('Cookies expiry in response callback', function () {
    var testrun,
        httpServer;

    before(function (done) {
        var self = this;

        httpServer = server.createHTTPServer();

        httpServer.on('/', function (req, res) {
            res.writeHead(200, {
                'Set-Cookie': [
                    // session cookie (without Max-Age and Expires)
                    'cookie_1=value_1; path=/',

                    // with Max-Age > 0
                    'cookie_2=value_2; path=/; Max-Age=1000'
                ]
            });

            res.end();
        });

        httpServer.listen(0, function () {
            self.run({
                collection: {
                    item: [{
                        request: httpServer.url
                    }]
                }
            }, function (err, result) {
                testrun = result;
                done(err);
            });
        });
    });

    after(function (done) {
        httpServer.destroy(done);
    });

    it('should complete the run', function () {
        expect(testrun).to.be.ok;
        sinon.assert.calledOnce(testrun.start);
        sinon.assert.calledOnce(testrun.done);
        sinon.assert.calledWith(testrun.done.getCall(0), null);
    });

    it('should have null expiry for session cookie', function () {
        var cookie = testrun.response.getCall(0).args[5].find({name: 'cookie_1'});

        expect(cookie.expires).to.be.null;
    });


    it('should have expiry for cookie with Max-Age>0', function () {
        var cookie = testrun.response.getCall(0).args[5].find({name: 'cookie_2'});

        expect(cookie.expires).to.be.ok;
        expect(cookie.expires).to.be.instanceOf(Date);
    });
});
