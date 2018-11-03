var expect = require('chai').expect;

describe('bearer token', function () {
    var testrun,
        TOKEN = 'abcd1234',
        runOptions = {
            collection: {
                item: {
                    name: 'BearerToken Sample Item',
                    request: {
                        url: 'https://postman-echo.com/headers',
                        auth: {
                            type: 'bearer',
                            bearer: {
                                token: '{{token}}'
                            }
                        }
                    }
                }
            }
        };

    describe('with correct details', function () {
        before(function (done) {
            runOptions.environment = {
                values: [{
                    key: 'token',
                    value: TOKEN
                }]
            };
            // perform the collection run
            this.run(runOptions, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        it('should have completed the run', function () {
            expect(testrun).to.be.ok;
            expect(testrun).to.nested.include({
                'done.callCount': 1
            });
            testrun.done.getCall(0).args[0] && console.error(testrun.done.getCall(0).args[0].stack);
            expect(testrun.done.getCall(0).args[0]).to.be.null;
            expect(testrun).to.nested.include({
                'start.callCount': 1
            });
        });

        it('should have sent the request once', function () {
            expect(testrun).to.nested.include({
                'request.callCount': 1
            });

            var response = testrun.request.firstCall.args[2];

            expect(response.json()).to.nested.include({
                'headers.authorization': 'Bearer ' + TOKEN
            });
        });
    });

    // @todo Once we have a test server for bearer token auth
    // 1. update the above test cases to use bearer token protected end point
    // 2. add test cases to check with incorret details
});
