describe('sanity test', function () {
    var testrun;

    before(function (done) {
        // start an http proxy server using 'http-proxy' module
        // https://github.com/nodejitsu/node-http-proxy#setup-a-basic-stand-alone-proxy-server
        // start it on some port, say 9090

        // create a an object "fakeProxyManager", which has one property called "getProxyConfiguration"
        // "getProxyConfiguration" will be called in request-wrapper.js, line 83
        // return the correct proxy config from the "getProxyConfiguration" function

        // this.run({
        //     collection: {
        //         item: {request: 'https://echo.getpostman.com/get'}
        //     },
        //     requester: { proxyManager: fakeProxyManager }
        // }, function (err, results) {
        //     done(err);
        // });
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

    after(function (done) {
        // stop your server
    })
});
