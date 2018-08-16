var fs = require('fs'),
    sinon = require('sinon');

describe('file upload in request body', function () {
    var testrun;

    describe('with mode formdata & file', function () {
        before(function (done) {
            this.run({
                fileResolver: fs,
                collection: {
                    item: [{
                        request: {
                            url: 'https://postman-echo.com/post',
                            method: 'POST',
                            body: {
                                mode: 'formdata',
                                formdata: [{
                                    key: 'file',
                                    src: 'test/fixtures/upload-file.json',
                                    type: 'file'
                                }]
                            }
                        }
                    }, {
                        request: {
                            url: 'https://postman-echo.com/post',
                            method: 'POST',
                            body: {
                                mode: 'file',
                                file: {src: 'test/fixtures/upload-file.json'}
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

        it('should upload the files in formdata mode correctly', function () {
            sinon.assert.calledTwice(testrun.request);
            sinon.assert.calledWith(testrun.request.getCall(0), null);

            var resp = JSON.parse(testrun.response.getCall(0).args[2].stream.toString());

            expect(resp.files).to.have.property('upload-file.json');
            expect(resp.headers).to.have.property('content-length', '253');
            expect(resp.headers['content-type']).to.match(/multipart\/form-data/);
        });

        it('should upload the files in binary mode correctly', function () {
            sinon.assert.calledWith(testrun.request.getCall(1), null);

            var resp = JSON.parse(testrun.response.getCall(1).args[2].stream.toString());

            expect(resp.data).to.equal('{\n\t"key1":"value1",\n\t"key2": 2\n}\n');
            expect(resp.headers).to.have.property('content-length', '33');
            expect(resp.headers['content-type']).to.equal('text/plain');
        });
    });

    describe('with missing `src` option', function () {
        before(function (done) {
            this.run({
                fileResolver: fs,
                collection: {
                    item: [{
                        request: {
                            url: 'https://postman-echo.com/post',
                            method: 'POST',
                            body: {
                                mode: 'formdata',
                                formdata: [{key: 'userData', type: 'file'}]
                            }
                        }
                    }, {
                        request: {
                            url: 'https://postman-echo.com/post',
                            method: 'POST',
                            body: {mode: 'file', file: {}}
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

        it('should warn for missing src in formdata mode', function () {
            sinon.assert.calledTwice(testrun.request);
            sinon.assert.calledWith(testrun.request.getCall(0), null);

            expect(testrun.console.getCall(0).args[1]).to.equal('warn');
            expect(testrun.console.getCall(0).args[2])
                .to.equal('Form param `userData`, file load error: invalid or missing file source');
        });

        it('should warn for missing src in binary mode', function () {
            sinon.assert.calledWith(testrun.request.getCall(1), null);

            expect(testrun.console.getCall(1).args[1]).to.equal('warn');
            expect(testrun.console.getCall(1).args[2])
                .to.equal('Binary file load error: invalid or missing file source');
        });
    });

    describe('with disabled param', function () {
        before(function (done) {
            this.run({
                fileResolver: fs,
                collection: {
                    item: [{
                        request: {
                            url: 'https://postman-echo.com/post',
                            method: 'POST',
                            body: {
                                mode: 'formdata',
                                formdata: [{
                                    key: 'userData',
                                    src: 'randomFile',
                                    type: 'file',
                                    disabled: true
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

        it('should not load disabled param file', function () {
            var response = testrun.response.getCall(0).args[2];

            sinon.assert.calledOnce(testrun.request);
            sinon.assert.calledWith(testrun.request.getCall(0), null);

            // make sure file is not loaded and sent.
            expect(testrun.request.getCall(0).args[3].body.formdata.members[0]).to.have.property('value', '');
            expect(JSON.parse(response.stream.toString()).files).to.eql({});
        });
    });

    describe('with missing file', function () {
        before(function (done) {
            this.run({
                fileResolver: fs,
                collection: {
                    item: [{
                        request: {
                            url: 'https://postman-echo.com/post',
                            method: 'POST',
                            body: {
                                mode: 'formdata',
                                formdata: [{
                                    key: 'userData',
                                    src: 'randomFile',
                                    type: 'file'
                                }]
                            }
                        }
                    }, {
                        request: {
                            url: 'https://postman-echo.com/post',
                            method: 'POST',
                            body: {
                                mode: 'file',
                                file: {src: 'randomFile'}
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

        it('should warn for missing file in formdata mode', function () {
            sinon.assert.calledTwice(testrun.request);

            expect(testrun.console.getCall(0).args[1]).to.equal('warn');
            expect(testrun.console.getCall(0).args[2])
                .to.equal('Form param `userData`, file load error: "randomFile", no such file');
        });

        it('should warn for missing file in binary mode', function () {
            expect(testrun.console.getCall(1).args[1]).to.equal('warn');
            expect(testrun.console.getCall(1).args[2])
                .to.equal('Binary file load error: "randomFile", no such file');
        });
    });

    describe('with src being a directory', function () {
        before(function (done) {
            this.run({
                fileResolver: fs,
                collection: {
                    item: [{
                        request: {
                            url: 'https://postman-echo.com/post',
                            method: 'POST',
                            body: {
                                mode: 'file',
                                file: {src: 'test/fixtures/'}
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

        it('should warn if file source is a directory', function () {
            sinon.assert.calledOnce(testrun.request);

            expect(testrun.console.getCall(0).args[1]).to.equal('warn');
            expect(testrun.console.getCall(0).args[2])
                .to.equal('Binary file load error: "test/fixtures/", is not a file');
        });
    });

    describe('with file permission denied', function () {
        before(function (done) {
            this.run({
                fileResolver: {
                    stat: function (src, cb) {
                        cb(null, {mode: 32896}); // mode: --w-------
                    },
                    createReadStream: fs.createReadStream
                },
                collection: {
                    item: [{
                        request: {
                            url: 'https://postman-echo.com/post',
                            method: 'POST',
                            body: {
                                mode: 'file',
                                file: {src: 'randomFile'}
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

        it('should warn for file permission denied', function () {
            sinon.assert.calledOnce(testrun.request);

            expect(testrun.console.getCall(0).args[1]).to.equal('warn');
            expect(testrun.console.getCall(0).args[2])
                .to.equal('Binary file load error: "randomFile", read permission denied');
        });
    });

    describe('with supported fileResolver', function () {
        before(function (done) {
            this.run({
                fileResolver: {
                    stat: function (src, cb) {
                        cb(null, null); // returns null stats
                    },
                    createReadStream: fs.createReadStream
                },
                collection: {
                    item: [{
                        request: {
                            url: 'https://postman-echo.com/post',
                            method: 'POST',
                            body: {
                                mode: 'formdata',
                                formdata: [{
                                    key: 'file',
                                    src: 'test/fixtures/upload-file.json',
                                    type: 'file'
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

        it('should upload the file correctly', function () {
            sinon.assert.calledOnce(testrun.request);
            sinon.assert.calledWith(testrun.request.getCall(0), null);

            var resp = JSON.parse(testrun.response.getCall(0).args[2].stream.toString());

            expect(resp.files).to.have.property('upload-file.json');
            expect(resp.headers).to.have.property('content-length', '253');
            expect(resp.headers['content-type']).to.match(/multipart\/form-data/);
        });
    });

    describe('with unsupported fileResolver', function () {
        before(function (done) {
            this.run({
                collection: {
                    item: [{
                        request: {
                            url: 'https://postman-echo.com/post',
                            method: 'POST',
                            body: {
                                mode: 'file',
                                file: {src: 'randomFile'}
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

        it('should warn for unsupported resolver', function () {
            sinon.assert.calledOnce(testrun.request);

            expect(testrun.console.getCall(0).args[1]).to.equal('warn');
            expect(testrun.console.getCall(0).args[2])
                .to.equal('Binary file load error: file resolver not supported');
        });
    });

    describe('with fileResolver having interface mismatch', function () {
        before(function (done) {
            this.run({
                fileResolver: {createReadStream: fs.createReadStream},
                collection: {
                    item: [{
                        request: {
                            url: 'https://postman-echo.com/post',
                            method: 'POST',
                            body: {
                                mode: 'file',
                                file: {src: 'randomFile'}
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

        it('should warn for interface mismatch', function () {
            sinon.assert.calledOnce(testrun.request);

            expect(testrun.console.getCall(0).args[1]).to.equal('warn');
            expect(testrun.console.getCall(0).args[2])
                .to.equal('Binary file load error: file resolver interface mismatch');
        });
    });
});
