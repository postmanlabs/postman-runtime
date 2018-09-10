var fs = require('fs'),
    net = require('net'),
    sinon = require('sinon');

describe('http methods', function () {
    var server,
        testrun,
        PORT = 5050,
        URL = 'http://localhost:' + PORT;

    before(function (done) {
        // Echo raw request message to handle custom http methods
        // Node's `http` server won't support custom methods
        // https://github.com/nodejs/http-parser/blob/master/http_parser.h#L163
        server = net.createServer(function (socket) {
            socket.on('data', function (chunk) {
                var raw = chunk.toString(); // Request Message: [POSTMAN / HTTP/1.1 ...]
                socket.write('HTTP/1.1 200 ok\r\n');
                socket.write('Content-Type: text/plain\r\n\r\n');
                socket.write(raw); // respond with raw request message
                socket.end();
            });
        }).listen(PORT, done);
    });

    after(function (done) {
        server.close(done);
    });

    describe('standard (GET)', function () {
        before(function (done) {
            this.run({
                collection: {
                    item: [{
                        request: {
                            url: URL,
                            method: 'GET'
                        }
                    }]
                }
            }, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        it('should complete the run', function () {
            expect(testrun).be.ok();
            sinon.assert.calledOnce(testrun.start);
            sinon.assert.calledOnce(testrun.done);
            sinon.assert.calledWith(testrun.done.getCall(0), null);
        });

        it('should handle standard http method correctly', function () {
            sinon.assert.calledOnce(testrun.request);
            sinon.assert.calledWith(testrun.request.getCall(0), null);

            sinon.assert.calledOnce(testrun.response);
            sinon.assert.calledWith(testrun.response.getCall(0), null);

            var request = testrun.request.getCall(0).args[3],
                response = testrun.request.getCall(0).args[2].stream.toString();

            // method sent to server in request
            expect(request).to.have.property('method', 'GET');

            // method received at server
            expect(response).to.contain('GET / HTTP/1.1');
        });
    });

    describe('custom (POSTMAN)', function () {
        before(function (done) {
            this.run({
                collection: {
                    item: [{
                        request: {
                            url: URL,
                            method: 'POSTMAN'
                        }
                    }]
                }
            }, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        it('should complete the run', function () {
            expect(testrun).be.ok();
            sinon.assert.calledOnce(testrun.start);
            sinon.assert.calledOnce(testrun.done);
            sinon.assert.calledWith(testrun.done.getCall(0), null);
        });

        it('should handle custom http method correctly', function () {
            sinon.assert.calledOnce(testrun.request);
            sinon.assert.calledWith(testrun.request.getCall(0), null);

            sinon.assert.calledOnce(testrun.response);
            sinon.assert.calledWith(testrun.response.getCall(0), null);

            var request = testrun.request.getCall(0).args[3],
                response = testrun.request.getCall(0).args[2].stream.toString();

            // method sent to server in request
            expect(request).to.have.property('method', 'POSTMAN');

            // method received at server
            expect(response).to.contain('POSTMAN / HTTP/1.1');
        });

        describe('with request body', function () {
            describe('raw', function () {
                before(function (done) {
                    this.run({
                        collection: {
                            item: [{
                                request: {
                                    url: URL,
                                    method: 'POSTMAN',
                                    body: {
                                        mode: 'raw',
                                        raw: 'foo=bar'
                                    }
                                }
                            }]
                        }
                    }, function (err, results) {
                        testrun = results;
                        done(err);
                    });
                });

                it('should complete the run', function () {
                    expect(testrun).be.ok();
                    sinon.assert.calledOnce(testrun.start);
                    sinon.assert.calledOnce(testrun.done);
                    sinon.assert.calledWith(testrun.done.getCall(0), null);
                });

                it('should handle raw mode correctly', function () {
                    sinon.assert.calledOnce(testrun.request);
                    sinon.assert.calledWith(testrun.request.getCall(0), null);

                    sinon.assert.calledOnce(testrun.response);
                    sinon.assert.calledWith(testrun.response.getCall(0), null);

                    var request = testrun.request.getCall(0).args[3],
                        response = testrun.request.getCall(0).args[2].stream.toString();

                    // method sent to server in request
                    expect(request).to.have.property('method', 'POSTMAN');

                    // response received at server
                    expect(response).to.contain('Content-Type: text/plain');
                    expect(response).to.contain('foo=bar');
                });
            });

            describe('urlencoded', function () {
                before(function (done) {
                    this.run({
                        collection: {
                            item: [{
                                request: {
                                    url: URL,
                                    method: 'POSTMAN',
                                    body: {
                                        mode: 'urlencoded',
                                        urlencoded: [{
                                            key: 'foo',
                                            value: 'bar'
                                        }]
                                    }
                                }
                            }]
                        }
                    }, function (err, results) {
                        testrun = results;
                        done(err);
                    });
                });

                it('should complete the run', function () {
                    expect(testrun).be.ok();
                    sinon.assert.calledOnce(testrun.start);
                    sinon.assert.calledOnce(testrun.done);
                    sinon.assert.calledWith(testrun.done.getCall(0), null);
                });

                it('should handle urlencoded mode correctly', function () {
                    sinon.assert.calledOnce(testrun.request);
                    sinon.assert.calledWith(testrun.request.getCall(0), null);

                    sinon.assert.calledOnce(testrun.response);
                    sinon.assert.calledWith(testrun.response.getCall(0), null);

                    var request = testrun.request.getCall(0).args[3],
                        response = testrun.request.getCall(0).args[2].stream.toString();

                    // method sent to server in request
                    expect(request).to.have.property('method', 'POSTMAN');

                    // response received at server
                    expect(response).to.contain('content-type: application/x-www-form-urlencoded');
                    expect(response).to.contain('foo=bar');
                });
            });

            describe('formdata', function () {
                before(function (done) {
                    this.run({
                        collection: {
                            item: [{
                                request: {
                                    url: URL,
                                    method: 'POSTMAN',
                                    body: {
                                        mode: 'formdata',
                                        formdata: [{
                                            key: 'foo',
                                            value: 'bar'
                                        }]
                                    }
                                }
                            }]
                        }
                    }, function (err, results) {
                        testrun = results;
                        done(err);
                    });
                });

                it('should complete the run', function () {
                    expect(testrun).be.ok();
                    sinon.assert.calledOnce(testrun.start);
                    sinon.assert.calledOnce(testrun.done);
                    sinon.assert.calledWith(testrun.done.getCall(0), null);
                });

                it('should handle formdata mode correctly', function () {
                    sinon.assert.calledOnce(testrun.request);
                    sinon.assert.calledWith(testrun.request.getCall(0), null);

                    sinon.assert.calledOnce(testrun.response);
                    sinon.assert.calledWith(testrun.response.getCall(0), null);

                    var request = testrun.request.getCall(0).args[3],
                        response = testrun.request.getCall(0).args[2].stream.toString();

                    // method sent to server in request
                    expect(request).to.have.property('method', 'POSTMAN');

                    // response received at server
                    expect(response).to.contain('content-type: multipart/form-data');
                    expect(response).to.contain('name="foo"\r\n\r\nbar');
                });
            });

            describe('file', function () {
                before(function (done) {
                    this.run({
                        fileResolver: fs,
                        collection: {
                            item: [{
                                request: {
                                    url: URL,
                                    method: 'POSTMAN',
                                    body: {
                                        mode: 'file',
                                        file: {
                                            src: 'test/fixtures/upload-file.json'
                                        }
                                    }
                                }
                            }]
                        }
                    }, function (err, results) {
                        testrun = results;
                        done(err);
                    });
                });

                it('should complete the run', function () {
                    expect(testrun).be.ok();
                    sinon.assert.calledOnce(testrun.start);
                    sinon.assert.calledOnce(testrun.done);
                    sinon.assert.calledWith(testrun.done.getCall(0), null);
                });

                it('should handle file mode correctly', function () {
                    sinon.assert.calledOnce(testrun.request);
                    sinon.assert.calledWith(testrun.request.getCall(0), null);

                    sinon.assert.calledOnce(testrun.response);
                    sinon.assert.calledWith(testrun.response.getCall(0), null);

                    var request = testrun.request.getCall(0).args[3],
                        response = testrun.request.getCall(0).args[2].stream.toString();

                    // method sent to server in request
                    expect(request).to.have.property('method', 'POSTMAN');

                    // response received at server
                    expect(response).to.contain('Content-Type: text/plain');
                    expect(response).to.contain('{\n\t"key1":"value1",\n\t"key2": 2\n}\n');
                });
            });
        });
    });

    describe('missing', function () {
        before(function (done) {
            this.run({
                collection: {
                    item: [{
                        request: {url: URL}
                    }]
                }
            }, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        it('should complete the run', function () {
            expect(testrun).be.ok();
            sinon.assert.calledOnce(testrun.start);
            sinon.assert.calledOnce(testrun.done);
            sinon.assert.calledWith(testrun.done.getCall(0), null);
        });

        it('should defaults to GET method', function () {
            sinon.assert.calledOnce(testrun.request);
            sinon.assert.calledWith(testrun.request.getCall(0), null);

            sinon.assert.calledOnce(testrun.response);
            sinon.assert.calledWith(testrun.response.getCall(0), null);

            var request = testrun.request.getCall(0).args[3],
                response = testrun.request.getCall(0).args[2].stream.toString();

            // method sent to server in request
            expect(request).to.have.property('method', 'GET');

            // method received at server
            expect(response).to.contain('GET / HTTP/1.1');
        });
    });

    describe('non-string', function () {
        before(function (done) {
            this.run({
                collection: {
                    item: [{
                        request: {
                            url: URL,
                            method: 12345
                        }
                    }]
                }
            }, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        it('should complete the run', function () {
            expect(testrun).be.ok();
            sinon.assert.calledOnce(testrun.start);
            sinon.assert.calledOnce(testrun.done);
            sinon.assert.calledWith(testrun.done.getCall(0), null);
        });

        it('should handle non-string method correctly', function () {
            sinon.assert.calledOnce(testrun.request);
            sinon.assert.calledWith(testrun.request.getCall(0), null);

            sinon.assert.calledOnce(testrun.response);
            sinon.assert.calledWith(testrun.response.getCall(0), null);

            var request = testrun.request.getCall(0).args[3],
                response = testrun.request.getCall(0).args[2].stream.toString();

            // method sent to server in request
            expect(request).to.have.property('method', '12345');

            // method received at server
            expect(response).to.contain('12345 / HTTP/1.1');
        });
    });
});
