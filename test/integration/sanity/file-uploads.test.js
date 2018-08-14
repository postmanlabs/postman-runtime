var fs = require('fs'),
    _ = require('lodash'),
    sinon = require('sinon');

describe('File uploads', function () {
    var testrun;

    describe('upload successful', function () {
        before(function (done) {
            this.run({
                fileResolver: fs,
                collection: {
                    item: [{
                        event: [{
                            listen: 'test',
                            script: {
                                exec: [
                                    'var file = JSON.parse(responseBody).files[\'upload-file.json\'];',
                                    // eslint-disable-next-line max-len
                                    'tests[\'File contents are valid\'] = _.startsWith(file, \'data:application/octet-stream;base64,\');'
                                ]
                            }
                        }],
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

        it('should run the test script successfully', function () {
            var assertions = testrun.assertion.getCall(0).args[1];
            sinon.assert.calledTwice(testrun.test);
            sinon.assert.calledWith(testrun.test.getCall(0), null);
            expect(assertions[0]).to.have.property('name', 'File contents are valid');
            expect(assertions[0]).to.have.property('passed', true);
        });

        it('should upload the files in binary and formdata mode correctly', function () {
            sinon.assert.calledTwice(testrun.request);

            sinon.assert.calledWith(testrun.request.getCall(0), null);
            expect(_.find(testrun.request.getCall(0).args[3].headers.members, {key: 'content-length'}))
                .to.have.property('value', 253);

            sinon.assert.calledWith(testrun.request.getCall(1), null);
            expect(_.find(testrun.request.getCall(1).args[3].headers.members, {key: 'content-length'}))
                .to.have.property('value', 33);
        });
    });

    describe('upload errors', function () {
        describe('missing src', function () {
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
                                    file: {}
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

            it('should handle missing src in binary and formdata mode correctly', function () {
                sinon.assert.calledTwice(testrun.request);

                // should log warning for missing file src.
                expect(testrun.console.getCall(0).args[1]).to.equal('warn');
                expect(testrun.console.getCall(0).args[2])
                    .to.equal('Form param \'userData\', file load error: Missing file source');

                expect(testrun.console.getCall(1).args[1]).to.equal('warn');
                expect(testrun.console.getCall(1).args[2]).to.equal('Raw file load error: Missing file source');

                // should complete the request.
                sinon.assert.calledWith(testrun.request.getCall(0), null);
                sinon.assert.calledWith(testrun.request.getCall(1), null);
            });
        });

        describe('missing file', function () {
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

            // @todo handle this for binary mode also.
            it('should handle missing file in formdata mode correctly', function () {
                // bails out when error thrown in first request.
                sinon.assert.calledOnce(testrun.request);

                // should log warning for missing file src.
                expect(testrun.console.getCall(0).args[1]).to.equal('warn');
                expect(testrun.console.getCall(0).args[2])
                    .to.equal('Form param \'userData\', file load error: ' +
                        'ENOENT: no such file or directory, stat \'randomFile\'');
            });
        });

        describe('disabled param', function () {
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

            it('should handle disabled param in formdata mode correctly', function () {
                sinon.assert.calledOnce(testrun.request);

                // should complete the request without any error.
                sinon.assert.calledWith(testrun.request.getCall(0), null);
            });
        });
    });
});
