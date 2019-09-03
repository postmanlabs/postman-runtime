var fs = require('fs'),
    expect = require('chai').expect,
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
                                mode: 'formdata',
                                formdata: [{
                                    key: 'file',
                                    src: ['test/fixtures/upload-file.json', 'test/fixtures/upload-csv.json'],
                                    type: 'file'
                                }]
                            }
                        }
                    }, {
                        request: {
                            url: 'https://postman-echo.com/post',
                            method: 'POST',
                            body: {
                                mode: 'formdata',
                                formdata: [{
                                    key: 'file',
                                    src: ['test/fixtures/upload-file.json'],
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
            expect(testrun).to.be.ok;
            sinon.assert.calledOnce(testrun.start);
            sinon.assert.calledOnce(testrun.done);
            sinon.assert.calledWith(testrun.done.getCall(0), null);
            sinon.assert.callCount(testrun.request, 4);
        });

        it('should upload the single file in formdata mode correctly', function () {
            sinon.assert.calledWith(testrun.request.getCall(0), null);

            var resp = JSON.parse(testrun.response.getCall(0).args[2].stream.toString());

            expect(resp.files).to.have.property('upload-file.json');
            expect(resp).to.nested.include({
                'headers.content-length': '253'
            });
            expect(resp.headers['content-type']).to.match(/multipart\/form-data/);
        });

        it('should upload the multiple files in formdata mode correctly', function () {
            sinon.assert.calledWith(testrun.request.getCall(1), null);

            var resp = JSON.parse(testrun.response.getCall(1).args[2].stream.toString());

            expect(resp.files).to.have.property('upload-file.json');
            expect(resp.files).to.have.property('upload-csv.json');

            expect(resp).to.nested.include({
                'headers.content-length': '437'
            });
            expect(resp.headers['content-type']).to.match(/multipart\/form-data/);
        });

        it('should upload the single file in multi src param with formdata mode correctly', function () {
            sinon.assert.calledWith(testrun.request.getCall(2), null);

            var resp = JSON.parse(testrun.response.getCall(2).args[2].stream.toString());

            expect(resp.files).to.have.property('upload-file.json');
            expect(resp).to.nested.include({
                'headers.content-length': '253'
            });
            expect(resp.headers['content-type']).to.match(/multipart\/form-data/);
        });

        it('should upload the files in binary mode correctly', function () {
            sinon.assert.calledWith(testrun.request.getCall(3), null);

            var resp = JSON.parse(testrun.response.getCall(3).args[2].stream.toString());

            expect(resp.data).to.be.eql({key1: 'value1', key2: 2});
            expect(resp).to.nested.include({
                'headers.content-length': '33'
            });
            expect(resp.headers['content-type']).to.equal('application/json');
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
                            body: {
                                mode: 'formdata',
                                formdata: [{key: 'userData', type: 'file', src: []}]
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
            expect(testrun).to.be.ok;
            sinon.assert.calledOnce(testrun.start);
            sinon.assert.calledOnce(testrun.done);
            sinon.assert.calledWith(testrun.done.getCall(0), null);
            sinon.assert.calledThrice(testrun.request);
        });

        it('should warn for missing src in formdata mode', function () {
            sinon.assert.calledWith(testrun.request.getCall(0), null);

            expect(testrun.console.getCall(0).args[1]).to.equal('warn');
            expect(testrun.console.getCall(0).args[2])
                .to.equal('Form param `userData`, file load error: missing file source');
        });

        it('should warn for missing src in multi src param with formdata mode', function () {
            sinon.assert.calledWith(testrun.request.getCall(0), null);

            expect(testrun.console.getCall(1).args[1]).to.equal('warn');
            expect(testrun.console.getCall(1).args[2])
                .to.equal('Form param `userData`, file load error: missing file source');
        });

        it('should warn for missing src in binary mode', function () {
            sinon.assert.calledWith(testrun.request.getCall(2), null);

            expect(testrun.console.getCall(2).args[1]).to.equal('warn');
            expect(testrun.console.getCall(2).args[2])
                .to.equal('Binary file load error: invalid or missing file source');
        });
    });

    describe('with body.disabled', function () {
        describe('true', function () {
            before(function (done) {
                this.run({
                    fileResolver: fs,
                    collection: {
                        item: [{
                            request: {
                                url: 'https://postman-echo.com/post',
                                method: 'POST',
                                body: {
                                    disabled: true,
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

            it('should not load file', function () {
                sinon.assert.calledOnce(testrun.request);
                sinon.assert.calledWith(testrun.request.getCall(0), null);

                var req = testrun.request.getCall(0).args[3],
                    resp = JSON.parse(testrun.response.getCall(0).args[2].stream.toString());

                // make sure file is not loaded if body is disabled
                expect(req).to.nested.include({
                    'body.disabled': true
                });
                expect(req.body.file).to.not.have.property('content');

                expect(resp).to.deep.nested.include({
                    'headers.content-length': '0',
                    data: {}
                });
            });
        });

        describe('false', function () {
            before(function (done) {
                this.run({
                    fileResolver: fs,
                    collection: {
                        item: [{
                            request: {
                                url: 'https://postman-echo.com/post',
                                method: 'POST',
                                body: {
                                    disabled: false,
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

            it('should upload the file correctly', function () {
                sinon.assert.calledOnce(testrun.request);
                sinon.assert.calledWith(testrun.request.getCall(0), null);

                var req = testrun.request.getCall(0).args[3],
                    resp = JSON.parse(testrun.response.getCall(0).args[2].stream.toString());

                // make sure file is loaded
                expect(req).to.nested.include({
                    'body.disabled': false
                });
                expect(req.body.file).to.have.property('content');
                expect(resp.headers['content-type']).to.equal('application/json');
                expect(resp.data).to.be.eql({key1: 'value1', key2: 2});
            });
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
            expect(testrun).to.be.ok;
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
                                mode: 'formdata',
                                formdata: [{
                                    key: 'userData',
                                    src: ['randomFile', 'test/fixtures/upload-csv.json'],
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
            expect(testrun).to.be.ok;
            sinon.assert.calledOnce(testrun.start);
            sinon.assert.calledOnce(testrun.done);
            sinon.assert.calledWith(testrun.done.getCall(0), null);
            sinon.assert.calledThrice(testrun.request);
        });

        it('should warn for missing file in formdata mode', function () {
            expect(testrun.console.getCall(0).args[1]).to.equal('warn');
            expect(testrun.console.getCall(0).args[2])
                .to.equal('Form param `userData`, file load error: "randomFile", no such file');
        });

        it('should warn for one of missing file in multi src param with formdata mode', function () {
            expect(testrun.console.getCall(1).args[1]).to.equal('warn');
            expect(testrun.console.getCall(1).args[2])
                .to.equal('Form param `userData`, file load error: "randomFile", no such file');
        });

        it('should upload the other file in multi src param with formdata mode correctly', function () {
            var resp = JSON.parse(testrun.response.getCall(1).args[2].stream.toString());

            expect(resp.files).to.have.property('upload-csv.json');
            expect(resp).to.nested.include({
                'headers.content-length': '244'
            });
            expect(resp.headers['content-type']).to.match(/multipart\/form-data/);
        });

        it('should warn for missing file in binary mode', function () {
            expect(testrun.console.getCall(2).args[1]).to.equal('warn');
            expect(testrun.console.getCall(2).args[2])
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
            expect(testrun).to.be.ok;
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
            expect(testrun).to.be.ok;
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
            expect(testrun).to.be.ok;
            sinon.assert.calledOnce(testrun.start);
            sinon.assert.calledOnce(testrun.done);
            sinon.assert.calledWith(testrun.done.getCall(0), null);
        });

        it('should upload the file correctly', function () {
            sinon.assert.calledOnce(testrun.request);
            sinon.assert.calledWith(testrun.request.getCall(0), null);

            var resp = JSON.parse(testrun.response.getCall(0).args[2].stream.toString());

            expect(resp.files).to.have.property('upload-file.json');
            expect(resp).to.deep.nested.include({
                'headers.content-length': '253'
            });
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
            expect(testrun).to.be.ok;
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
            expect(testrun).to.be.ok;
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
