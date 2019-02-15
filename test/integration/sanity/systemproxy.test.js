var proxy = require('http-proxy'),
    sinon = require('sinon').createSandbox(),
    expect = require('chai').expect,
    sdk = require('postman-collection');

describe('systemProxy', function () {
    after(function () {
        sinon.restore();
    });

    describe('valid output config', function () {
        var server,
            testrun,
            port = 9090,
            proxyHost = 'localhost',
            systemProxySpy,
            sampleHttpUrl = 'http://google.com',
            sampleHttpsUrl = 'https://google.com',
            proxyUrlForHttpRequest = 'http://' + proxyHost + ':' + port;

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

            systemProxySpy = sinon.spy();
            server.before('web', 'stream', systemProxySpy);

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

            expect(testrun).to.nested.include({ // one request
                'test.calledOnce': true
            });
            // proxy info added back to request
            expect(request.proxy.getProxyUrl()).to.eql(proxyUrlForHttpRequest);
            expect(request.proxy.getProxyUrl(sampleHttpUrl)).to.eql(proxyUrlForHttpRequest);
            expect(request.proxy.getProxyUrl(sampleHttpsUrl)).to.eql(proxyUrlForHttpRequest);

            // The above checks do not confirm that the correct proxy url was used.
            // So confirming by testing that the correct proxy server was only called
            sinon.assert.calledOnce(systemProxySpy);
            expect(response).to.have.nested.property('headers.x-postman-proxy', 'true');
        });

        after(function () {
            server.close();
        });
    });

    describe('no output config', function () {
        var server,
            testrun,
            systemProxySpy,
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
            systemProxySpy = sinon.spy();
            server.before('web', 'stream', systemProxySpy);

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

        it('should have started and completed the test run', function () {
            expect(testrun).to.be.ok;
            expect(testrun).to.nested.include({
                'done.calledOnce': true,
                'start.calledOnce': true
            });
        });

        it('should not use the proxy to fetch response', function () {
            var response = testrun.request.getCall(0).args[2].json(),
                request = testrun.request.getCall(0).args[3];

            expect(testrun).to.nested.include({ // one request
                'request.calledOnce': true
            });
            // proxy info added back to request
            expect(request.proxy).to.not.be.ok;
            sinon.assert.notCalled(systemProxySpy);
            expect(response).to.not.have.nested.property('headers.x-postman-proxy');
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
            globalProxySpy,
            systemProxySpy,
            proxyHost = 'localhost',
            sampleHttpUrl = 'http://google.com',
            sampleHttpsUrl = 'https://google.com',
            proxyUrlForHttpRequest = 'http://' + proxyHost + ':' + globalProxyPort;

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

            globalProxySpy = sinon.spy();
            systemProxySpy = sinon.spy();

            globalProxyServer.before('web', 'stream', globalProxySpy);
            systemProxyServer.before('web', 'stream', systemProxySpy);

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

        it('should have started and completed the test run', function () {
            expect(testrun).to.be.ok;
            expect(testrun).to.nested.include({
                'done.calledOnce': true,
                'start.calledOnce': true
            });
        });

        it('should resolve proxy from the static proxy list', function () {
            var response = testrun.request.getCall(0).args[2].json(),
                request = testrun.request.getCall(0).args[3];

            expect(testrun).to.nested.include({ // one request
                'test.calledOnce': true
            });
            // proxy info added back to request
            expect(request.proxy.getProxyUrl()).to.eql(proxyUrlForHttpRequest);
            expect(request.proxy.getProxyUrl(sampleHttpUrl)).to.eql(proxyUrlForHttpRequest);
            expect(request.proxy.getProxyUrl(sampleHttpsUrl)).to.eql(proxyUrlForHttpRequest);

            // The above checks do not confirm that the correct proxy url was used.
            // So confirming by testing that the correct proxy server was only called
            sinon.assert.calledOnce(globalProxySpy);
            sinon.assert.notCalled(systemProxySpy);
            expect(response).to.have.nested.property('headers.x-postman-proxy', 'true');
        });

        after(function () {
            systemProxyServer.close();
            globalProxyServer.close();
        });
    });
});
