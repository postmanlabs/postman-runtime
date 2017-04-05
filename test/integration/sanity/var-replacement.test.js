describe('variable replacement', function() {
    var testrun;

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

    it('must have sent the request successfully', function() {
        expect(testrun).be.ok();
        expect(testrun.test.calledOnce).be.ok();
        expect(testrun.prerequest.calledOnce).be.ok();
        expect(testrun.request.calledOnce).be.ok();

        expect(testrun.request.getCall(0).args[0]).to.be(null);
    });

    it('must have substituted the available variable correctly', function () {
        var response = testrun.request.getCall(0).args[2],
            args = response.json().args;

        expect(args).to.be.ok();
        expect(args.var).to.eql('replaced');
    });

    it('must have not substituted the variable whose value is not set', function () {
        var response = testrun.request.getCall(0).args[2],
            args = response.json().args;

        expect(args).to.be.ok();
        expect(args.novar).to.eql('{{novar}}');
    });

    it('must have completed the run', function() {
        expect(testrun).be.ok();
        expect(testrun.done.calledOnce).be.ok();
        expect(testrun.done.getCall(0).args[0]).to.be(null);
        expect(testrun.start.calledOnce).be.ok();
    });
});
