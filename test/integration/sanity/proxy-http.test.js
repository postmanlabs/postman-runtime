describe('sanity test', function () {
    var _ = require('lodash'),
        proxy = require('http-proxy'),

        server = new proxy.createProxyServer({
            target: 'http://echo.getpostman.com',
            headers: {
                'x-postman-proxy': 'true'
            }
        }),

        testrun;

    before(function (done) {
        var fakeProxyManager = {
            getProxyConfiguration: function (url, callback) {
                callback(null, {
                    proxy: 'http://localhost:9090',
                    tunnel: false
                });
            }
        };

        server.listen(9090);

        this.run({
            collection: {
                item: {
                    request: 'http://echo.getpostman.com/get'
                }
            },
            requester: {
                proxyManager: fakeProxyManager
            }
        }, function (err, results) {
            testrun = results;
            done(err);
        });
    });

    it('must have started and completed the test run', function () {
        expect(testrun).be.ok();
        expect(testrun.done.calledOnce).be.ok();
        expect(testrun.start.calledOnce).be.ok();
    });

    it('must receive response from the proxy', function () {
        var response = testrun.request.getCall(0).args[2].json();

        expect(testrun.request.calledOnce).be.ok(); // one request
        expect(_.get(response, 'headers.x-postman-proxy')).to.be('true');
    });

    after(function () {
        server.close();
    });
});
