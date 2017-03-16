var _ = require('lodash'),
    proxy = require('http-proxy'),
    sdk = require('postman-collection');

describe('systemProxy', function () {
    describe('valid output config', function () {
        var server,
            testrun,
            port = 9090,
            proxyServer = 'http://localhost:' + port;

        before(function (done) {
            var systemProxy = function (url, callback) {
                return callback(null, {
                    match: '*://postman-echo.com/*',
                    server: proxyServer,
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
            expect(request.proxy.server.toString()).to.eql(proxyServer);
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

    describe('static proxy list', function () {
        var server,
            testrun,
            port = 9090,
            proxyServer = 'http://localhost:' + port;

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
                systemProxy: systemProxy,
                proxies: new sdk.ProxyConfigList({}, [{
                    match: '*://postman-echo.com/*',
                    server: proxyServer,
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
            expect(request.proxy.server.toString()).to.eql(proxyServer);
            expect(_.get(response, 'headers.x-postman-proxy')).to.be('true');
        });

        after(function () {
            server.close();
        });
    });
});
