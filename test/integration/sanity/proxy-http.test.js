describe('sanity test', function () {
    var proxy = require('http-proxy'),

        server = new proxy.createProxyServer({target: 'https://echo.getpostman.com/get'}),

        testrun;

    before(function (done) {
        var fakeProxyManager = {
            getProxyConfiguration: function (url, callback) {
                callback(null, server.options);
            }
        };

        server.listen(9090);

        this.run({
            collection: {
                item: {request: 'https://echo.getpostman.com/get'}
            },
            requester: {proxyManager: fakeProxyManager}
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
        var response = testrun.request.getCall(0).args[2];

        expect(testrun.request.calledOnce).be.ok(); // one request
        expect(response.json()).be.ok();
    });

    after(function () {
        server.close();
    });
});
