describe('proxy', function () {
    var _ = require('lodash'),
        ProxyConfigList = require('postman-collection').ProxyConfigList,
        proxy = require('http-proxy'),

        server,
        testrun,
        port = 9090,
        proxyHost = 'localhost',
        sampleHttpUrl = 'http://google.com',
        sampleHttpsUrl = 'https://google.com',
        proxyUrlForHttpRequest = 'http://' + proxyHost + ':' + port;

    before(function (done) {
        var proxyList = new ProxyConfigList({}, [{
            match: '*://postman-echo.com/*',
            host: proxyHost,
            port: port,
            tunnel: false
        }]);

        server = new proxy.createProxyServer({
            target: 'http://postman-echo.com',
            headers: {
                'x-postman-proxy': 'true'
            }
        });
        server.listen(port);

        this.run({
            collection: {
                item: {
                    request: 'http://postman-echo.com/get'
                }
            },
            proxies: proxyList
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
        var response = testrun.request.getCall(0).args[2].json(),
            request = testrun.request.getCall(0).args[3];

        expect(testrun.request.calledOnce).be.ok(); // one request
        // proxy info added back to request
        expect(request.proxy.getProxyUrl()).to.eql(proxyUrlForHttpRequest);
        expect(request.proxy.getProxyUrl(sampleHttpUrl)).to.eql(proxyUrlForHttpRequest);
        expect(request.proxy.getProxyUrl(sampleHttpsUrl)).to.eql(proxyUrlForHttpRequest);
        expect(_.get(response, 'headers.x-postman-proxy')).to.be('true');
    });

    after(function () {
        server.close();
    });
});
