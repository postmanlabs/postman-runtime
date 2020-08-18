var net = require('net'),
    expect = require('chai').expect,
    enableServerDestroy = require('server-destroy');

(typeof window === 'undefined' ? describe : describe.skip)('request size', function () {
    var server,
        testrun,
        POSTMAN = 'postman',
        UNICODE = '😎',
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
                        name: 'no user header',
                        request: URL
                    }, {
                        request: {
                            name: 'duplicate header + raw body',
                            url: URL,
                            method: 'POST',
                            header: [{
                                key: 'duplicate',
                                value: 'value0'
                            }, {
                                key: 'duplicate',
                                value: 'value1'
                            }],
                            body: {
                                mode: 'raw',
                                raw: POSTMAN
                            }
                        }
                    }, {
                        request: {
                            name: 'falsy header key + unicode char in body',
                            url: URL,
                            method: 'POST',
                            header: [{
                                key: 'disabled',
                                value: 'value0',
                                disabled: true
                            }, {
                                key: null,
                                value: 'value0'
                            }, {
                                key: 'Connection',
                                value: 'close'
                            }],
                            body: {
                                mode: 'raw',
                                raw: POSTMAN + UNICODE
                            }
                        }
                    }, {
                        request: {
                            name: 'unicode char in body',
                            url: URL,
                            method: 'POST',
                            body: {
                                mode: 'raw',
                                raw: UNICODE
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

    it('should have extracted request size correctly', function () {
        expect(testrun).to.be.ok;
        expect(testrun).to.nested.include({
            'request.callCount': 4
        });

        expect(testrun).to.have.property('request').that.nested.include({
            'firstCall.args[0]': null,
            'secondCall.args[0]': null,
            'thirdCall.args[0]': null
        });

        var firstRequestSize = testrun.request.getCall(0).args[3].size(),
            secondRequestSize = testrun.request.getCall(1).args[3].size(),
            thirdRequestSize = testrun.request.getCall(2).args[3].size(),
            fourthRequestSize = testrun.request.getCall(3).args[3].size(),

            // raw request payload
            firstRequestPayload = testrun.request.getCall(0).args[2].stream.toString(),
            secondRequestPayload = testrun.request.getCall(1).args[2].stream.toString(),
            thirdRequestPayload = testrun.request.getCall(2).args[2].stream.toString(),
            fourthRequestPayload = testrun.request.getCall(3).args[2].stream.toString();

        expect(firstRequestSize.body).to.equal(0);
        expect(firstRequestSize.header).to.be.greaterThan(0);
        expect(firstRequestSize.total).to.equal(firstRequestSize.body + firstRequestSize.header);
        expect(Buffer.byteLength(firstRequestPayload)).to.equal(firstRequestSize.total);

        expect(secondRequestSize.body).to.be.equal(POSTMAN.length);
        expect(secondRequestSize.header).to.be.greaterThan(0);
        expect(secondRequestSize.total).to.equal(secondRequestSize.body + secondRequestSize.header);
        expect(Buffer.byteLength(secondRequestPayload)).to.equal(secondRequestSize.total);

        expect(thirdRequestSize.body).to.be.equal(POSTMAN.length + Buffer.byteLength(UNICODE));
        expect(thirdRequestSize.header).to.be.greaterThan(0);
        expect(thirdRequestSize.total).to.equal(thirdRequestSize.body + thirdRequestSize.header);
        // @note "-10" because falsy headers(key = '') is not supported by NodeJS
        // but since its just a limitation of Node's HTTP parser, Collection SDK
        // still consider ": value0" header during header size calculation.
        expect(Buffer.byteLength(thirdRequestPayload)).to.equal(thirdRequestSize.total - 10);

        expect(fourthRequestSize.body).to.be.equal(Buffer.byteLength(UNICODE));
        expect(fourthRequestSize.header).to.be.greaterThan(0);
        expect(fourthRequestSize.total).to.equal(fourthRequestSize.body + fourthRequestSize.header);
        expect(Buffer.byteLength(fourthRequestPayload)).to.equal(fourthRequestSize.total);
    });

    it('should have completed the run', function () {
        expect(testrun).to.be.ok;
        expect(testrun.done.getCall(0).args[0]).to.be.null;
        expect(testrun).to.nested.include({
            'done.calledOnce': true,
            'start.calledOnce': true
        });
    });
});
