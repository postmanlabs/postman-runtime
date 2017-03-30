describe('http reasons', function () {
    var http = require('http'),

        server,
        testrun;

    before(function (done) {
        var port,
            self = this;

        server = http.createServer();

        server.on('request', function (req, res) {
            res.end(res.writeHead(400, 'Some Custom Reason'));
        });

        server.on('listening', function () {
            port = server.address().port;
            self.run({
                collection: {
                    item: {
                        request: 'http://localhost:' + port + '/'
                    }
                }
            }, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        server.listen(0, 'localhost');
    });

    it('must have started and completed the test run', function () {
        expect(testrun).be.ok();
        expect(testrun.done.calledOnce).be.ok();
        expect(testrun.start.calledOnce).be.ok();
    });

    it('must receive the correct reason phrase from the server', function () {
        var response = testrun.request.getCall(0).args[2];

        expect(response.code).be(400);
        expect(response.status).be('Some Custom Reason');
        expect(response.details()).to.have.property('code', 400);
        expect(response.details()).to.have.property('name', 'Some Custom Reason');
        expect(response.details()).to.have.property('detail', 'The request cannot be fulfilled due to bad syntax.');
    });

    after(function () {
        server.close();
    });
});
