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

        it('must have completed the run', function () {
            expect(testrun).be.ok();
            expect(testrun.done.callCount).to.be(1);
            testrun.done.getCall(0).args[0] && console.error(testrun.done.getCall(0).args[0].stack);
            expect(testrun.done.getCall(0).args[0]).to.be(null);
            expect(testrun.start.callCount).to.be(1);
        });

        it('must have sent the request once', function () {
            expect(testrun.request.callCount).to.be(1);

            var response = testrun.request.firstCall.args[2];

            expect(response.json()).to.have.property('headers');
            expect(response.json().headers).to.have.property('authorization', 'Bearer ' + TOKEN);
        });
    });

    // @todo Once we have a test server for bearer token auth
    // 1. update the above test cases to use bearer token protected end point
    // 2. add test cases to check with incorret details
});
