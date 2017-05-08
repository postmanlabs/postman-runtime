describe('GET request bodies', function () {

    describe('disabled (by default)', function () {
        var testrun,
            port,
            url,
            reqBody = 'some random text';

        before(function (done) {
            var http = require('http'),
                server = http.createServer();

            server.on('request', function (req, res) {
                var data;
                req.on('data', function (chunk) {
                    chunk = chunk.toString();
                    data = data ? data + chunk : chunk;
                });
                req.on('end', function () {
                    res.end(data);
                });
            });

            server.on('listening', function () {
                port = server.address().port;
                url = 'http://localhost:' + port + '/get';
                this.run({
                    collection: {
                        item: {request: {url: url, body: {raw: reqBody, mode: 'raw'}}}
                    }

                }, function (err, results) {
                    testrun = results;
                    done(err);
                });
            }.bind(this));

            server.listen(0, 'localhost');
        });

        it('must have started and completed the test run', function () {
            expect(testrun).be.ok();
            expect(testrun.done.calledOnce).be.ok();
            expect(testrun.start.calledOnce).be.ok();
        });

        it('must send the request', function () {
            expect(testrun.beforeRequest.calledOnce).be.ok(); // one request

            var request = testrun.beforeRequest.getCall(0).args[2];
            expect(request).be.ok();
            expect(request.url.toString()).eql(url);
            expect(request.method).be('GET');
        });

        it('must not send a body with the request', function () {
            var response = testrun.request.getCall(0).args[2];

            expect(testrun.request.calledOnce).be.ok(); // one request
            expect(response.text()).to.not.be.ok();
        });
    });

    describe('enabled', function () {
        var testrun,
            port,
            url,
            reqBody = 'some random text';

        before(function (done) {
            var http = require('http'),
                server = http.createServer();

            server.on('request', function (req, res) {
                var data;
                req.on('data', function (chunk) {
                    chunk = chunk.toString();
                    data = data ? data + chunk : chunk;
                });
                req.on('end', function () {
                    res.end(data);
                });
            });

            server.on('listening', function () {
                port = server.address().port;
                url = 'http://localhost:' + port + '/get';
                this.run({
                    collection: {
                        item: {request: {url: url, body: {raw: reqBody, mode: 'raw'}}}
                    },
                    requester: {
                        sendBodyWithGetRequests: true
                    }
                }, function (err, results) {
                    testrun = results;
                    done(err);
                });
            }.bind(this));

            server.listen(0, 'localhost');
        });

        it('must have started and completed the test run', function () {
            expect(testrun).be.ok();
            expect(testrun.done.calledOnce).be.ok();
            expect(testrun.start.calledOnce).be.ok();
        });

        it('must send the request', function () {
            var request = testrun.beforeRequest.getCall(0).args[2];

            expect(testrun.beforeRequest.calledOnce).be.ok(); // one request
            expect(request).be.ok();
            expect(request.url.toString()).eql(url);
            expect(request.method).be('GET');
        });

        it('must send a body with the request', function () {
            var response = testrun.request.getCall(0).args[2];

            expect(testrun.request.calledOnce).be.ok(); // one request
            expect(response.text()).to.eql(reqBody);
        });
    });
});
