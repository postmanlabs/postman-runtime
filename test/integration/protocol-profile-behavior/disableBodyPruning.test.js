var net = require('net'),
    sinon = require('sinon'),
    expect = require('chai').expect,
    enableServerDestroy = require('server-destroy');

describe('protocolProfileBehavior', function () {
    var server,
        testrun,
        rawRequest,
        PORT = 5050,
        URL = 'http://localhost:' + PORT;

    before(function (done) {
        // Echo raw request message to handle body for http methods (GET, HEAD)
        // Node's `http` server won't parse body for GET method.
        server = net.createServer(function (socket) {
            socket.on('data', function (chunk) {
                rawRequest = chunk.toString(); // Request Message: [POSTMAN / HTTP/1.1 ...]
                socket.write('HTTP/1.1 200 ok\r\n');
                socket.write('Content-Type: text/plain\r\n\r\n');

                // Respond with raw request message.
                //
                // @note http-parser will blow up if body is sent for HEAD request.
                // RFC-7231: The HEAD method is identical to GET except that the
                //           server MUST NOT send a message body in the response.
                if (!rawRequest.startsWith('HEAD / HTTP/1.1')) {
                    socket.write(rawRequest);
                }

                socket.end();
            });
        }).listen(PORT, done);
        enableServerDestroy(server);
    });

    after(function (done) {
        server.destroy(done);
    });

    describe('with disableBodyPruning: true', function () {
        describe('HTTP GET', function () {
            before(function (done) {
                this.run({
                    collection: {
                        item: [{
                            request: {
                                url: URL,
                                method: 'GET',
                                body: {
                                    mode: 'raw',
                                    raw: 'foo=bar'
                                }
                            },
                            protocolProfileBehavior: {
                                disableBodyPruning: true
                            }
                        }]
                    }
                }, function (err, results) {
                    testrun = results;
                    done(err);
                });
            });

            after(function () {
                testrun = rawRequest = null;
            });

            it('should complete the run', function () {
                expect(testrun).to.be.ok;
                sinon.assert.calledOnce(testrun.start);
                sinon.assert.calledOnce(testrun.done);
                sinon.assert.calledWith(testrun.done.getCall(0), null);
            });

            it('should send body with GET method', function () {
                sinon.assert.calledOnce(testrun.request);
                sinon.assert.calledWith(testrun.request.getCall(0), null);

                sinon.assert.calledOnce(testrun.response);
                sinon.assert.calledWith(testrun.response.getCall(0), null);

                var response = testrun.request.getCall(0).args[2].stream.toString();

                expect(response).to.include('GET / HTTP/1.1')
                    .and.include('Content-Type: text/plain')
                    .and.include('content-length: 7')
                    .and.include('foo=bar');
            });
        });

        describe('HTTP HEAD', function () {
            before(function (done) {
                this.run({
                    collection: {
                        item: [{
                            request: {
                                url: URL,
                                method: 'HEAD',
                                body: {
                                    mode: 'raw',
                                    raw: 'foo=bar'
                                }
                            },
                            protocolProfileBehavior: {
                                disableBodyPruning: true
                            }
                        }]
                    }
                }, function (err, results) {
                    testrun = results;
                    done(err);
                });
            });

            after(function () {
                testrun = rawRequest = null;
            });

            it('should complete the run', function () {
                expect(testrun).to.be.ok;
                sinon.assert.calledOnce(testrun.start);
                sinon.assert.calledOnce(testrun.done);
                sinon.assert.calledWith(testrun.done.getCall(0), null);
            });

            it('should send body with HEAD method', function () {
                sinon.assert.calledOnce(testrun.request);
                sinon.assert.calledWith(testrun.request.getCall(0), null);

                sinon.assert.calledOnce(testrun.response);
                sinon.assert.calledWith(testrun.response.getCall(0), null);

                var response = rawRequest; // raw request message for this request

                expect(response).to.include('HEAD / HTTP/1.1')
                    .and.include('Content-Type: text/plain')
                    .and.include('content-length: 7')
                    .and.include('foo=bar');
            });
        });

        describe('HTTP POSTMAN', function () {
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
                            },
                            protocolProfileBehavior: {
                                disableBodyPruning: true
                            }
                        }]
                    }
                }, function (err, results) {
                    testrun = results;
                    done(err);
                });
            });

            after(function () {
                testrun = rawRequest = null;
            });

            it('should complete the run', function () {
                expect(testrun).to.be.ok;
                sinon.assert.calledOnce(testrun.start);
                sinon.assert.calledOnce(testrun.done);
                sinon.assert.calledWith(testrun.done.getCall(0), null);
            });

            it('should send body with custom method', function () {
                sinon.assert.calledOnce(testrun.request);
                sinon.assert.calledWith(testrun.request.getCall(0), null);

                sinon.assert.calledOnce(testrun.response);
                sinon.assert.calledWith(testrun.response.getCall(0), null);

                var response = testrun.request.getCall(0).args[2].stream.toString();

                expect(response).to.include('POSTMAN / HTTP/1.1')
                    .and.include('Content-Type: text/plain')
                    .and.include('content-length: 7')
                    .and.include('foo=bar');
            });
        });

        describe('HTTP GET + Inherit Protocol Profile Behavior', function () {
            before(function (done) {
                this.run({
                    collection: {
                        item: [{
                            item: [{
                                request: {
                                    url: URL,
                                    method: 'GET',
                                    body: {
                                        mode: 'raw',
                                        raw: 'foo=bar'
                                    }
                                }
                            }],
                            protocolProfileBehavior: {
                                disableBodyPruning: true
                            }
                        }],
                        protocolProfileBehavior: {
                            disableBodyPruning: false
                        }
                    }
                }, function (err, results) {
                    testrun = results;
                    done(err);
                });
            });

            after(function () {
                testrun = rawRequest = null;
            });

            it('should complete the run', function () {
                expect(testrun).to.be.ok;
                sinon.assert.calledOnce(testrun.start);
                sinon.assert.calledOnce(testrun.done);
                sinon.assert.calledWith(testrun.done.getCall(0), null);
            });

            it('should send body with GET method', function () {
                sinon.assert.calledOnce(testrun.request);
                sinon.assert.calledWith(testrun.request.getCall(0), null);

                sinon.assert.calledOnce(testrun.response);
                sinon.assert.calledWith(testrun.response.getCall(0), null);

                var response = testrun.request.getCall(0).args[2].stream.toString();

                expect(response).to.include('GET / HTTP/1.1')
                    .and.include('Content-Type: text/plain')
                    .and.include('content-length: 7')
                    .and.include('foo=bar');
            });
        });
    });

    describe('with disableBodyPruning: false', function () {
        describe('HTTP GET', function () {
            before(function (done) {
                this.run({
                    collection: {
                        item: [{
                            request: {
                                url: URL,
                                method: 'GET',
                                body: {
                                    mode: 'raw',
                                    raw: 'foo=bar'
                                }
                            },
                            protocolProfileBehavior: {
                                disableBodyPruning: false
                            }
                        }]
                    }
                }, function (err, results) {
                    testrun = results;
                    done(err);
                });
            });

            after(function () {
                testrun = rawRequest = null;
            });

            it('should complete the run', function () {
                expect(testrun).to.be.ok;
                sinon.assert.calledOnce(testrun.start);
                sinon.assert.calledOnce(testrun.done);
                sinon.assert.calledWith(testrun.done.getCall(0), null);
            });

            it('should not send body with GET method', function () {
                sinon.assert.calledOnce(testrun.request);
                sinon.assert.calledWith(testrun.request.getCall(0), null);

                sinon.assert.calledOnce(testrun.response);
                sinon.assert.calledWith(testrun.response.getCall(0), null);

                var response = testrun.request.getCall(0).args[2].stream.toString();

                expect(response).to.include('GET / HTTP/1.1');
                expect(response).to.not.include('Content-Type');
                expect(response).to.not.include('foo=bar');
            });
        });

        describe('HTTP HEAD', function () {
            before(function (done) {
                this.run({
                    collection: {
                        item: [{
                            request: {
                                url: URL,
                                method: 'HEAD',
                                body: {
                                    mode: 'raw',
                                    raw: 'foo=bar'
                                }
                            },
                            protocolProfileBehavior: {
                                disableBodyPruning: false
                            }
                        }]
                    }
                }, function (err, results) {
                    testrun = results;
                    done(err);
                });
            });

            after(function () {
                testrun = rawRequest = null;
            });

            it('should complete the run', function () {
                expect(testrun).to.be.ok;
                sinon.assert.calledOnce(testrun.start);
                sinon.assert.calledOnce(testrun.done);
                sinon.assert.calledWith(testrun.done.getCall(0), null);
            });

            it('should not send body with HEAD method', function () {
                sinon.assert.calledOnce(testrun.request);
                sinon.assert.calledWith(testrun.request.getCall(0), null);

                sinon.assert.calledOnce(testrun.response);
                sinon.assert.calledWith(testrun.response.getCall(0), null);

                var response = rawRequest; // raw request message for this request

                expect(response).to.include('HEAD / HTTP/1.1');
                expect(response).to.not.include('Content-Type');
                expect(response).to.not.include('foo=bar');
            });
        });

        describe('HTTP POSTMAN', function () {
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
                            },
                            protocolProfileBehavior: {
                                disableBodyPruning: false
                            }
                        }]
                    }
                }, function (err, results) {
                    testrun = results;
                    done(err);
                });
            });

            after(function () {
                testrun = rawRequest = null;
            });

            it('should complete the run', function () {
                expect(testrun).to.be.ok;
                sinon.assert.calledOnce(testrun.start);
                sinon.assert.calledOnce(testrun.done);
                sinon.assert.calledWith(testrun.done.getCall(0), null);
            });

            it('should send body with custom method', function () {
                sinon.assert.calledOnce(testrun.request);
                sinon.assert.calledWith(testrun.request.getCall(0), null);

                sinon.assert.calledOnce(testrun.response);
                sinon.assert.calledWith(testrun.response.getCall(0), null);

                var response = testrun.request.getCall(0).args[2].stream.toString();

                expect(response).to.include('POSTMAN / HTTP/1.1')
                    .and.include('Content-Type: text/plain')
                    .and.include('content-length: 7')
                    .and.include('foo=bar');
            });
        });
    });

    describe('with disableBodyPruning: undefined', function () {
        describe('HTTP GET', function () {
            before(function (done) {
                this.run({
                    collection: {
                        item: [{
                            request: {
                                url: URL,
                                method: 'GET',
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

            after(function () {
                testrun = rawRequest = null;
            });

            it('should complete the run', function () {
                expect(testrun).to.be.ok;
                sinon.assert.calledOnce(testrun.start);
                sinon.assert.calledOnce(testrun.done);
                sinon.assert.calledWith(testrun.done.getCall(0), null);
            });

            it('should not send body by default for GET method', function () {
                sinon.assert.calledOnce(testrun.request);
                sinon.assert.calledWith(testrun.request.getCall(0), null);

                sinon.assert.calledOnce(testrun.response);
                sinon.assert.calledWith(testrun.response.getCall(0), null);

                var response = testrun.request.getCall(0).args[2].stream.toString();

                expect(response).to.include('GET / HTTP/1.1');
                expect(response).to.not.include('Content-Type');
                expect(response).to.not.include('foo=bar');
            });
        });

        describe('HTTP HEAD', function () {
            before(function (done) {
                this.run({
                    collection: {
                        item: [{
                            request: {
                                url: URL,
                                method: 'HEAD',
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

            after(function () {
                testrun = rawRequest = null;
            });

            it('should complete the run', function () {
                expect(testrun).to.be.ok;
                sinon.assert.calledOnce(testrun.start);
                sinon.assert.calledOnce(testrun.done);
                sinon.assert.calledWith(testrun.done.getCall(0), null);
            });

            it('should not send body by default for HEAD method', function () {
                sinon.assert.calledOnce(testrun.request);
                sinon.assert.calledWith(testrun.request.getCall(0), null);

                sinon.assert.calledOnce(testrun.response);
                sinon.assert.calledWith(testrun.response.getCall(0), null);

                var response = rawRequest; // raw request message for this request

                expect(response).to.include('HEAD / HTTP/1.1');
                expect(response).to.not.include('Content-Type');
                expect(response).to.not.include('foo=bar');
            });
        });

        describe('HTTP POSTMAN', function () {
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

            after(function () {
                testrun = rawRequest = null;
            });

            it('should complete the run', function () {
                expect(testrun).to.be.ok;
                sinon.assert.calledOnce(testrun.start);
                sinon.assert.calledOnce(testrun.done);
                sinon.assert.calledWith(testrun.done.getCall(0), null);
            });

            it('should send body with custom method', function () {
                sinon.assert.calledOnce(testrun.request);
                sinon.assert.calledWith(testrun.request.getCall(0), null);

                sinon.assert.calledOnce(testrun.response);
                sinon.assert.calledWith(testrun.response.getCall(0), null);

                var response = testrun.request.getCall(0).args[2].stream.toString();

                expect(response).to.include('POSTMAN / HTTP/1.1')
                    .and.include('Content-Type: text/plain')
                    .and.include('content-length: 7')
                    .and.include('foo=bar');
            });
        });
    });
});
