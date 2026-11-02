var expect = require('chai').expect;

describe('script.transferResponseBody option', function () {
    var bodyCheck = function (name) {
            return {
                listen: 'test',
                script: {
                    exec: [
                        `pm.test("${name}", function () {`,
                        '    pm.expect(pm.response.json()).to.have.property("url");',
                        '    pm.expect(responseBody).to.equal(pm.response.text());',
                        '});'
                    ]
                }
            };
        },
        runWith = function (transferResponseBody, done) {
            this.run({
                script: { transferResponseBody },
                collection: {
                    event: [bodyCheck('collection script reads the body')],
                    item: [{
                        event: [bodyCheck('item script reads the body')],
                        // bodies under 4KB share Node's Buffer pool and are copied instead of moved
                        request: `${global.ECHO_SERVER}/get?pad=${'a'.repeat(8192)}`
                    }]
                }
            }, done);
        };

    describe('when enabled', function () {
        var testrun;

        before(function (done) {
            runWith.call(this, true, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        it('should give every test script of the item the body', function () {
            var assertions = testrun.assertion.getCalls().map(function (call) { return call.args[1][0]; });

            expect(testrun.done.getCall(0).args[0]).to.be.null;
            expect(assertions).to.have.lengthOf(2);
            assertions.forEach(function (assertion) {
                expect(assertion, assertion.name).to.include({ passed: true });
            });
        });

        it('should move the body to the sandbox for the last script', function () {
            expect(testrun.response.getCall(0).args[2].stream.length).to.equal(0);
        });
    });

    describe('when disabled', function () {
        var testrun;

        before(function (done) {
            runWith.call(this, false, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        it('should keep the body on the host', function () {
            expect(testrun.response.getCall(0).args[2].stream.length).to.be.above(0);
        });
    });

    describe('with a nested run', function () {
        var testrun;

        before(function (done) {
            this.run({
                script: {
                    transferResponseBody: true,
                    requestResolver: function (_requestId, _nestedRequestContext, callback) {
                        callback(null, {
                            item: {
                                id: 'nested-request-id',
                                event: [bodyCheck('nested script reads the body')],
                                request: `${global.ECHO_SERVER}/get?nested`
                            }
                        });
                    }
                },
                collection: {
                    item: [{
                        event: [{
                            listen: 'test',
                            script: {
                                exec: [
                                    'const nested = await pm.execution.runRequest("nested-request-id");',
                                    'pm.test("caller reads the nested body", function () {',
                                    '    pm.expect(nested.json()).to.have.property("url");',
                                    '});'
                                ]
                            }
                        }],
                        request: `${global.ECHO_SERVER}/get`
                    }]
                }
            }, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        it('should give the nested script and the caller the nested body', function () {
            var assertions = testrun.assertion.getCalls().map(function (call) { return call.args[1][0]; });

            expect(assertions.map(function (a) { return [a.name, a.passed]; })).to.have.deep.members([
                ['nested script reads the body', true],
                ['caller reads the nested body', true]
            ]);
        });
    });
});
