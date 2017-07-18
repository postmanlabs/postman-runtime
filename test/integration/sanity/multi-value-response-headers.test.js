describe('multi valued headers', function () {
    var _ = require('lodash'),
        http = require('http'),

        server,
        testrun;

    before(function (done) {
        var port;

        server = http.createServer();

        server.on('request', function (req, res) {
            res.setHeader('x-pm-test', ['one', 'two']); // adds a duplicate header to the response
            res.end('worked');
        });

        server.listen(0, 'localhost');

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

    it('must have started and completed the test run', function () {
        expect(testrun).be.ok();
        expect(testrun.done.calledOnce).be.ok();
        expect(testrun.start.calledOnce).be.ok();
        expect(testrun.done.firstCall.args[0]).to.be(null);
    });

    it('must receive duplicate headers from the http server', function () {
        var response = testrun.request.getCall(0).args[2];

        // eslint-disable-next-line lodash/prop-shorthand
        expect(_.countBy(response.headers.members, function (header) {
            return header.key;
        })['x-pm-test']).to.eql(2); // The "x-pm-test" header should occur twice
        expect(response.text()).to.eql('worked');
    });

    after(function () {
        server.close();
    });
});
