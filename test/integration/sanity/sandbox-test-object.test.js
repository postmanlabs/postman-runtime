var expect = require('chai').expect;

describe('sandbox test for `undefined` test values', function () {
    var testrun;

    before(function (done) {
        this.run({
            collection: {
                item: {
                    request: 'https://postman-echo.com/get',
                    event: [
                        {
                            'listen': 'test',
                            'script': {
                                'type': 'text/javascript',
                                'exec': [
                                    'tests[\'undefined\'] = undefined;',
                                    'tests[\'true\'] = true;',
                                    'tests[\'false\'] = false;'
                                ]
                            }
                        }
                    ]
                }
            },
            environment: {
                values: [{key: 'testVar', value: 'test-var-value'}]
            }
        }, function (err, results) {
            testrun = results;
            done(err);
        });
    });

    it('should have started and completed the test run', function () {
        expect(testrun).to.be.ok;
        expect(testrun).to.nested.include({
            'done.calledOnce': true,
            'start.calledOnce': true
        });
    });

    it('should have run the test script, and replaced `undefined` with `false`', function () {
        var assertions = testrun.assertion.getCall(0).args[1];

        expect(assertions[0]).to.deep.include({
            name: 'undefined',
            passed: false // this was set to undefined in the test script, but should be changed to false here.
        });
        expect(assertions[1]).to.deep.include({
            name: 'true',
            passed: true
        });
        expect(assertions[2]).to.deep.include({
            name: 'false',
            passed: false
        });
    });
});
