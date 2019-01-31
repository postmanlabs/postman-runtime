var _ = require('lodash'),
    expect = require('chai').expect,
    server = require('../../fixtures/server');

describe('multi valued headers', function () {
    var httpServer,
        testrun;

    before(function (done) {
        var port;

        httpServer = server.createHTTPServer();

        httpServer.on('/', function (req, res) {
            res.setHeader('x-pm-test', ['one', 'two']); // adds a duplicate header to the response
            res.end('worked');
        });

        httpServer.listen(0, 'localhost', function () {
            port = httpServer.address().port;

            this.run({
                collection: {
                    item: {
                        request: 'http://localhost:' + port + '/'
                    }
                }
            }, function (err, results) {
                testrun = results;
                done(err);
            });
        }.bind(this));
    });

    it('should have started and completed the test run', function () {
        expect(testrun).to.be.ok;
        expect(testrun).to.nested.include({
            'done.calledOnce': true,
            'start.calledOnce': true,
            'done.firstCall.args[0]': null
        });
    });

    it('should receive duplicate headers from the http server', function () {
        var response = testrun.request.getCall(0).args[2];

        // eslint-disable-next-line lodash/prop-shorthand
        expect(_.countBy(response.headers.members, function (header) {
            return header.key;
        })['x-pm-test']).to.equal(2); // The "x-pm-test" header should occur twice
        expect(response.text()).to.equal('worked');
    });

    after(function (done) {
        httpServer.destroy(done);
    });
});
