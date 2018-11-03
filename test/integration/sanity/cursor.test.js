var expect = require('chai').expect;

// @todo: Move httpRequestId test and other cursor tests in this spec
describe('cursor', function () {
    var testrun;

    describe('scriptId and eventId', function () {
        before(function (done) {
            this.run({
                collection: {
                    event: [{
                        id: 'my-test-event-1',
                        listen: 'test',
                        script: {
                            id: 'my-test-script-1',
                            type: 'text/javascript',
                            exec: ['console.log("hello from up here");']
                        }
                    }],
                    item: [{
                        event: [{
                            id: 'my-test-event-2',
                            listen: 'test',
                            script: {
                                id: 'my-test-script-2',
                                type: 'text/javascript',
                                exec: [
                                    'console.log("hello");',
                                    'pm.test("just another test, nothing special", function () {',
                                    '    pm.expect(true).to.be.ok;',
                                    '});'
                                ]
                            }
                        }, {
                            id: 'my-test-event-3',
                            listen: 'test',
                            script: {
                                id: 'my-test-script-3',
                                type: 'text/javascript',
                                exec: ['throw new Error("error from sync script");']
                            }
                        }, {
                            id: 'my-test-event-4',
                            listen: 'test',
                            script: {
                                id: 'my-test-script-4',
                                type: 'text/javascript',
                                exec: [
                                    'pm.sendRequest("https://postman-echo.com", function () {})'
                                ]
                            }
                        }, {
                            id: 'my-test-event-5',
                            listen: 'test',
                            script: {
                                id: 'my-test-script-5',
                                type: 'text/javascript',
                                exec: [
                                    'setTimeout(function () {',
                                    '    throw new Error("error from async script");',
                                    '});'
                                ]
                            }
                        }],
                        request: 'https://postman-echo.com/get?foo=bar'
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
                'done.callCount': 1,
                'start.callCount': 1
            });
        });

        it('should have scriptId and eventId in script events', function () {
            expect(testrun).to.nested.include({
                'beforeScript.callCount': 5
            });

            // check for uniqueness
            expect(testrun).to.have.nested.property('beforeScript.firstCall.args[1]').that.deep.include({
                eventId: 'my-test-event-1',
                scriptId: 'my-test-script-1'
            });
            expect(testrun).to.have.nested.property('script.secondCall.args[1]').that.deep.include({
                eventId: 'my-test-event-2',
                scriptId: 'my-test-script-2'
            });
            expect(testrun).to.have.nested.property('script.thirdCall.args[1]').that.deep.include({
                eventId: 'my-test-event-3',
                scriptId: 'my-test-script-3'
            });
            expect(testrun.script.getCall(3).args[1]).to.deep.include({
                eventId: 'my-test-event-4',
                scriptId: 'my-test-script-4'
            });
            expect(testrun.script.getCall(4).args[1]).to.deep.include({
                eventId: 'my-test-event-5',
                scriptId: 'my-test-script-5'
            });

            // check for leak
            expect(testrun).to.have.nested.property('beforeTest.firstCall.args[1]')
                .that.does.not.have.property('scriptId');
            expect(testrun).to.have.nested.property('beforeTest.firstCall.args[1]')
                .that.does.not.have.property('eventId');
            expect(testrun).to.have.nested.property('test.firstCall.args[1]').that.does.not.have.property('scriptId');
            expect(testrun).to.have.nested.property('test.firstCall.args[1]').that.does.not.have.property('eventId');
        });

        it('should have scriptId and eventId in console statements from scripts', function () {
            expect(testrun).to.have.property('console').that.nested.include({
                callCount: 2,
                'firstCall.args[2]': 'hello from up here',
                'firstCall.args[0].eventId': 'my-test-event-1',
                'firstCall.args[0].scriptId': 'my-test-script-1',
                'secondCall.args[2]': 'hello',
                'secondCall.args[0].eventId': 'my-test-event-2',
                'secondCall.args[0].scriptId': 'my-test-script-2'
            });
        });

        it('should have scriptId and eventId in assertion events', function () {
            expect(testrun).to.have.property('assertion').that.nested.include({
                callCount: 1,
                'firstCall.args[0].eventId': 'my-test-event-2',
                'firstCall.args[0].scriptId': 'my-test-script-2'
            });
        });

        it('should have scriptId and eventId in request events for pm.sendRequest', function () {
            expect(testrun).to.have.property('io').that.nested.include({
                callCount: 2,
                'secondCall.args[1].eventId': 'my-test-event-4',
                'secondCall.args[1].scriptId': 'my-test-script-4'
            });
            expect(testrun).to.have.nested.property('request.secondCall.args[1]').that.deep.include({
                eventId: 'my-test-event-4',
                scriptId: 'my-test-script-4'
            });
        });

        it('should have scriptId and eventId in synchronous errors', function () {
            expect(testrun).to.have.nested.property('script.thirdCall').that.nested.include({
                'args[0].message': 'error from sync script',
                'args[1].eventId': 'my-test-event-3',
                'args[1].scriptId': 'my-test-script-3'
            });
        });

        it('should have scriptId and eventId in exception callback for errors(sync and async)', function () {
            expect(testrun).to.have.property('exception').that.nested.include({
                callCount: 2,
                'firstCall.args[1].message': 'error from sync script',
                'firstCall.args[0].eventId': 'my-test-event-3',
                'firstCall.args[0].scriptId': 'my-test-script-3',
                'secondCall.args[1].message': 'error from async script',
                'secondCall.args[0].eventId': 'my-test-event-5',
                'secondCall.args[0].scriptId': 'my-test-script-5'
            });
        });
    });
});
