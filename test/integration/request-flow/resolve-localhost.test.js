var expect = require('chai').expect,
    sinon = require('sinon'),
    server = require('../../fixtures/server');

describe('request to *.localhost', function () {
    var httpServer,
        testrun,
        port;

    before(function (done) {
        httpServer = server.createHTTPServer();

        httpServer.on('/', function (req, res) {
            res.writeHead(200);
            res.end('POSTMAN');
        });


        httpServer.listen(0, function (err) {
            if (err) { return done(err); }

            port = httpServer.port;

            this.run({
                collection: {
                    item: [{
                        request: {
                            url: 'localhost:' + port,
                            method: 'POST'
                        }
                    }, {
                        request: {
                            url: 'subdomain.localhost:' + port,
                            method: 'POST'
                        }
                    }]
                }
            }, function (err, result) {
                testrun = result;
                done(err);
            });
        }.bind(this));
    });

    after(function (done) {
        httpServer.destroy(done);
    });

    it('should complete the run', function () {
        expect(testrun).to.be.ok;
        sinon.assert.calledOnce(testrun.start);
        sinon.assert.calledOnce(testrun.done);
        sinon.assert.calledTwice(testrun.request);
        sinon.assert.calledTwice(testrun.response);
        sinon.assert.calledWith(testrun.done.getCall(0), null);
    });

    it('should send correct request and response for localhost', function () {
        var request = testrun.response.getCall(0).args[3],
            response = testrun.response.getCall(0).args[2];

        sinon.assert.calledWith(testrun.request.getCall(0), null);
        sinon.assert.calledWith(testrun.response.getCall(0), null);

        expect(request).to.be.ok;
        expect(request.url.toString()).to.equal('localhost:' + port);
        expect(response.text()).to.equal('POSTMAN');
    });

    it('should send correct request and response for subdomain.localhost', function () {
        var request = testrun.response.getCall(1).args[3],
            response = testrun.response.getCall(1).args[2];

        sinon.assert.calledWith(testrun.request.getCall(1), null);
        sinon.assert.calledWith(testrun.response.getCall(1), null);

        expect(request).to.be.ok;
        expect(request.url.toString()).to.equal('subdomain.localhost:' + port);
        expect(response.text()).to.equal('POSTMAN');
    });
});
