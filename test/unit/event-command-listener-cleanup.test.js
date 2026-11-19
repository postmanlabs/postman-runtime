var sinon = require('sinon').createSandbox(),
    expect = require('chai').expect,
    EventEmitter = require('events').EventEmitter,
    sdk = require('postman-collection'),

    EventCommand = require('../../lib/runner/extensions/event.command');

describe('event command listener cleanup', function () {
    afterEach(function () {
        sinon.restore();
    });

    it('removes all per-execution listeners from the host after each script', function (done) {
        var host = new EventEmitter(),
            executionIds = [],
            item = new sdk.Item({
                name: 'request',
                request: 'https://example.com',
                event: [{
                    listen: 'prerequest',
                    script: { type: 'text/javascript', exec: ['var a = 1;'] }
                }, {
                    listen: 'prerequest',
                    script: { type: 'text/javascript', exec: ['var b = 2;'] }
                }]
            }),
            runnerContext;

        host.dispatch = sinon.stub();
        host.execute = sinon.stub().callsFake(function (event, options, callback) {
            executionIds.push(options.id);
            callback(null, {});
        });

        runnerContext = {
            options: {},
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
            context: {}
        }, function (err) {
            if (err) { return done(err); }

            var leaked = host.eventNames().filter(function (name) {
                return executionIds.some(function (id) {
                    return String(name).endsWith('.' + id);
                });
            });

            expect(executionIds).to.have.lengthOf(2);
            expect(leaked).to.eql([]);
            done();
        });
    });
});
