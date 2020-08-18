var ProxyConfigList = require('postman-collection').ProxyConfigList,
    expect = require('chai').expect;

(typeof window === 'undefined' ? describe : describe.skip)('proxy', function () {
    var testrun;

    describe('sanity', function () {
        var proxyPort,
            proxyHost,
            proxyUrlForHttpRequest,
            sampleHttpUrl = 'http://google.com',
            sampleHttpsUrl = 'https://google.com';

        before(function (done) {
            proxyHost = 'localhost';
            proxyPort = global.servers.proxy.split(':')[2];
            proxyUrlForHttpRequest = 'http://' + proxyHost + ':' + proxyPort;
            var proxyList = new ProxyConfigList({}, [{
                match: '*://postman-echo.com/*',
                host: proxyHost,
                port: proxyPort,
                tunnel: false
            }]);

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

            expect(testrun.request.calledOnce).to.be.ok; // one request
            // proxy info added back to request
            expect(request.proxy.getProxyUrl()).to.eql(proxyUrlForHttpRequest);
            expect(request.proxy.getProxyUrl(sampleHttpUrl)).to.eql(proxyUrlForHttpRequest);
            expect(request.proxy.getProxyUrl(sampleHttpsUrl)).to.eql(proxyUrlForHttpRequest);
            // make sure request went through proxy since this header will be added
            // by the proxy before forwarding the request
            expect(response.json()).to.have.nested.property('headers.x-postman-proxy', 'true');
        });
    });

    describe('auth: valid', function () {
        var proxyHost,
            proxyPort,
            proxyList,
            auth = {
                username: 'postman-user',
                password: 'password'
            };

        before(function (done) {
            proxyHost = 'localhost';
            proxyPort = global.servers.proxyAuth.split(':')[2];
            proxyList = new ProxyConfigList({}, [{
                match: '*://postman-echo.com/*',
                host: 'localhost',
                port: proxyPort,
                authenticate: true,
                username: auth.username,
                password: auth.password
            }]);

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
            expect(request.proxy.getProxyUrl())
                .to.eql(`http://${auth.username}:${auth.password}@${proxyHost}:${proxyPort}`);
            expect(response.reason()).to.eql('OK');
            expect(response.json()).to.have.nested.property('headers.x-postman-proxy', 'true');
        });
    });

    describe('auth: invalid', function () {
        var proxyHost,
            proxyPort,
            proxyList,
            auth = {
                username: 'random-user',
                password: 'wrong-password'
            };

        before(function (done) {
            proxyHost = 'localhost';
            proxyPort = global.servers.proxyAuth.split(':')[2];
            proxyList = new ProxyConfigList({}, [{
                match: '*://postman-echo.com/*',
                host: proxyHost,
                port: proxyPort,
                authenticate: true,
                username: auth.username,
                password: auth.password
            }]);

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
            expect(request.proxy.getProxyUrl())
                .to.eql(`http://${auth.username}:${auth.password}@${proxyHost}:${proxyPort}`);
            expect(response.reason()).to.eql('Proxy Authentication Required');
            expect(response.text()).to.equal('Proxy Authentication Required');
        });
    });

    // issue: https://github.com/postmanlabs/postman-app-support/issues/5626
    // Skip in TRAVIS because IPv6 is disabled there
    // eslint-disable-next-line no-process-env
    (process.env.TRAVIS ? describe.skip : describe)('IPv6 request through IPv4 proxy', function () {
        var proxyHost,
            proxyPort,
            requestPort,
            proxyList;

        before(function (done) {
            proxyHost = 'localhost';
            proxyPort = global.servers.proxyIPv6.split(':')[2];
            requestPort = global.servers.httpIPv6.split(':')[2];
            proxyList = new ProxyConfigList({}, [{
                host: proxyHost,
                port: proxyPort
            }]);

            this.run({
                collection: {
                    item: {
                        request: `http://localhost:${requestPort}/proxy`
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
            expect(request.proxy.getProxyUrl()).to.eql('http://' + proxyHost + ':' + proxyPort);
            expect(response.reason()).to.eql('OK');
            expect(response.text()).to.include('Hello Postman!!');
            expect(response.text()).to.include('proxy-header:true');
        });
    });
});
