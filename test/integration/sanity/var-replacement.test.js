var expect = require('chai').expect;

describe('variable replacement', function() {
    var testrun;

    before(function(done) {
        this.run({
            collection: {
                item: [{
                    event: [{
                        listen: 'test',
                        script: {
                            exec: [
                                'var data = JSON.parse(responseBody);',
                                'tests[\'Variable substitution\'] = (data.args.var===\'replaced\');',
                                'tests[\'No blank variable substitution\'] = (data.args.novar===\'{{novar}}\');'
                            ]
                        }
                    }, {
                        listen: 'prerequest',
                        script: {exec: 'postman.setEnvironmentVariable(\'var\', \'replaced\');'}
                    }],
                    request: {
                        url: 'https://postman-echo.com/get?novar={{novar}}&var={{var}}',
                        method: 'GET',
                        body: {mode: 'formdata', formdata: []}
                    }
                }]
            }
        }, function(err, results) {
            testrun = results;
            done(err);
        });
    });

    it('should have sent the request successfully', function() {
        expect(testrun).to.be.ok;
        expect(testrun).to.nested.include({
            'test.calledOnce': true,
            'prerequest.calledOnce': true,
            'request.calledOnce': true
        });

        expect(testrun.request.getCall(0).args[0]).to.be.null;
    });

    it('should have substituted the available variable correctly', function () {
        var response = testrun.request.getCall(0).args[2],
            args = response.json().args;

        expect(args).to.be.ok;
        expect(args).to.have.property('var', 'replaced');
    });

    it('should have not substituted the variable whose value is not set', function () {
        var response = testrun.request.getCall(0).args[2],
            args = response.json().args;

        expect(args).to.be.ok;
        expect(args).to.have.deep.property('novar', '{{novar}}');
    });

    it('should have completed the run', function() {
        expect(testrun).to.be.ok;
        expect(testrun.done.getCall(0).args[0]).to.be.null;
        expect(testrun).to.nested.include({
            'done.calledOnce': true,
            'start.calledOnce': true
        });
    });
});
