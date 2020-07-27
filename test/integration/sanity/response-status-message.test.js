var server = require('../../fixtures/servers/_servers'),
    expect = require('chai').expect;

describe('response status message', function () {
    var testrun,
        rawEchoServer;

    before(function (done) {
        var self = this;

        rawEchoServer = server.createRawEchoServer();
        rawEchoServer.listen(0, function () {
            self.run({
                collection: {
                    item: [{
                        request: {
                            method: 'POST',
                            url: rawEchoServer.url + '/raw-echo',
                            body: {
                                mode: 'raw',
                                raw: 'HTTP/1.1 200 Working fine\r\n\r\n'
                            }
                        }
                    }, {
                        request: {
                            method: 'POST',
                            url: rawEchoServer.url + '/raw-echo',
                            body: {
                                mode: 'raw',
                                raw: 'HTTP/1.1 200 Работает нормально\r\n\r\n'
                            }
                        }
                    }]
                }
            }, function (err, results) {
                testrun = results;

                done(err);
            });
        });
    });

    after(function () {
        rawEchoServer.destroy();
    });

    it('should have completed the run', function () {
        expect(testrun).to.be.ok;
        expect(testrun.request.getCall(0)).to.nested.include({'args[0]': null, 'args[2].code': 200});
        expect(testrun.request.getCall(1)).to.nested.include({'args[0]': null, 'args[2].code': 200});
        expect(testrun).to.nested.include({
            'done.calledOnce': true,
            'start.calledOnce': true
        });
    });

    it('should be decoded correctly containing characters in range of latin1 encoding', function () {
        expect(testrun.request.getCall(0).args[2]).to.have.property('status', 'Working fine');
    });

    it('should be decoded correctly containing characters in range of utf8 encoding', function () {
        expect(testrun.request.getCall(1).args[2]).to.have.property('status', 'Работает нормально');
    });
});
