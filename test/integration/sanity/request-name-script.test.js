describe('request name scripts', function() {
    var _ = require('lodash'),
        testrun;

    before(function(done) {
        this.run({
            collection: {
                item: [{
                    name: 'r1',
                    event: [{
                        listen: 'test',
                        script: {
                            exec: [
                                'var failed = postman.getEnvironmentVariable(\'fail\');',
                                // eslint-disable-next-line max-len
                                'tests[\'working\'] = !failed && (request.name===\'r1\' && request.description===\'testDesc\')'
                            ]
                        }
                    }, {
                        listen: 'prerequest',
                        script: {
                            exec: [
                                'if(request.name!==\'r1\' || request.description!==\'testDesc\') {',
                                '    postman.setEnvironmentVariable(\'fail\', \'true\')',
                                '}'
                            ]
                        }
                    }],
                    request: {
                        url: 'postman-echo.com/get',
                        method: 'GET',
                        body: {
                            mode: 'formdata',
                            formdata: []
                        },
                        description: 'testDesc'
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
        expect(_.get(testrun.test.getCall(0).args[2], '0.result.tests.working')).to.be(true);
    });

    it('must have completed the run', function() {
        expect(testrun).be.ok();
        expect(testrun.done.calledOnce).be.ok();
        expect(testrun.done.getCall(0).args[0]).to.be(null);
        expect(testrun.start.calledOnce).be.ok();
    });
});
