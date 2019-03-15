var expect = require('chai').expect;

describe('Multi value data', function () {
    var testrun;

    before(function (done) {
        this.run({
            collection: {
                item: [{
                    event: [{
                        listen: 'test',
                        script: {
                            exec: ['var data = request.data;',
                                'tests["working"] = (_.isArray(data.name))']
                        }
                    }],
                    request: {
                        url: 'https://postman-echo.com/post',
                        method: 'POST',
                        body: {
                            mode: 'formdata',
                            formdata: [{key: 'name', value: 'abhijit'}, {key: 'name', value: 'kane'}]
                        }
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
        expect(assertions[0]).to.nested.include({
            name: 'working',
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
