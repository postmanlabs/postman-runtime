var sdk = require('postman-collection'),
    expect = require('chai').expect;

describe('variable changes', function() {
    var testrun;

    before(function(done) {
        this.run({
            requester: {followRedirects: false},
            collection: {
                item: {
                    // ensure that we run something for test and pre-req scripts
                    event: [{
                        listen: 'prerequest',
                        script: {
                            exec: `
                                pm.variables.set('_variable', '_variable value');
                                pm.environment.set('environment', 'environment value');
                                pm.globals.set('globals', 'globals value');
                            `
                        }
                    }, {
                        listen: 'test',
                        script: {
                            exec: 'pm.environment.set("environment", "environment updated value");'
                        }
                    }],
                    request: 'https://postman-echo.com/get'
                }
            }
        }, function(err, results) {
            testrun = results;
            done(err);
        });
    });

    it('should have sent the request successfully', function() {
        expect(testrun).to.be.ok;
        expect(testrun).to.nested.include({
            'request.calledOnce': true
        });

        expect(testrun.request.getCall(0).args[0]).to.be.null;
    });

    it('should have triggered the script event twice', function () {
        expect(testrun).to.nested.include({
            'script.calledTwice': true
        });
    });

    it('should have provided variable-scope objects in the events', function () {
        var prerequest = testrun.script.firstCall.args[2],
            test = testrun.script.secondCall.args[2];

        expect(sdk.VariableScope.isVariableScope(prerequest.environment)).to.be.true;
        expect(sdk.VariableScope.isVariableScope(prerequest.globals)).to.be.true;

        expect(sdk.VariableScope.isVariableScope(test.environment)).to.be.true;
        expect(sdk.VariableScope.isVariableScope(test.globals)).to.be.true;
    });

    it('should have provided variable changes in the scripts', function () {
        var prerequest = testrun.script.firstCall.args[2];

        expect(prerequest.environment.mutations.count()).to.equal(1);
        expect(prerequest.globals.mutations.count()).to.equal(1);
        expect(prerequest._variables.mutations.count()).to.equal(1);
    });

    it('should not contain the variable changes from previous script executions', function () {
        var test = testrun.script.secondCall.args[2];

        expect(test.environment.mutations.count()).to.equal(1);
        expect(test.globals.mutations.count()).to.equal(0);
        expect(test._variables.mutations.count()).to.equal(0);
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
