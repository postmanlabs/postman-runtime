var net = require('net'),
    expect = require('chai').expect,
    enableServerDestroy = require('server-destroy');

describe('request size', function() {
    var server,
        testrun,
        unicode = '😎',
        PORT = 5050,
        URL = 'http://localhost:' + PORT;

    before(function (done) {
        server = net.createServer(function (socket) {
            socket.on('data', function (chunk) {
                if (!this.gotData) {
                    this.gotData = true;

                    socket.write('HTTP/1.1 200 ok\r\n');
                    socket.write('Content-Type: text/plain\r\n\r\n');

                    setTimeout(function () {
                        socket.end();
                    }, 500);
                }

                // respond with raw request message
                socket.write(chunk.toString());
            });
        }).listen(PORT, function (err) {
            if (err) { return done(err); }

            this.run({
                collection: {
                    item: [{
                        request: URL
                    }, {
                        request: {
                            url: URL,
                            method: 'POST',
                            body: {
                                mode: 'raw',
                                raw: 'POSTMAN'
                            }
                        }
                    }, {
                        request: {
                            url: URL,
                            method: 'POST',
                            body: {
                                mode: 'raw',
                                raw: 'POSTMAN' + unicode
                            }
                        }
                    }]
                }
            }, function (err, results) {
                testrun = results;
                done(err);
            });
        }.bind(this));
        enableServerDestroy(server);
    });

    after(function (done) {
        server.destroy(done);
    });

    it('should have extracted request size correctly', function() {
        expect(testrun).to.be.ok;
        expect(testrun).to.nested.include({
            'request.calledThrice': true
        });

        expect(testrun).to.have.property('request').that.nested.include({
            'firstCall.args[0]': null,
            'secondCall.args[0]': null,
            'thirdCall.args[0]': null
        });


        var firstRequestSize = testrun.request.getCall(0).args[3].size,
            secondRequestSize = testrun.request.getCall(1).args[3].size,
            thirdRequestSize = testrun.request.getCall(2).args[3].size,

            // raw request payload
            firstResponse = testrun.request.getCall(0).args[2].stream.toString(),
            secondResponse = testrun.request.getCall(1).args[2].stream.toString(),
            thirdResponse = testrun.request.getCall(2).args[2].stream.toString();

        expect(firstRequestSize.body).to.equal(0);
        expect(firstRequestSize.header).to.be.greaterThan(0);
        expect(firstRequestSize).to.deep.include({
            total: firstRequestSize.body + firstRequestSize.header
        });
        expect(Buffer.byteLength(firstResponse)).to.equal(firstRequestSize.total);

        expect(secondRequestSize.body).to.be.equal(7);
        expect(secondRequestSize.header).to.be.greaterThan(0);
        expect(secondRequestSize).to.deep.include({
            total: secondRequestSize.body + secondRequestSize.header
        });
        expect(Buffer.byteLength(secondResponse)).to.equal(secondRequestSize.total);

        expect(thirdRequestSize.body).to.be.equal(7 + Buffer.byteLength(unicode));
        expect(thirdRequestSize.header).to.be.greaterThan(0);
        expect(thirdRequestSize).to.deep.include({
            total: thirdRequestSize.body + thirdRequestSize.header
        });
        expect(Buffer.byteLength(thirdResponse)).to.equal(thirdRequestSize.total);
    });

    it('should have completed the run', function() {
        expect(testrun).to.be.ok;
        expect(testrun.done.getCall(0).args[0]).to.be.null;
        expect(testrun).to.nested.include({
            'done.calledOnce': true,
            'start.calledOnce': true
        });
    });
});
