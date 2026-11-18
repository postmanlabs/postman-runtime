var sinon = require('sinon').createSandbox(),
    expect = require('chai').expect,
    EventEmitter = require('events').EventEmitter,
    sdk = require('postman-collection'),

    EventCommand = require('../../lib/runner/extensions/event.command');

describe('event command transferResponseBody', function () {
    afterEach(function () {
        sinon.restore();
    });

    function runScripts (stream, state, done) {
        var host = new EventEmitter(),
            script = { type: 'text/javascript', exec: ['var value = 1;'] },
            item = new sdk.Item({
                name: 'request',
                request: 'https://example.com',
                event: [{ listen: 'test', script: script }, { listen: 'test', script: script }]
            }),
            runnerContext;

        host.dispatch = sinon.stub();
        host.execute = sinon.stub().callsFake(function (event, executeOptions, callback) {
            callback(null, {});
        });

        runnerContext = {
            options: {},
            state: state,
            host: host,
            requester: { options: {} },
            getCookieJarFor: sinon.stub(),
            triggers: {
                beforeTest: sinon.stub(),
                beforeScript: sinon.stub(),
                console: sinon.stub(),
                script: sinon.stub(),
                test: sinon.stub()
            }
        };

        EventCommand.process.event.call(runnerContext, {
            name: 'test',
            item: item,
            coords: {},
            context: {
                _variables: new sdk.VariableScope(),
                environment: new sdk.VariableScope(),
                globals: new sdk.VariableScope(),
                collectionVariables: new sdk.VariableScope(),
                response: { code: 200, stream: stream }
            }
        }, function (err) {
            done(err, host.execute.getCalls().map(function (call) { return call.args[1]; }));
        });
    }

    it('should move the body for the last script only, copying it for the earlier ones', function (done) {
        var stream = Buffer.from('body');

        runScripts(stream, {}, function (err, executions) {
            if (err) { return done(err); }

            expect(executions).to.have.lengthOf(2);
            expect(executions[0]).to.have.property('transferResponseBody', true);
            expect(executions[0].context.response.stream).to.not.equal(stream);
            expect(executions[0].context.response.stream.equals(stream)).to.be.true;
            expect(executions[1]).to.have.property('transferResponseBody', true);
            expect(executions[1].context.response.stream).to.equal(stream);
            done();
        });
    });

    it('should copy the body for every script of a nested run', function (done) {
        var stream = Buffer.from('body');

        runScripts(stream, { nestedRequest: { rootCursor: {} } }, function (err, executions) {
            if (err) { return done(err); }

            expect(executions).to.have.lengthOf(2);
            executions.forEach(function (execution) {
                expect(execution).to.have.property('transferResponseBody', true);
                expect(execution.context.response.stream).to.not.equal(stream);
                expect(execution.context.response.stream.equals(stream)).to.be.true;
            });
            done();
        });
    });

    it('should keep the base64 body and not ask for a transfer when the stream is not a Buffer', function (done) {
        // what item command sends when the option is off or the host cannot transfer
        var stream = { type: 'Base64', data: 'Ym9keQ==' };

        runScripts(stream, {}, function (err, executions) {
            if (err) { return done(err); }

            expect(executions).to.have.lengthOf(2);
            executions.forEach(function (execution) {
                expect(execution).to.not.have.property('transferResponseBody');
                expect(execution.context.response.stream).to.equal(stream);
            });
            done();
        });
    });
});
