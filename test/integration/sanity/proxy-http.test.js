var ProxyConfigList = require('postman-collection').ProxyConfigList,
    proxy = require('http-proxy'),
    expect = require('chai').expect;

describe('proxy', function () {
    var server,
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

    it('should have started and completed the test run', function () {
        expect(testrun).to.be.ok;
        expect(testrun).to.nested.include({
            'done.calledOnce': true,
            'start.calledOnce': true
        });
    });

    it('should receive response from the proxy', function () {
        var response = testrun.request.getCall(0).args[2].json(),
            request = testrun.request.getCall(0).args[3];

        expect(testrun.request.calledOnce).to.be.ok; // one request
        // proxy info added back to request
        expect(request.proxy.getProxyUrl()).to.eql(proxyUrlForHttpRequest);
        expect(request.proxy.getProxyUrl(sampleHttpUrl)).to.eql(proxyUrlForHttpRequest);
        expect(request.proxy.getProxyUrl(sampleHttpsUrl)).to.eql(proxyUrlForHttpRequest);
        expect(response).to.have.nested.property('headers.x-postman-proxy', 'true');
    });

    after(function () {
        server.close();
    });
});
