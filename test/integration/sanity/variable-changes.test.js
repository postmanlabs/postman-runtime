var sdk = require('postman-collection');

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

    it('must have sent the request successfully', function() {
        expect(testrun).be.ok();
        expect(testrun.request.calledOnce).be.ok();

        expect(testrun.request.getCall(0).args[0]).to.be(null);
    });

    it('must have triggered the script event twice', function () {
        expect(testrun.script.calledTwice).to.be.ok();
    });

    it('must have provided variable-scope objects in the events', function () {
        var prerequest = testrun.script.firstCall.args[2],
            test = testrun.script.secondCall.args[2];

        expect(sdk.VariableScope.isVariableScope(prerequest.environment)).to.be(true);
        expect(sdk.VariableScope.isVariableScope(prerequest.globals)).to.be(true);

        expect(sdk.VariableScope.isVariableScope(test.environment)).to.be(true);
        expect(sdk.VariableScope.isVariableScope(test.globals)).to.be(true);
    });

    it('must have provided variable changes in the scripts', function () {
        var prerequest = testrun.script.firstCall.args[2];

        expect(prerequest.environment.mutations.count()).to.be(1);
        expect(prerequest.globals.mutations.count()).to.be(1);
        expect(prerequest._variables.mutations.count()).to.be(1);
    });

    it('must not contain the variable changes from previous script executions', function () {
        var test = testrun.script.secondCall.args[2];

        expect(test.environment.mutations.count()).to.be(1);
        expect(test.globals.mutations.count()).to.be(0);
        expect(test._variables.mutations.count()).to.be(0);
    });

    it('must have completed the run', function() {
        expect(testrun).be.ok();
        expect(testrun.done.calledOnce).be.ok();
        expect(testrun.done.getCall(0).args[0]).to.be(null);
        expect(testrun.start.calledOnce).be.ok();
    });
});
