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

    it('must have started and completed the test run', function () {
        expect(testrun).be.ok();
        expect(testrun.done.calledOnce).be.ok();
        expect(testrun.start.calledOnce).be.ok();
    });

    it('must have run the test script, and replaced `undefined` with `false`', function () {
        var assertions = testrun.assertion.getCall(0).args[1];

        expect(assertions[0]).to.have.property('name', 'undefined');
        // this was set to undefined in the test script, but should be changed to false here.
        expect(assertions[0]).to.have.property('passed', false);
        expect(assertions[1]).to.have.property('name', 'true');
        expect(assertions[1]).to.have.property('passed', true);
        expect(assertions[2]).to.have.property('name', 'false');
        expect(assertions[2]).to.have.property('passed', false);
    });
});
