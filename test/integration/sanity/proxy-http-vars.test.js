describe('proxy configuration vars', function () {
    var _ = require('lodash'),
        proxy = require('http-proxy'),

        server,
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
            process.env.http_proxy = proxyUrlForHttpRequest;

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
            delete process.env.http_proxy;
        });

        it('must have started and completed the test run', function () {
            expect(testrun).be.ok();
            expect(testrun.done.calledOnce).be.ok();
            expect(testrun.start.calledOnce).be.ok();
        });

        it('must receive response from the proxy', function () {
            var response = testrun.request.getCall(0).args[2].json();

            expect(testrun.request.calledOnce).be.ok(); // one request
            expect(_.get(response, 'headers.x-postman-proxy')).to.be('true');
        });
    });

    describe('uppercase', function () {
        var testrun;

        before(function (done) {
            process.env.HTTP_PROXY = proxyUrlForHttpRequest;

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
            delete process.env.HTTP_PROXY;
        });

        it('must have started and completed the test run', function () {
            expect(testrun).be.ok();
            expect(testrun.done.calledOnce).be.ok();
            expect(testrun.start.calledOnce).be.ok();
        });

        it('must receive response from the proxy', function () {
            var response = testrun.request.getCall(0).args[2].json();

            expect(testrun.request.calledOnce).be.ok(); // one request
            expect(_.get(response, 'headers.x-postman-proxy')).to.be('true');
        });
    });
});
