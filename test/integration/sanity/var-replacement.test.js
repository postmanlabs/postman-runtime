describe('Variable replacement', function() {
    var _ = require('lodash'),
        testrun;

    before(function(done) {
        this.run({
            collection: {
                item: [{
                    event: [{
                        listen: 'test',
                        script: {
                            exec: [
                                'var data = JSON.parse(responseBody);',
                                'tests[\'Variable substitution\'] = (data.args.var===\'replaced\');',
                                'tests[\'No blank variable substitution\'] = (data.args.novar===\'{{novar}}\');'
                            ]
                        }
                    }, {
                        listen: 'prerequest',
                        script: {exec: 'postman.setEnvironmentVariable(\'var\', \'replaced\');'}
                    }],
                    request: {
                        url: 'https://postman-echo.com/get?novar={{novar}}&var={{var}}',
                        method: 'GET',
                        body: {mode: 'formdata', formdata: []}
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
        expect(testrun.prerequest.calledOnce).be.ok();

        expect(testrun.test.getCall(0).args[0]).to.be(null);
        expect(_.get(testrun.test.getCall(0).args[2], '0.result.globals.tests')).to.eql({
            'Variable substitution': true,
            'No blank variable substitution': true
        });
    });

    it('must have completed the run', function() {
        expect(testrun).be.ok();
        expect(testrun.done.calledOnce).be.ok();
        expect(testrun.done.getCall(0).args[0]).to.be(null);
        expect(testrun.start.calledOnce).be.ok();
    });
});
