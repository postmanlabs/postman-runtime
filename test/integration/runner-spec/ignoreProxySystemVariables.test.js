var ProxyConfigList = require('postman-collection').ProxyConfigList,
    expect = require('chai').expect;

(typeof window === 'undefined' ? describe : describe.skip)('Runner Spec: ignoreProxyEnvironmentVariables', function () {
    var testrun;

    before(function () {
        process.env.http_proxy = global.servers.proxy; // eslint-disable-line no-process-env
    });

    after(function () {
        delete process.env.http_proxy; // eslint-disable-line no-process-env
    });

    describe('default', function () {
        before(function (done) {
            this.run({
                collection: {
                    item: {
                        request: 'http://postman-echo.com/get'
                    }
                }
            }, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        it('should complete the run', function () {
            expect(testrun).to.be.ok;
            expect(testrun).to.nested.include({
                'done.calledOnce': true,
                'start.calledOnce': true,
                'request.calledOnce': true
            });
        });

        it('should proxy the request as configured in env variable', function () {
            var response = testrun.request.getCall(0).args[2];

            // console.log(PROXY_URL, testrun.request.getCall(0).args)

            expect(response.reason()).to.eql('OK');
            expect(response.json()).to.have.nested.property('headers.x-postman-proxy', 'true');
        });
    });

    describe('with ignoreProxyEnvironmentVariables: true', function () {
        before(function (done) {
            this.run({
                ignoreProxyEnvironmentVariables: true,
                collection: {
                    item: {
                        request: 'http://postman-echo.com/get'
                    }
                }
            }, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        it('should complete the run', function () {
            expect(testrun).to.be.ok;
            expect(testrun).to.nested.include({
                'done.calledOnce': true,
                'start.calledOnce': true,
                'request.calledOnce': true
            });
        });

        it('should not proxy the request', function () {
            var response = testrun.request.getCall(0).args[2];

            expect(response.reason()).to.eql('OK');
            expect(response.json()).to.not.have.nested.property('headers.x-postman-proxy');
        });
    });

    describe('with ignoreProxyEnvironmentVariables: false', function () {
        before(function (done) {
            this.run({
                ignoreProxyEnvironmentVariables: false,
                collection: {
                    item: {
                        request: 'http://postman-echo.com/get'
                    }
                }
            }, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        it('should complete the run', function () {
            expect(testrun).to.be.ok;
            expect(testrun).to.nested.include({
                'done.calledOnce': true,
                'start.calledOnce': true,
                'request.calledOnce': true
            });
        });

        it('should proxy the request as configured in env variable', function () {
            var response = testrun.request.getCall(0).args[2];

            expect(response.reason()).to.eql('OK');
            expect(response.json()).to.have.nested.property('headers.x-postman-proxy', 'true');
        });
    });

    describe('with ignoreProxyEnvironmentVariables and global proxy', function () {
        before(function (done) {
            this.run({
                ignoreProxyEnvironmentVariables: true,
                proxies: new ProxyConfigList({}, [{
                    match: '*://postman-echo.com/*',
                    host: 'localhost',
                    port: global.servers.proxy.split(':')[2]
                }]),
                collection: {
                    item: {
                        request: 'http://postman-echo.com/get'
                    }
                }
            }, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        it('should complete the run', function () {
            expect(testrun).to.be.ok;
            expect(testrun).to.nested.include({
                'done.calledOnce': true,
                'start.calledOnce': true,
                'request.calledOnce': true
            });
        });

        it('should proxy the request as configured in global proxy', function () {
            var response = testrun.request.getCall(0).args[2],
                request = testrun.request.getCall(0).args[3];

            expect(request.proxy.getProxyUrl()).to.eql(global.servers.proxy);
            expect(response.reason()).to.eql('OK');
            expect(response.json()).to.have.nested.property('headers.x-postman-proxy', 'true');
        });
    });
});
