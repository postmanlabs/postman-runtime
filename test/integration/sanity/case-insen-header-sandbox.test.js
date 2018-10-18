var expect = require('chai').expect;

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

    it('should have run the test script successfully', function () {
        var assertions = testrun.assertion.getCall(0).args[1];

        expect(testrun).to.be.ok;
        expect(testrun).to.nested.include({
            'test.calledOnce': true
        });

        expect(testrun.test.getCall(0).args[0]).to.be.null;
        expect(assertions[0]).to.deep.include({
            name: 'Case-insensitive header checking',
            passed: true
        });
    });

    it('should have completed the run', function () {
        expect(testrun).to.be.ok;
        expect(testrun.done.getCall(0).args[0]).to.be.null;
        expect(testrun).to.nested.include({
            'done.calledOnce': true,
            'start.calledOnce': true
        });
    });
});
