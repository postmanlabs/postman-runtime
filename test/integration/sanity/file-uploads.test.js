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
                }]
            }
        }, function(err, results) {
            testrun = results;
            done(err);
        });
    });

    it('must have run the test script successfully', function() {
        expect(testrun).be.ok();
        expect(testrun.test.calledOnce).be.ok();

        expect(testrun.test.getCall(0).args[0]).to.be(null);
        expect(_.get(testrun.test.getCall(0).args[2], '0.result.tests["File contents are valid"]')).to.be(true);
    });

    it('must have completed the run', function() {
        expect(testrun).be.ok();
        expect(testrun.done.calledOnce).be.ok();
        expect(testrun.done.getCall(0).args[0]).to.be(null);
        expect(testrun.start.calledOnce).be.ok();
    });
});
