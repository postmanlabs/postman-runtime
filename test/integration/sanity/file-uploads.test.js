describe('File uploads', function() {
    var fs = require('fs'),
        _ = require('lodash'),
        testrun;

    before(function(done) {
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
                            formdata: [{key: 'file', src: 'test/fixtures/upload-file.json', type: 'file'}]
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
        }, function(err, results) {
            testrun = results;
            done(err);
        });
    });

    it('must have run the test script successfully', function() {
        var assertions = testrun.assertion.getCall(0).args[1];

        expect(testrun).be.ok();
        expect(testrun.test.calledTwice).be.ok();

        expect(testrun.test.getCall(0).args[0]).to.be(null);
        expect(assertions[0]).to.have.property('name', 'File contents are valid');
        expect(assertions[0]).to.have.property('passed', true);
    });

    it('must have completed the run', function() {
        expect(testrun).be.ok();
        expect(testrun.done.calledOnce).be.ok();
        expect(testrun.done.getCall(0).args[0]).to.be(null);
        expect(testrun.start.calledOnce).be.ok();
    });

    it('must have uploaded the files in binary and formdata mode correctly', function() {
        expect(testrun).be.ok();
        expect(testrun.request.calledTwice).to.be.ok();

        expect(testrun.request.getCall(0).args[0]).to.be(null);
        expect(_.find(testrun.request.getCall(0).args[3].headers.members, {key: 'content-length'})).to.have
            .property('value', 253);

        expect(testrun.request.getCall(1).args[0]).to.be(null);
        expect(_.find(testrun.request.getCall(1).args[3].headers.members, {key: 'content-length'})).to.have
            .property('value', 33);
    });
});
