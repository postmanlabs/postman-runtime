describe('Set next request', function() {
    var _ = require('lodash'),
        testrun;

    before(function(done) {
        this.run({
            collection: {
                item: [{
                    name: 'post',
                    event: [{
                        listen: 'test',
                        script: {
                            type: 'text/javascript',
                            exec: [
                                'postman.setEnvironmentVariable("method", "get");',
                                'postman.setEnvironmentVariable("count", "1");',
                                'postman.setNextRequest("method");'
                            ]
                        }
                    }],
                    request: {
                        url: 'https://postman-echo.com/post',
                        method: 'POST'
                    }
                }, {
                    event: [{
                        listen: 'test',
                        script: {
                            exec: [
                                'var count = _.parseInt(postman.getEnvironmentVariable("count"));',
                                'count++;',
                                'postman.setEnvironmentVariable("count", String(count));',
                                'if (responseCode.code === 200) {',
                                '    postman.setEnvironmentVariable("method", "headers");',
                                '    postman.setNextRequest("method");',
                                '}'
                            ]
                        }
                    }],
                    request: {
                        url: 'https://postman-echo.com/type/html',
                        method: 'GET'
                    }
                }, {
                    name: 'method',
                    event: [{
                        listen: 'test',
                        script: {
                            exec: [
                                'var jsonData = JSON.parse(responseBody);',
                                'var count = _.parseInt(postman.getEnvironmentVariable("count"));',
                                'count++;',
                                'postman.setEnvironmentVariable("count", String(count));',
                                'if (jsonData.url === "https://postman-echo.com/get") {',
                                '    postman.setNextRequest("html");',
                                '}',
                                'else if (!jsonData.url && jsonData.headers) {',
                                'tests["Success"] = _.parseInt(postman.getEnvironmentVariable("count")) === 4',
                                '    postman.setNextRequest(null);',
                                '}'
                            ]
                        }
                    }],
                    request: {
                        url: 'https://postman-echo.com/{{method}}',
                        method: 'GET'
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
        expect(testrun.test.calledTwice).be.ok();

        expect(testrun.test.getCall(0).args[0]).to.be(null);
        expect(_.get(testrun.test.getCall(0).args[2], '0.result.globals.tests')).to.eql({});

        expect(testrun.test.getCall(1).args[0]).to.be(null);
        expect(_.get(testrun.test.getCall(1).args[2], '0.result.globals.tests')).to.eql({});
    });

    it('must have completed the run', function() {
        expect(testrun).be.ok();
        expect(testrun.done.calledOnce).be.ok();
        expect(testrun.done.getCall(0).args[0]).to.be(null);
        expect(testrun.start.calledOnce).be.ok();
    });
});
