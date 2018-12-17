var http = require('http'),
    expect = require('chai').expect,
    enableServerDestroy = require('server-destroy');

describe('http reasons', function () {
    var server,
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

        enableServerDestroy(server);
    });

    it('should have started and completed the test run', function () {
        expect(testrun).to.be.ok;
        expect(testrun).to.nested.include({
            'done.calledOnce': true,
            'start.calledOnce': true
        });
    });

    it('should receive the correct reason phrase from the server', function () {
        var response = testrun.request.getCall(0).args[2];

        expect(response).to.deep.include({
            code: 400,
            status: 'Some Custom Reason'
        });
        expect(response.details()).to.deep.include({
            code: 400,
            name: 'Some Custom Reason',
            detail: 'The request cannot be fulfilled due to bad syntax.'
        });
    });

    after(function (done) {
        server.destroy(done);
    });
});
