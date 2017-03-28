describe('Slashed variables', function() {
    var _ = require('lodash'),
        testrun;

    before(function(done) {
        this.run({
            environment: {
                values: [{key: 'fo/o', type: 'text', value: 'alpha', enabled: true},
                    {key: 'b\\ar', type: 'text', value: 'beta', enabled: true}]
            },
            collection: {
                item: [{
                    event: [{
                        listen: 'test',
                        script: {
                            exec: [
                                'var args = JSON.parse(responseBody).args;',
                                'tests[\'Status code is 200\'] = responseCode.code === 200;',
                                'tests[\'Forward slash was handled correctly\'] = args[\'foo\'] === \'alpha\';',
                                'tests[\'Backslash was handled correctly\'] = args[\'bar\'] === \'beta\';'
                            ]
                        }
                    }],
                    request: {
                        url: 'https://postman-echo.com/get?foo={{fo/o}}&bar={{b\\ar}}',
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
        expect(testrun.test.calledOnce).be.ok();

        expect(testrun.test.getCall(0).args[0]).to.be(null);
        expect(_.get(testrun.test.getCall(0).args[2], '0.result.globals.tests')).to.eql({
            'Status code is 200': true,
            'Forward slash was handled correctly': true,
            'Backslash was handled correctly': true
        });
    });

    it('must have completed the run', function() {
        expect(testrun).be.ok();
        expect(testrun.done.calledOnce).be.ok();
        expect(testrun.done.getCall(0).args[0]).to.be(null);
        expect(testrun.start.calledOnce).be.ok();
    });
});
