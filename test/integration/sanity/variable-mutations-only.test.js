var expect = require('chai').expect;

describe('script.variableMutationsOnly option', function () {
    var testrun;

    before(function (done) {
        this.run({
            script: { variableMutationsOnly: true },
            environment: { values: [{ key: 'e', value: 'e1' }, { key: 'eGone', value: 'x' }] },
            globals: { values: [{ key: 'g', value: 'g1' }] },
            collection: {
                variable: [{ key: 'c', value: 'c1' }],
                item: [{
                    event: [{
                        listen: 'prerequest',
                        script: {
                            exec: [
                                'pm.variables.set("v", "v1");',
                                'pm.environment.set("e", "e2");',
                                'pm.environment.unset("eGone");',
                                'pm.globals.set("gNew", "g2");',
                                'pm.collectionVariables.set("c", "c2");'
                            ]
                        }
                    }],
                    request: `${global.ECHO_SERVER}/get`
                }, {
                    event: [{
                        listen: 'test',
                        script: {
                            exec: [
                                'pm.test("variables carried over", function () {',
                                '    pm.expect(pm.variables.get("v")).to.equal("v1");',
                                '    pm.expect(pm.environment.toObject()).to.eql({ e: "e2" });',
                                '    pm.expect(pm.globals.toObject()).to.eql({ g: "g1", gNew: "g2" });',
                                '    pm.expect(pm.collectionVariables.toObject()).to.eql({ c: "c2" });',
                                '});'
                            ]
                        }
                    }],
                    request: `${global.ECHO_SERVER}/get?e={{e}}&c={{c}}`
                }]
            }
        }, function (err, results) {
            testrun = results;
            done(err);
        });
    });

    it('should have completed the run', function () {
        expect(testrun).to.be.ok;
        expect(testrun.done.getCall(0).args[0]).to.be.null;
        expect(testrun).to.nested.include({
            'done.calledOnce': true,
            'script.callCount': 2
        });
    });

    it('should give the script callback full scopes', function () {
        var result = testrun.script.getCall(0).args[2];

        expect(result._variables.toObject()).to.eql({ v: 'v1' });
        expect(result.environment.toObject()).to.eql({ e: 'e2' });
        expect(result.globals.toObject()).to.eql({ g: 'g1', gNew: 'g2' });
        expect(result.collectionVariables.toObject()).to.eql({ c: 'c2' });
    });

    it('should resolve the changed variables in the next request', function () {
        expect(testrun.request.getCall(1).args[3].url.query.toObject()).to.eql({ e: 'e2', c: 'c2' });
    });

    it('should carry the changed variables to the next script', function () {
        var assertions = testrun.assertion.getCall(0).args[1];

        expect(assertions[0]).to.include({ name: 'variables carried over', passed: true });
    });
});
