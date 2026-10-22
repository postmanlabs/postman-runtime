var sinon = require('sinon').createSandbox(),
    expect = require('chai').expect,
    EventEmitter = require('events').EventEmitter,
    sdk = require('postman-collection'),

    EventCommand = require('../../lib/runner/extensions/event.command'),

    SCOPES = ['_variables', 'environment', 'globals', 'collectionVariables'];

describe('event command variableMutationsOnly', function () {
    afterEach(function () {
        sinon.restore();
    });

    // a scope as the sandbox would send it back with `variableMutationsOnly`: its mutations and nothing else
    function mutationsOnly (key, value) {
        var scope = new sdk.VariableScope();

        scope.enableTracking({ autoCompact: true });
        scope.set(key, value);

        return { mutations: scope.mutations.toJSON() };
    }

    function runScript (options, sandboxResult, done) {
        var host = new EventEmitter(),
            item = new sdk.Item({
                name: 'request',
                request: 'https://example.com',
                event: [{
                    listen: 'prerequest',
                    script: { type: 'text/javascript', exec: ['var value = 1;'] }
                }]
            }),
            runnerContext;

        host.dispatch = sinon.stub();
        host.execute = sinon.stub().callsFake(function (event, executeOptions, callback) {
            callback(null, sandboxResult);
        });

        runnerContext = {
            options: options,
            state: {},
            host: host,
            requester: { options: {} },
            getCookieJarFor: sinon.stub(),
            triggers: {
                beforePrerequest: sinon.stub(),
                beforeScript: sinon.stub(),
                console: sinon.stub(),
                script: sinon.stub(),
                prerequest: sinon.stub()
            }
        };

        EventCommand.process.event.call(runnerContext, {
            name: 'prerequest',
            item: item,
            coords: {},
            context: {
                _variables: new sdk.VariableScope({ values: [{ key: 'v', value: 'v1' }] }),
                environment: new sdk.VariableScope({ values: [{ key: 'e', value: 'e1' }] }),
                globals: new sdk.VariableScope({ values: [{ key: 'g', value: 'g1' }] }),
                collectionVariables: new sdk.VariableScope({ values: [{ key: 'c', value: 'c1' }] })
            }
        }, function (err) {
            if (err) { return done(err); }

            done(null, runnerContext, runnerContext.triggers.script.firstCall.args[2]);
        });
    }

    it('should not ask the sandbox for mutations only by default', function (done) {
        runScript({}, {}, function (err, runnerContext) {
            if (err) { return done(err); }

            expect(runnerContext.host.execute.firstCall.args[1]).to.have.property('variableMutationsOnly', false);
            done();
        });
    });

    it('should ask the sandbox for mutations only when the script option is set', function (done) {
        runScript({ script: { variableMutationsOnly: true } }, {}, function (err, runnerContext) {
            if (err) { return done(err); }

            expect(runnerContext.host.execute.firstCall.args[1]).to.have.property('variableMutationsOnly', true);
            done();
        });
    });

    it('should rebuild full scopes from the mutations the sandbox sent back', function (done) {
        runScript({ script: { variableMutationsOnly: true } }, {
            _variables: mutationsOnly('v', 'v2'),
            environment: mutationsOnly('eNew', 'e2'),
            globals: mutationsOnly('g', 'g2'),
            collectionVariables: mutationsOnly('cNew', 'c2')
        }, function (err, runnerContext, result) {
            if (err) { return done(err); }

            SCOPES.forEach(function (scope) {
                expect(sdk.VariableScope.isVariableScope(result[scope]), scope).to.be.true;
                expect(result[scope].mutations.count(), scope).to.equal(1);
            });

            expect(result._variables.toObject()).to.eql({ v: 'v2' });
            expect(result.environment.toObject()).to.eql({ e: 'e1', eNew: 'e2' });
            expect(result.globals.toObject()).to.eql({ g: 'g2' });
            expect(result.collectionVariables.toObject()).to.eql({ c: 'c1', cNew: 'c2' });

            // pm.variables is carried to the next request from the rebuilt scope
            expect(runnerContext.state._variables.toObject()).to.eql({ v: 'v2' });
            done();
        });
    });

    it('should not rebuild scopes when the option is not set', function (done) {
        runScript({}, {
            environment: mutationsOnly('eNew', 'e2')
        }, function (err, runnerContext, result) {
            if (err) { return done(err); }

            expect(result.environment.toObject()).to.eql({});
            done();
        });
    });

    it('should use full scopes from a sandbox that ignores the option', function (done) {
        runScript({ script: { variableMutationsOnly: true } }, {
            environment: { values: [{ key: 'e', value: 'full' }] }
        }, function (err, runnerContext, result) {
            if (err) { return done(err); }

            expect(result.environment.toObject()).to.eql({ e: 'full' });
            done();
        });
    });
});
