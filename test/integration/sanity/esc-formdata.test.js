var expect = require('chai').expect;

describe('escaped formdata', function () {
    var testrun;

    before(function (done) {
        this.run({
            environment: {
                values: [
                    {key: 'msg', value: 'hello\\kworld', type: 'text', name: 'msg', enabled: true},
                    {key: 'msg1', value: 'hello', type: 'text', name: 'msg', enabled: true}
                ]
            },
            collection: {
                item: [{
                    request: {
                        url: 'https://postman-echo.com/post?a={{msg}}',
                        method: 'POST',
                        body: {
                            mode: 'urlencoded',
                            urlencoded: [{key: '{{msg1}}', value: '{{msg}}', type: 'text', enabled: true},
                                {key: 'incollection', value: 'hello\\world', type: 'text', enabled: true}]
                        }
                    }
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

    it('should escaped the formdata correctly', function () {
        var response = testrun.request.getCall(0).args[2],
            body = response.json();

        expect(body).to.have.nested.property('form.hello', 'hello\\kworld');
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
