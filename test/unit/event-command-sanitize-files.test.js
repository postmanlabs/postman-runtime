var sinon = require('sinon').createSandbox(),
    expect = require('chai').expect,
    EventEmitter = require('events').EventEmitter,
    sdk = require('postman-collection'),
    IS_NODE = typeof window === 'undefined',

    EventCommand = require('../../lib/runner/extensions/event.command');

(IS_NODE ? describe : describe.skip)('event command file sanitization', function () {
    afterEach(function () {
        sinon.restore();
    });

    function runScriptRequest (request, done) {
        var host = new EventEmitter(),
            item = new sdk.Item({
                name: 'request',
                request: 'https://example.com',
                event: [{
                    listen: 'prerequest',
                    script: {
                        type: 'text/javascript',
                        exec: ['var value = 1;']
                    }
                }]
            }),
            runnerContext;

        host.dispatch = sinon.stub();
        host.execute = sinon.stub().callsFake(function (event, options, callback) {
            host.emit('execution.request.' + options.id, {}, options.id, 'request-id', request);

            callback(null, {});
        });

        runnerContext = {
            options: {},
            state: {},
            host: host,
            requester: { options: {} },
            getCookieJarFor: sinon.stub(),
            immediate: sinon.stub().callsFake(function () {
                var self = this;

                return {
                    done (callback) {
                        callback.call(self, { response: null, cookies: null });

                        return { catch: sinon.stub() };
                    }
                };
            }),
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

            done(null, runnerContext);
        });
    }

    it('strips file bodies from raw script requests after normalizing mode case', function (done) {
        runScriptRequest({
            url: 'https://postman-echo.com/post',
            method: 'POST',
            header: [],
            body: {
                mode: 'FILE',
                file: { src: 'test/fixtures/upload-file.json' }
            }
        }, function (err, runnerContext) {
            var payload;

            if (err) { return done(err); }

            expect(runnerContext.triggers.console.calledWith({},
                'warn', 'uploading files from scripts is not allowed')).to.be.true;

            expect(runnerContext.immediate.calledOnce).to.be.true;
            expect(runnerContext.immediate.firstCall.args[0]).to.eql('httprequest');

            payload = runnerContext.immediate.firstCall.args[1];
            expect(payload.item.request.body.toJSON()).to.deep.equal({});

            done();
        });
    });

    it('strips form-data file params from raw script requests after normalizing param type case', function (done) {
        runScriptRequest({
            url: 'https://postman-echo.com/post',
            method: 'POST',
            header: [],
            body: {
                mode: 'FORMDATA',
                formdata: [{
                    type: 'FILE',
                    key: 'foo',
                    src: 'test/fixtures/upload-file.json'
                }, {
                    type: 'text',
                    key: 'bar',
                    value: 'baz'
                }]
            }
        }, function (err, runnerContext) {
            var payload,
                formdata;

            if (err) { return done(err); }

            expect(runnerContext.triggers.console.calledWith({},
                'warn', 'uploading files from scripts is not allowed')).to.be.true;

            expect(runnerContext.immediate.calledOnce).to.be.true;
            expect(runnerContext.immediate.firstCall.args[0]).to.eql('httprequest');

            payload = runnerContext.immediate.firstCall.args[1];
            formdata = payload.item.request.body.formdata.all();

            expect(formdata).to.have.lengthOf(1);
            expect(formdata[0]).to.include({
                key: 'bar',
                type: 'text',
                value: 'baz'
            });

            done();
        });
    });
});
