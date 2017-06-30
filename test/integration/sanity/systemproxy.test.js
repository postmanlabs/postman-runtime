var _ = require('lodash'),
    proxy = require('http-proxy'),
    sdk = require('postman-collection');

describe('systemProxy', function () {
    describe('valid output config', function () {
        var server,
            testrun,
            port = 9090,
            proxyHost = 'localhost',
            sampleHttpUrl = 'http://google.com',
            sampleHttpsUrl = 'https://google.com',
            proxyUrlForHttpRequest = 'http://' + proxyHost + ':' + port,
            proxyUrlForHttpsRequest = 'https://' + proxyHost + ':' + port;

        before(function (done) {
            var systemProxy = function (url, callback) {
                return callback(null, {
                    match: '*://postman-echo.com/*',
                    host: proxyHost,
                    port: port,
                    tunnel: false
                });
            };

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
                systemProxy: systemProxy
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
            expect(request.proxy.getProxyUrl(sampleHttpsUrl)).to.eql(proxyUrlForHttpsRequest);
            expect(_.get(response, 'headers.x-postman-proxy')).to.be('true');
        });

        after(function () {
            server.close();
        });
    });

    describe('no output config', function () {
        var server,
            testrun,
            port = 9090;

        before(function (done) {
            var systemProxy = function (url, callback) {
                return callback(null, undefined);
            };

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
                systemProxy: systemProxy
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

        it('must not use the proxy to fetch response', function () {
            var response = testrun.request.getCall(0).args[2].json(),
                request = testrun.request.getCall(0).args[3];

            expect(testrun.request.calledOnce).be.ok(); // one request
            // proxy info added back to request
            expect(request.proxy).to.not.be.ok();
            expect(_.get(response, 'headers.x-postman-proxy')).to.not.be.ok();
        });

        after(function () {
            server.close();
        });
    });

    describe('prefer custom proxies over system proxies', function () {
        var systemProxyServer,
            globalProxyServer,
            testrun,
            globalProxyPort = 9090,
            systemProxyPort = 9091,
            proxyHost = 'localhost',
            sampleHttpUrl = 'http://google.com',
            sampleHttpsUrl = 'https://google.com',
            proxyUrlForHttpRequest = 'http://' + proxyHost + ':' + globalProxyPort,
            proxyUrlForHttpsRequest = 'https://' + proxyHost + ':' + globalProxyPort;

        before(function (done) {
            var systemProxy = function (url, callback) {
                return callback(null, {
                    match: '*://postman-echo.com/*',
                    host: proxyHost,
                    port: systemProxyPort,
                    tunnel: false
                });
            };

            systemProxyServer = new proxy.createProxyServer({
                target: 'http://postman-echo.com',
                headers: {
                    'x-postman-proxy': 'true'
                }
            });
            systemProxyServer.listen(systemProxyPort);

            globalProxyServer = new proxy.createProxyServer({
                target: 'http://postman-echo.com',
                headers: {
                    'x-postman-proxy': 'true'
                }
            });
            globalProxyServer.listen(globalProxyPort);

            this.run({
                collection: {
                    item: {
                        request: 'http://postman-echo.com/get'
                    }
                },
                systemProxy: systemProxy,
                proxies: new sdk.ProxyConfigList({}, [{
                    match: '*://postman-echo.com/*',
                    host: proxyHost,
                    port: globalProxyPort,
                    tunnel: false
                }])

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

        it('must resolve proxy from the static proxy list', function () {
            var response = testrun.request.getCall(0).args[2].json(),
                request = testrun.request.getCall(0).args[3];

            expect(testrun.request.calledOnce).be.ok(); // one request
            // proxy info added back to request
            expect(request.proxy.getProxyUrl()).to.eql(proxyUrlForHttpRequest);
            expect(request.proxy.getProxyUrl(sampleHttpUrl)).to.eql(proxyUrlForHttpRequest);
            expect(request.proxy.getProxyUrl(sampleHttpsUrl)).to.eql(proxyUrlForHttpsRequest);
            expect(_.get(response, 'headers.x-postman-proxy')).to.be('true');
        });

        after(function () {
            systemProxyServer.close();
            globalProxyServer.close();
        });
    });
});
