describe('Case insensitive sandbox headers', function () {
    var testrun;

    before(function (done) {
        this.run({
            collection: {
                item: [{
                    event: [{
                        listen: 'test',
                        script: {
                            // eslint-disable-next-line max-len
                            exec: 'tests[\'Case-insensitive header checking\'] = postman.getResponseHeader(\'contenT-TypE\')===\'application/json; charset=utf-8\';'
                        }
                    }],
                    request: {
                        url: 'https://postman-echo.com/get',
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
        var assertions = testrun.assertion.getCall(0).args[1];

        expect(testrun).be.ok();
        expect(testrun.test.calledOnce).be.ok();

        expect(testrun.test.getCall(0).args[0]).to.be(null);
        expect(assertions[0]).to.have.property('name', 'Case-insensitive header checking');
        expect(assertions[0]).to.have.property('passed', true);
    });

    it('must have completed the run', function () {
        expect(testrun).be.ok();
        expect(testrun.done.calledOnce).be.ok();
        expect(testrun.done.getCall(0).args[0]).to.be(null);
        expect(testrun.start.calledOnce).be.ok();
    });
});
