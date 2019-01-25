var fs = require('fs'),
    sinon = require('sinon'),
    expect = require('chai').expect,
    server = require('../../fixtures/server');

describe('http methods', function () {
    var testrun,
        PORT = 5050,
        URL = 'http://localhost:' + PORT,
        echoServer = server.createRawEchoServer();

    before(function (done) {
        // Echo raw request message to handle custom http methods
        echoServer.listen(PORT, done);
    });

    after(function (done) {
        echoServer.destroy(done);
    });

    describe('standard (GET)', function () {
        before(function (done) {
            this.run({
                collection: {
                    item: [{
                        request: {
                            url: URL,
                            method: 'GET',
                            header: [{key: 'Connection', value: 'close'}]
                        }
                    }]
                }
            }, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        it('should complete the run', function () {
            expect(testrun).to.be.ok;
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
            expect(response).to.include('GET / HTTP/1.1');
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
            expect(testrun).to.be.ok;
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
            expect(response).to.include('POSTMAN / HTTP/1.1');
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
                    expect(testrun).to.be.ok;
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
                    expect(response).to.include('Content-Type: text/plain');
                    expect(response).to.include('foo=bar');
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
                    expect(testrun).to.be.ok;
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
                    expect(response).to.include('content-type: application/x-www-form-urlencoded');
                    expect(response).to.include('foo=bar');
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
                    expect(testrun).to.be.ok;
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
                    expect(response).to.include('content-type: multipart/form-data');
                    expect(response).to.include('name="foo"\r\n\r\nbar');
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
                    expect(testrun).to.be.ok;
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
                    expect(response).to.include('Content-Type: text/plain');
                    expect(response).to.include('{\n\t"key1":"value1",\n\t"key2": 2\n}\n');
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
            expect(testrun).to.be.ok;
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
            expect(response).to.include('GET / HTTP/1.1');
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
            expect(testrun).to.be.ok;
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
            expect(response).to.include('12345 / HTTP/1.1');
        });
    });
});
