var fs = require('fs'),
    sinon = require('sinon');

describe('file upload success', function () {
    var testrun;

    describe('body.mode: formdata & file', function () {
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

    describe('custom file resolver: null stats', function () {
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
});
