describe('basic auth', function () {
    var testrun,
        runOptions = {
            collection: {
                item: {
                    name: 'DigestAuth',
                    request: {
                        url: 'https://postman-echo.com/basic-auth',
                        auth: {
                            type: 'basic',
                            basic: {
                                username: '{{uname}}',
                                password: '{{pass}}'
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
                    key: 'uname',
                    value: 'postman'
                }, {
                    key: 'pass',
                    value: 'password'
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

            var err = testrun.request.firstCall.args[0],
                request = testrun.request.firstCall.args[3],
                response = testrun.request.firstCall.args[2];

            expect(err).to.be(null);
            expect(request.url.toString()).to.eql('https://postman-echo.com/basic-auth');
            expect(response.code).to.eql(200);
        });
    });

    describe('with incorrect details', function () {
        before(function (done) {
            runOptions.environment = {
                values: [{
                    key: 'uname',
                    value: 'iamnotpostman'
                }, {
                    key: 'pass',
                    value: 'password'
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

            var err = testrun.request.firstCall.args[0],
                request = testrun.request.lastCall.args[3],
                response = testrun.request.lastCall.args[2];

            expect(err).to.be(null);
            expect(request.url.toString()).to.eql('https://postman-echo.com/basic-auth');
            expect(response.code).to.eql(401);
        });
    });
});
