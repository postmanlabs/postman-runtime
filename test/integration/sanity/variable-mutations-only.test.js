var sinon = require('sinon'),
    expect = require('chai').expect,
    PostmanSandbox = require('postman-sandbox/lib/postman-sandbox'),

    SCOPES = ['environment', 'globals', 'collectionVariables'];

describe('script.variableMutationsOnly option', function () {
    var executeSpy;

    function runOptions (script) {
        return {
            script: script,
            environment: { values: [{ key: 'e', value: 'e1' }, { key: 'eGone', value: 'x' }] },
            globals: { values: [{ key: 'g', value: 'g1' }] },
            collection: {
                variable: [{ key: 'c', value: 'c1' }],
                item: {
                    event: [{
                        listen: 'prerequest',
                        script: {
                            exec: [
                                'pm.environment.set("e", "e2");',
                                'pm.environment.unset("eGone");',
                                'pm.globals.set("gNew", "g2");',
                                'pm.collectionVariables.set("c", "c2");'
                            ]
                        }
                    }],
                    request: `${global.ECHO_SERVER}/get`
                }
            }
        };
    }

    function expectFullScopes (testrun) {
        var result = testrun.script.getCall(0).args[2];

        expect(result.environment.toObject()).to.eql({ e: 'e2' });
        expect(result.globals.toObject()).to.eql({ g: 'g1', gNew: 'g2' });
        expect(result.collectionVariables.toObject()).to.eql({ c: 'c2' });
    }

    afterEach(function () {
        executeSpy && executeSpy.restore();
        executeSpy = null;
    });

    it('should not ask the sandbox for mutations only by default', function (done) {
        executeSpy = sinon.spy(PostmanSandbox.prototype, 'execute');

        this.run(runOptions(), function (err, testrun) {
            if (err) { return done(err); }

            expect(executeSpy.getCall(0).args[1]).to.have.property('variableMutationsOnly', false);
            expectFullScopes(testrun);
            done();
        });
    });

    it('should ask the sandbox for mutations only when opted in', function (done) {
        executeSpy = sinon.spy(PostmanSandbox.prototype, 'execute');

        this.run(runOptions({ variableMutationsOnly: true }), function (err, testrun) {
            if (err) { return done(err); }

            expect(executeSpy.getCall(0).args[1]).to.have.property('variableMutationsOnly', true);
            expectFullScopes(testrun);
            done();
        });
    });

    it('should rebuild full scopes when the sandbox sends back mutations only', function (done) {
        var execute = PostmanSandbox.prototype.execute;

        // stand in for a sandbox that honours the option, whatever version is installed
        executeSpy = sinon.stub(PostmanSandbox.prototype, 'execute').callsFake(function (target, options, callback) {
            return execute.call(this, target, options, function (err, result) {
                result && SCOPES.forEach(function (scope) {
                    result[scope] = { mutations: result[scope].mutations };
                });

                callback(err, result);
            });
        });

        this.run(runOptions({ variableMutationsOnly: true }), function (err, testrun) {
            if (err) { return done(err); }

            expectFullScopes(testrun);
            done();
        });
    });
});
