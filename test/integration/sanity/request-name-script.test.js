var expect = require('chai').expect;

describe('request name scripts', function() {
    var testrun;

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

    it('should have run the test script successfully', function() {
        var assertions = testrun.assertion.getCall(0).args[1];
        expect(testrun).to.be.ok;
        expect(testrun).to.nested.include({
            'test.calledOnce': true,
            'prerequest.calledOnce': true
        });

        expect(testrun.test.getCall(0).args[0]).to.be.null;
        expect(assertions[0]).to.nested.include({
            name: 'working',
            passed: true
        });
    });

    it('should have completed the run', function() {
        expect(testrun).to.be.ok;
        expect(testrun.done.getCall(0).args[0]).to.be.null;
        expect(testrun).to.nested.include({
            'done.calledOnce': true,
            'start.calledOnce': true
        });
    });
});
