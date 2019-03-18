var expect = require('chai').expect;

describe('data variable replacement', function () {
    var testrun;

    before(function (done) {
        this.run({
            data: [{dataVar: 'value1'}, {dataVar: 'value2'}],
            collection: {
                item: [{
                    event: [{
                        listen: 'prerequest',
                        script: {
                            exec: [
                                'postman.setEnvironmentVariable(\'dataVar2\',iteration);'
                            ]
                        }
                    }, {
                        listen: 'test',
                        script: {
                            exec: [
                                'pm.test("should be ok", function () {',
                                '    pm.response.to.be.success;',
                                '});'
                            ]
                        }
                    }],
                    request: {
                        url: 'https://postman-echo.com/post',
                        method: 'POST',
                        body: {
                            mode: 'formdata',
                            formdata: [
                                {key: 'a', value: '{{dataVar}}', type: 'text'},
                                {key: 'b', value: '{{dataVar2}}', type: 'text'}
                            ]
                        }
                    }
                }]
            }
        }, function (err, results) {
            testrun = results;
            done(err);
        });
    });

    it('should have run two iterations', function () {
        expect(testrun).to.be.ok;
        expect(testrun).to.nested.include({
            'iteration.calledTwice': true,
            'request.calledTwice': true
        });

        expect(testrun.request.getCall(0).args[0]).to.be.null;
        expect(testrun.request.getCall(1).args[0]).to.be.null;
    });

    it('should use a consistent format for request.data', function () {
        expect(testrun).to.be.ok;

        // prerequest script checks
        expect(testrun).to.nested.include({
            'prerequest.calledTwice': true
        });
        expect(testrun.prerequest.getCall(0)).to.deep.nested.include({
            'args[0]': null,
            'args[2][0].result.data': {dataVar: 'value1'}
        });
        expect(testrun.prerequest.getCall(1)).to.deep.nested.include({
            'args[0]': null,
            'args[2][0].result.data': {dataVar: 'value2'}
        });

        // test script checks
        expect(testrun).to.nested.include({
            'test.calledTwice': true
        });
        expect(testrun.test.getCall(0)).to.deep.nested.include({
            'args[0]': null,
            'args[2][0].result.data': {dataVar: 'value1'}
        });
        expect(testrun.test.getCall(1)).to.deep.nested.include({
            'args[0]': null,
            'args[2][0].result.data': {dataVar: 'value2'}
        });
    });

    it('should have substituted the data variables', function () {
        expect(testrun).to.be.ok;

        var firstResponse = testrun.request.getCall(0).args[2],
            firstBody = firstResponse.json(),
            secondResponse = testrun.request.getCall(1).args[2],
            secondBody = secondResponse.json();

        expect(firstBody).to.nested.include({
            'form.a': 'value1',
            'form.b': '0'
        });
        expect(secondBody).to.nested.include({
            'form.a': 'value2',
            'form.b': '1'
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
