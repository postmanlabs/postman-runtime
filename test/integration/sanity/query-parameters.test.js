var expect = require('chai').expect;

describe('query parameters', function () {
    var testrun;

    before(function (done) {
        this.run({
            collection: {
                item: [
                    {request: 'https://postman-echo.com/get?a=обязательный&c=d'}
                ]
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

    it('should resolve variable and send request', function () {
        var request = testrun.beforeRequest.getCall(0).args[2];

        expect(testrun).to.nested.include({ // one request
            'beforeRequest.calledOnce': true
        });
        expect(request).to.be.ok;
        expect(request).to.have.property('method', 'GET');
    });

    it('should receive response with the query param sent', function () {
        var response = testrun.request.getCall(0).args[2];

        expect(testrun).to.nested.include({ // one request
            'request.calledOnce': true
        });
        expect(response.json()).to.be.ok;
        expect(response.json().args).to.be.ok;
        expect(response.json()).to.have.nested.property('args.a', 'обязательный');
    });
});
