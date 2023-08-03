var fs = require('fs'),
    expect = require('chai').expect;

(typeof window === 'undefined' ? describe : describe.skip)('File uploads', function () {
    var testrun,
        HOST = 'https://postman-echo.com/post';

    before(function (done) {
        this.run({
            fileResolver: fs,
            collection: {
                item: [{
                    request: {
                        url: HOST,
                        method: 'POST',
                        body: {
                            mode: 'formdata',
                            formdata: [{
                                key: 'file',
                                src: 'test/fixtures/upload-file.json',
                                value: '-- will be ignored --',
                                type: 'file'
                            }, {
                                key: 'custom-name',
                                src: 'test/fixtures/upload-file.json',
                                fileName: 'custom-name.json',
                                type: 'file'
                            }, {
                                key: 'base64',
                                value: Buffer.from('hello world').toString('base64'),
                                fileName: 'from-base64.txt',
                                type: 'file'
                            }, {
                                key: 'text',
                                value: 'hello world',
                                fileName: 'text.txt',
                                type: 'text'
                            }]
                        }
                    },
                    event: [{
                        listen: 'prerequest',
                        script: {
                            exec: `
                            pm.request.body.formdata.add({
                                key: "script",
                                value: Buffer.from('hello world').toString('base64'),
                                fileName: 'from-script.txt',
                                type: 'file'
                            });
                            `
                        }
                    }]
                }, {
                    request: {
                        url: HOST,
                        method: 'POST',
                        header: [{
                            key: 'Content-Type',
                            value: 'application/octet-stream'
                        }],
                        body: {
                            mode: 'file',
                            file: {
                                src: 'test/fixtures/upload-file.json',
                                content: '-- will be ignored --'
                            }
                        }
                    }
                }, {
                    request: {
                        url: HOST,
                        method: 'POST',
                        body: {
                            mode: 'file',
                            file: {
                                content: Buffer.from('hello world').toString('base64')
                            }
                        }
                    }
                }, {
                    request: {
                        url: HOST,
                        method: 'POST'
                    },
                    event: [{
                        listen: 'prerequest',
                        script: {
                            exec: `
                            pm.request.body = {
                                mode: 'file',
                                file: {
                                    content: Buffer.from('hello world').toString('base64')
                                }
                            };

                            pm.request.headers.add({
                                key: 'Content-Type',
                                value: 'application/octet-stream'
                            });
                            `
                        }
                    }]
                }]
            }
        }, function (err, results) {
            testrun = results;
            done(err);
        });
    });

    it('should have completed the run', function () {
        expect(testrun.done.getCall(0).args[0]).to.be.null;
        expect(testrun).to.nested.include({
            'done.calledOnce': true,
            'start.calledOnce': true
        });
        expect(testrun).to.nested.include({ 'request.callCount': 4 });
        expect(testrun).to.nested.include({ 'response.callCount': 4 });
    });

    it('should upload the files in formdata mode correctly', function () {
        var response = testrun.response.getCall(0).args[2],
            files = response.json().files,
            filePrefix = 'data:application/octet-stream;base64,',
            fileContent = fs.readFileSync('test/fixtures/upload-file.json').toString('base64'),
            bufferContent = Buffer.from('hello world').toString('base64');

        expect(files).to.have.property('upload-file.json', filePrefix + fileContent);
        expect(files).to.have.property('custom-name.json', filePrefix + fileContent);
        expect(files).to.have.property('from-base64.txt', filePrefix + bufferContent);
        expect(files).to.have.property('text.txt', filePrefix + bufferContent);
        expect(files).to.have.property('from-script.txt', filePrefix + bufferContent);
    });

    it('should upload the files in file mode correctly', function () {
        var response = testrun.response.getCall(1).args[2],
            uploadedContent = Buffer.from(response.json().data.data).toString('base64'),
            fileContent = fs.readFileSync('test/fixtures/upload-file.json').toString('base64'),
            bufferContent = Buffer.from('hello world').toString('base64');

        // from file.src
        expect(uploadedContent).to.equal(fileContent);

        // from file.content
        response = testrun.response.getCall(2).args[2];
        expect(response.json()).to.have.property('data', 'hello world');

        // from script
        response = testrun.response.getCall(3).args[2];
        uploadedContent = Buffer.from(response.json().data.data).toString('base64');
        expect(uploadedContent).to.equal(bufferContent);
    });
});
