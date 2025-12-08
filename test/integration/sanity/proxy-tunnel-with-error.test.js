var ProxyConfigList = require('postman-collection').ProxyConfigList,
    expect = require('chai').expect;

(typeof window === 'undefined' ? describe : describe.skip)('proxy with tunnel', function () {
    var testrun;

    describe('proxy tunnel with invalid auth', function () {
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
                        request: 'https://postman-echo.com/get'
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
});
