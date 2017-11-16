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
                                    '    pm.expect(true).to.ok;',
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
                                    'pm.sendRequest("http://postman-echo.com", function () {})'
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
                        request: 'http://postman-echo.com/get?foo=bar'
                    }]
                }
            }, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        it('must have completed the run', function () {
            expect(testrun).be.ok();
            expect(testrun.done.callCount).to.be(1);
            expect(testrun.done.getCall(0).args[0]).to.be(null);
            expect(testrun.start.callCount).to.be(1);
        });

        it('must have scriptId and eventId in script events', function () {
            expect(testrun.beforeScript.callCount).to.be(5);

            // check for uniqueness
            expect(testrun.beforeScript.firstCall.args[1]).to.have.property('eventId', 'my-test-event-1');
            expect(testrun.beforeScript.firstCall.args[1]).to.have.property('scriptId', 'my-test-script-1');
            expect(testrun.script.secondCall.args[1]).to.have.property('eventId', 'my-test-event-2');
            expect(testrun.script.secondCall.args[1]).to.have.property('scriptId', 'my-test-script-2');
            expect(testrun.script.thirdCall.args[1]).to.have.property('eventId', 'my-test-event-3');
            expect(testrun.script.thirdCall.args[1]).to.have.property('scriptId', 'my-test-script-3');
            expect(testrun.script.getCall(3).args[1]).to.have.property('eventId', 'my-test-event-4');
            expect(testrun.script.getCall(3).args[1]).to.have.property('scriptId', 'my-test-script-4');
            expect(testrun.script.getCall(4).args[1]).to.have.property('eventId', 'my-test-event-5');
            expect(testrun.script.getCall(4).args[1]).to.have.property('scriptId', 'my-test-script-5');

            // check for leak
            expect(testrun.beforeTest.firstCall.args[1]).to.not.have.property('scriptId');
            expect(testrun.beforeTest.firstCall.args[1]).to.not.have.property('eventId');
            expect(testrun.test.firstCall.args[1]).to.not.have.property('scriptId');
            expect(testrun.test.firstCall.args[1]).to.not.have.property('eventId');
        });

        it('must have scriptId and eventId in console statements from scripts', function () {
            expect(testrun.console.callCount).to.be(2);
            expect(testrun.console.firstCall.args[2]).to.be('hello from up here');
            expect(testrun.console.firstCall.args[0]).to.have.property('eventId', 'my-test-event-1');
            expect(testrun.console.firstCall.args[0]).to.have.property('scriptId', 'my-test-script-1');
            expect(testrun.console.secondCall.args[2]).to.be('hello');
            expect(testrun.console.secondCall.args[0]).to.have.property('eventId', 'my-test-event-2');
            expect(testrun.console.secondCall.args[0]).to.have.property('scriptId', 'my-test-script-2');
        });

        it('must have scriptId and eventId in assertion events', function () {
            expect(testrun.assertion.callCount).to.be(1);
            expect(testrun.assertion.firstCall.args[0]).to.have.property('eventId', 'my-test-event-2');
            expect(testrun.assertion.firstCall.args[0]).to.have.property('scriptId', 'my-test-script-2');
        });

        it('must have scriptId and eventId in request events for pm.sendRequest', function () {
            expect(testrun.io.callCount).to.be(2);
            expect(testrun.io.secondCall.args[1]).to.have.property('eventId', 'my-test-event-4');
            expect(testrun.io.secondCall.args[1]).to.have.property('scriptId', 'my-test-script-4');
            expect(testrun.request.secondCall.args[1]).to.have.property('eventId', 'my-test-event-4');
            expect(testrun.request.secondCall.args[1]).to.have.property('scriptId', 'my-test-script-4');
        });

        it('must have scriptId and eventId in synchronous errors', function () {
            expect(testrun.script.thirdCall.args[0]).to.have.property('message', 'error from sync script');
            expect(testrun.script.thirdCall.args[1]).to.have.property('eventId', 'my-test-event-3');
            expect(testrun.script.thirdCall.args[1]).to.have.property('scriptId', 'my-test-script-3');
        });

        it('must have scriptId and eventId in exception callback for errors(sync and async)', function () {
            expect(testrun.exception.callCount).to.be(2);
            expect(testrun.exception.firstCall.args[1]).to.have.property('message', 'error from sync script');
            expect(testrun.exception.firstCall.args[0]).to.have.property('eventId', 'my-test-event-3');
            expect(testrun.exception.firstCall.args[0]).to.have.property('scriptId', 'my-test-script-3');
            expect(testrun.exception.secondCall.args[1]).to.have.property('message', 'error from async script');
            expect(testrun.exception.secondCall.args[0]).to.have.property('eventId', 'my-test-event-5');
            expect(testrun.exception.secondCall.args[0]).to.have.property('scriptId', 'my-test-script-5');
        });
    });
});
