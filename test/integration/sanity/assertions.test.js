describe('assertions', function () {
    var testrun;

    before(function (done) {
        this.run({
            stopOnFailure: true,
            collection: {
                item: {
                    request: 'https://postman-echo.com/get?testvar={{testVar}}',
                    event: [{
                        listen: 'test',
                        script: [
                            '"use sandbox2";',
                            'pm.test("response body must be json", function () {',
                            '    pm.expect(pm.response.json()).be.an("object");',
                            '    });',
                            '    pm.test("this test will force fail", function () {',
                            '        throw new Error("I am an error!");',
                            '    });']
                    }]
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
        expect(testrun.start.calledOnce).be.ok();
        expect(testrun.request.calledOnce).be.ok();
        expect(testrun.script.calledOnce).be.ok();
        expect(testrun.assertion.calledTwice).be.ok();
        expect(testrun.test.calledOnce).be.ok();
        expect(testrun.done.calledOnce).be.ok();
    });

    it('must receive response with the query param sent', function () {
        var response = testrun.request.getCall(0).args[2];

        expect(testrun.request.calledOnce).be.ok(); // one request
        expect(response.json()).be.ok();
        expect(response.json().args).be.ok();
        expect(response.json().args).have.property('testvar', 'test-var-value');
    });

    it('script run should have one error', function () {
        expect(testrun.script.getCall(0).args[0]).be.ok();
        expect(testrun.script.getCall(0).args[0]).have.property('message', 'this test will force fail');
    });

    it('test assertion should have bubbled up', function () {
        expect(testrun.assertion.getCall(0).args[1]).have.property('passed', true);
        expect(testrun.assertion.getCall(1).args[1]).have.property('passed', false);
        expect(testrun.assertion.getCall(1).args[1].error).have.property('message', 'I am an error!');
    });
});
