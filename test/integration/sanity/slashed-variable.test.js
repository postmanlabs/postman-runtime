var expect = require('chai').expect;

describe('Slashed variables', function () {
    var testrun;

    before(function (done) {
        this.run({
            environment: {
                values: [{key: 'fo/o', type: 'text', value: 'alpha', enabled: true},
                    {key: 'b\\ar', type: 'text', value: 'beta', enabled: true}]
            },
            collection: {
                item: [{
                    request: 'https://postman-echo.com/get?foo={{fo/o}}&bar={{b\\ar}}'
                }]
            }
        }, function (err, results) {
            testrun = results;
            done(err);
        });
    });

    it('should have sent the request successfully', function () {
        expect(testrun).to.be.ok;
        expect(testrun).to.nested.include({
            'request.calledOnce': true
        });

        expect(testrun.request.getCall(0).args[0]).to.be.null;
    });

    it('should have resolved the variables', function () {
        var response = testrun.request.getCall(0).args[2],
            query;

        expect(response).to.have.property('code', 200);

        query = response.json().args;

        expect(query).to.deep.include({
            foo: 'alpha',
            bar: 'beta'
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
