describe('Distinct random number generation', function () {
    var _ = require('lodash'),
        testrun;

    before(function (done) {
        this.run({
            collection: {
                item: [{
                    event: [{
                        listen: 'test',
                        script: {
                            exec: ['var data = JSON.parse(responseBody);',
                                'postman.setEnvironmentVariable(\'randomVar\', parseInt(data.args.a));']
                        }
                    }],
                    request: {
                        url: 'https://postman-echo.com/get?a={{$randomInt}}',
                        method: 'GET'
                    }
                }, {
                    event: [{
                        listen: 'test',
                        script: {
                            exec: ['var data = JSON.parse(responseBody);',
                                'var newVar = parseInt(data.args.a)',
                                'tests[\'working\'] = newVar!==environment.randomVar;']
                        }
                    }],
                    request: {
                        url: 'https://postman-echo.com/get?a={{$randomInt}}&b={{$guid}}',
                        method: 'GET'
                    }
                }]
            }
        }, function (err, results) {
            testrun = results;
            done(err);
        });
    });

    it('must have run the test script successfully', function () {
        expect(testrun).be.ok();
        expect(testrun.test.calledTwice).be.ok();

        expect(testrun.test.getCall(0).args[0]).to.be(null);
        expect(testrun.test.getCall(1).args[0]).to.be(null);
        expect(_.get(testrun.test.getCall(1).args[2], '0.result.globals.tests.working')).to.be(true);
    });

    it('must have completed the run', function () {
        expect(testrun).be.ok();
        expect(testrun.done.calledOnce).be.ok();
        expect(testrun.done.getCall(0).args[0]).to.be(null);
        expect(testrun.start.calledOnce).be.ok();
    });
});
