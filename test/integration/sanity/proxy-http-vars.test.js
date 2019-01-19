var proxy = require('http-proxy'),
    expect = require('chai').expect;

describe('proxy configuration vars', function () {
    var server,
        port = 9090,
        proxyHost = 'localhost',
        proxyUrlForHttpRequest = 'http://' + proxyHost + ':' + port;

    before(function (done) {
        server = new proxy.createProxyServer({
            target: 'http://postman-echo.com',
            headers: {
                'x-postman-proxy': 'true'
            }
        });
        server.listen(port, done);
    });

    after(function () {
        server.close();
    });

    describe('lowercase', function () {
        var testrun;

        before(function (done) {
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
        var testrun;

        before(function (done) {
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
