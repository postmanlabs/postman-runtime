var fs = require('fs'),
    sinon = require('sinon');

describe('file upload failures', function () {
    var testrun;

    describe('missing src in formdata & file mode', function () {
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

        it('should handle missing src in formdata mode correctly', function () {
            sinon.assert.calledTwice(testrun.request);
            sinon.assert.calledWith(testrun.request.getCall(0), null);

            expect(testrun.console.getCall(0).args[1]).to.equal('warn');
            expect(testrun.console.getCall(0).args[2])
                .to.equal('Form param `userData`, file load error: invalid or missing file source');
        });

        it('should handle missing src in binary mode correctly', function () {
            sinon.assert.calledWith(testrun.request.getCall(1), null);

            expect(testrun.console.getCall(1).args[1]).to.equal('warn');
            expect(testrun.console.getCall(1).args[2])
                .to.equal('Binary file load error: invalid or missing file source');
        });
    });

    describe('missing file in formdata & file mode', function () {
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

        it('should handle missing file in formdata mode correctly', function () {
            sinon.assert.calledTwice(testrun.request);

            expect(testrun.console.getCall(0).args[1]).to.equal('warn');
            expect(testrun.console.getCall(0).args[2])
                .to.equal('Form param `userData`, file load error: "randomFile", no such file');
        });

        it('should handle missing file in binary mode correctly', function () {
            expect(testrun.console.getCall(1).args[1]).to.equal('warn');
            expect(testrun.console.getCall(1).args[2])
                .to.equal('Binary file load error: "randomFile", no such file');
        });
    });

    describe('disabled param in formdata mode', function () {
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

        it('should not load disabled param file in formdata mode', function () {
            var response = testrun.response.getCall(0).args[2];

            sinon.assert.calledOnce(testrun.request);
            sinon.assert.calledWith(testrun.request.getCall(0), null);

            // make sure file is not loaded and sent.
            expect(testrun.request.getCall(0).args[3].body.formdata.members[0]).to.have.property('value', '');
            expect(JSON.parse(response.stream.toString()).files).to.eql({});
        });
    });

    describe('uploading directory', function () {
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

        it('should handle uploading directory correctly', function () {
            sinon.assert.calledOnce(testrun.request);

            expect(testrun.console.getCall(0).args[1]).to.equal('warn');
            expect(testrun.console.getCall(0).args[2])
                .to.equal('Binary file load error: "test/fixtures/", is not a file');
        });
    });

    describe('permission denied', function () {
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

        it('should handle permission denied file correctly', function () {
            sinon.assert.calledOnce(testrun.request);

            expect(testrun.console.getCall(0).args[1]).to.equal('warn');
            expect(testrun.console.getCall(0).args[2])
                .to.equal('Binary file load error: "randomFile", read permission denied');
        });
    });

    describe('missing file resolver', function () {
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

        it('should handle missing file resolver correctly', function () {
            sinon.assert.calledOnce(testrun.request);

            expect(testrun.console.getCall(0).args[1]).to.equal('warn');
            expect(testrun.console.getCall(0).args[2])
                .to.equal('Binary file load error: file resolver not found');
        });
    });

    describe('invalid file resolver', function () {
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

        it('should handle invalid file resolver correctly', function () {
            sinon.assert.calledOnce(testrun.request);

            expect(testrun.console.getCall(0).args[1]).to.equal('warn');
            expect(testrun.console.getCall(0).args[2])
                .to.equal('Binary file load error: file resolver is not supported');
        });
    });
});
