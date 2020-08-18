var expect = require('chai').expect;

(typeof window === 'undefined' ? describe : describe.skip)('proxy configuration vars', function () {
    var testrun;

    describe('lowercase', function () {
        var proxyHost,
            proxyPort,
            proxyUrlForHttpRequest;

        before(function (done) {
            proxyHost = 'localhost';
            proxyPort = global.servers.proxy.split(':')[2];

            proxyUrlForHttpRequest = 'http://' + proxyHost + ':' + proxyPort;
            process.env.http_proxy = proxyUrlForHttpRequest; // eslint-disable-line no-process-env

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

        after(function () {
            delete process.env.http_proxy; // eslint-disable-line no-process-env
        });

        it('should have started and completed the test run', function () {
            expect(testrun).to.be.ok;
            expect(testrun).to.nested.include({
                'done.calledOnce': true,
                'start.calledOnce': true
            });
        });

        it('should receive response from the proxy', function () {
            var response = testrun.request.getCall(0).args[2].json();

            expect(testrun.request.calledOnce).to.be.ok; // one request
            expect(response).to.have.nested.property('headers.x-postman-proxy', 'true');
        });
    });

    describe('uppercase', function () {
        var proxyHost,
            proxyPort,
            proxyUrlForHttpRequest;

        before(function (done) {
            proxyHost = 'localhost';
            proxyPort = global.servers.proxy.split(':')[2];

            proxyUrlForHttpRequest = 'http://' + proxyHost + ':' + proxyPort;
            process.env.HTTP_PROXY = proxyUrlForHttpRequest; // eslint-disable-line no-process-env

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

        after(function () {
            delete process.env.HTTP_PROXY; // eslint-disable-line no-process-env
        });

        it('should have started and completed the test run', function () {
            expect(testrun).to.be.ok;
            expect(testrun).to.nested.include({
                'done.calledOnce': true,
                'start.calledOnce': true
            });
        });

        it('should receive response from the proxy', function () {
            var response = testrun.request.getCall(0).args[2].json();

            expect(testrun.request.calledOnce).to.be.ok; // one request
            expect(response).to.have.nested.property('headers.x-postman-proxy', 'true');
        });
    });
});
