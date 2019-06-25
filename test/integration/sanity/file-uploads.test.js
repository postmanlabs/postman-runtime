var fs = require('fs'),
    _ = require('lodash'),
    expect = require('chai').expect,
    sinon = require('sinon');

describe('File uploads', function () {
    var testrun;

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
        expect(testrun).to.be.ok;
        sinon.assert.calledOnce(testrun.start);
        sinon.assert.calledOnce(testrun.done);
        sinon.assert.calledWith(testrun.done.getCall(0), null);
    });

    it('should run the test script successfully', function () {
        var assertions = testrun.assertion.getCall(0).args[1];

        sinon.assert.calledTwice(testrun.test);
        sinon.assert.calledWith(testrun.test.getCall(0), null);
        expect(assertions[0]).to.deep.include({
            name: 'File contents are valid',
            passed: true
        });
    });

    it('should upload the files in binary and formdata mode correctly', function () {
        sinon.assert.calledTwice(testrun.request);

        sinon.assert.calledWith(testrun.request.getCall(0), null);
        expect(_.find(testrun.request.getCall(0).args[3].headers.members, {key: 'Content-Length'}))
            .to.have.property('value', 253);

        sinon.assert.calledWith(testrun.request.getCall(1), null);
        expect(_.find(testrun.request.getCall(1).args[3].headers.members, {key: 'Content-Length'}))
            .to.have.property('value', 33);
    });
});
