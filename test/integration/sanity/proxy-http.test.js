var ProxyConfigList = require('postman-collection').ProxyConfigList,
    proxy = require('http-proxy'),
    expect = require('chai').expect,
    server = require('../../fixtures/server');

describe('proxy', function () {
    var testrun,
        proxyServer,
        port = 9090,
        proxyHost = 'localhost',
        sampleHttpUrl = 'http://google.com',
        sampleHttpsUrl = 'https://google.com',
        proxyUrlForHttpRequest = 'http://' + proxyHost + ':' + port;

    describe('sanity', function () {
        before(function (done) {
            var proxyList = new ProxyConfigList({}, [{
                match: '*://postman-echo.com/*',
                host: proxyHost,
                port: port,
                tunnel: false
            }]);

            // @todo replace all `http-proxy` servers with server.createProxyServer
            proxyServer = new proxy.createProxyServer({
                target: 'http://postman-echo.com',
                // extra headers to be added to target request
                headers: {
                    'x-postman-proxy': 'true'
                }
            });
            proxyServer.listen(port);

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
            // make sure request went through proxy since this header will be added
            // by the proxy before forwarding the request
            expect(response).to.have.nested.property('headers.x-postman-proxy', 'true');
        });

        after(function () {
            proxyServer.close();
        });
    });

    describe('auth: valid', function () {
        var auth = {
                username: 'postman-user',
                password: 'password'
            },
            proxyList = new ProxyConfigList({}, [{
                match: '*://postman-echo.com/*',
                host: proxyHost,
                port: port,
                authenticate: true,
                username: auth.username,
                password: auth.password
            }]);

        before(function (done) {
            proxyServer = server.createProxyServer({headers: {'x-postman-proxy': 'true'}, auth: auth});
            proxyServer.listen(port);

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
            var response = testrun.request.getCall(0).args[2],
                request = testrun.request.getCall(0).args[3];

            expect(testrun.request.calledOnce).to.be.ok;
            expect(request.proxy.getProxyUrl()).to.eql(`http://${auth.username}:${auth.password}@${proxyHost}:${port}`);
            expect(response.reason()).to.eql('OK');
            expect(response.json()).to.have.nested.property('headers.x-postman-proxy', 'true');
        });

        after(function () {
            proxyServer.destroy();
        });
    });

    describe('auth: invalid', function () {
        var auth = {
                username: 'postman-user',
                password: 'password'
            },
            proxyList = new ProxyConfigList({}, [{
                match: '*://postman-echo.com/*',
                host: proxyHost,
                port: port,
                authenticate: true,
                username: auth.username,
                password: auth.password
            }]);

        before(function (done) {
            proxyServer = server.createProxyServer({
                headers: {'x-postman-proxy': 'true'},
                auth: {
                    username: 'random-user',
                    password: 'wrong-password'
                }
            });
            proxyServer.listen(port);

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
            var response = testrun.request.getCall(0).args[2],
                request = testrun.request.getCall(0).args[3];

            expect(testrun.request.calledOnce).to.be.ok;
            expect(request.proxy.getProxyUrl()).to.eql(`http://${auth.username}:${auth.password}@${proxyHost}:${port}`);
            expect(response.reason()).to.eql('Proxy Authentication Required');
            expect(response.text()).to.equal('Proxy Authentication Required');
        });

        after(function () {
            proxyServer.destroy();
        });
    });
});
