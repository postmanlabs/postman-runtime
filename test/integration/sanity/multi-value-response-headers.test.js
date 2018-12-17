var _ = require('lodash'),
    http = require('http'),
    expect = require('chai').expect,
    enableServerDestroy = require('server-destroy');

describe('multi valued headers', function () {
    var server,
        testrun;

    before(function (done) {
        var port;

        server = http.createServer();

        server.on('request', function (req, res) {
            res.setHeader('x-pm-test', ['one', 'two']); // adds a duplicate header to the response
            res.end('worked');
        });

        server.listen(0, 'localhost');

        enableServerDestroy(server);

        server.on('listening', function () {
            port = server.address().port;

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
        server.destroy(done);
    });
});
