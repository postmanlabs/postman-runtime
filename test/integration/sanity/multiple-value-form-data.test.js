describe('Multiple valued form data', function() {
    var _ = require('lodash'),
        testrun;

    before(function(done) {
        this.run({
            collection: {
                item: [{
                    event: [{
                        listen: 'test',
                        script: {
                            exec: ['var data = JSON.parse(responseBody);',
                                'tests[\'multiple values for form variable\'] = data.args.hi.length === 2;']
                        }
                    }],
                    request: {
                        url: 'https://postman-echo.com/get?hi=hello&hi=lolol',
                        method: 'GET'
                    }
                }, {
                    event: [{
                        listen: 'test',
                        script: {
                            exec: ['var data = JSON.parse(responseBody);',
                                'tests[\'Can send empty urlencoded data\'] = responseCode.code===200;']
                        }
                    }],
                    request: {
                        url: 'https://postman-echo.com/post',
                        method: 'POST',
                        body: {
                            mode: 'urlencoded',
                            urlencoded: []
                        }
                    }
                }, {
                    event: [{
                        listen: 'test',
                        script: {
                            exec: ['var data = JSON.parse(responseBody);',
                                'tests[\'Can send empty params data\'] = responseCode.code===200;']
                        }
                    }],
                    request: {
                        url: 'https://postman-echo.com/post',
                        method: 'POST',
                        body: {
                            mode: 'formdata',
                            formdata: []
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
        expect(testrun.test.calledThrice).be.ok();

        expect(testrun.test.getCall(0).args[0]).to.be(null);
        expect(_.get(testrun.test.getCall(0).args[2], '0.result.globals.tests["multiple values for form variable"]')).to.be(true);

        expect(testrun.test.getCall(1).args[0]).to.be(null);
        expect(_.get(testrun.test.getCall(1).args[2], '0.result.globals.tests["Can send empty urlencoded data"]')).to.be(true);

        expect(testrun.test.getCall(2).args[0]).to.be(null);
        expect(_.get(testrun.test.getCall(2).args[2], '0.result.globals.tests["Can send empty params data"]')).to.be(true);
    });

    it('must have completed the run', function() {
        expect(testrun).be.ok();
        expect(testrun.done.calledOnce).be.ok();
        expect(testrun.done.getCall(0).args[0]).to.be(null);
        expect(testrun.start.calledOnce).be.ok();
    });
});
