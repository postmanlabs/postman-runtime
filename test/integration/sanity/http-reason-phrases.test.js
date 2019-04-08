var expect = require('chai').expect,
    server = require('../../fixtures/server');

describe('http reasons', function () {
    var httpServer,
        testrun;

    before(function (done) {
        var port,
            self = this;

        httpServer = server.createHTTPServer();

        httpServer.on('/', function (req, res) {
            res.writeHead(400, 'Some Custom Reason');
            res.end();
        });

        httpServer.listen(0, 'localhost', function () {
            port = httpServer.address().port;
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
        httpServer.destroy(done);
    });
});
