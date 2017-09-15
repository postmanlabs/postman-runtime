var expect = require('expect.js');

describe('NTLM', function () {
    var testrun,
        runOptions = {
            collection: {
                item: {
                    name: 'NTLM Sample Request',
                    request: {
                        url: 'http://52.170.211.245',
                        auth: {
                            type: 'ntlm',
                            ntlm: {
                                username: '{{uname}}',
                                password: '{{pass}}'
                            }
                        }
                    }
                }
            },
            authorizer: {
                interactive: true
            }
        };

    describe('with in-correct details', function () {
        before(function (done) {
            runOptions.environment = {
                values: [{
                    key: 'uname',
                    value: 'foo'
                }, {
                    key: 'pass',
                    value: 'bar'
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

        it('must have sent the request thrice', function () {
            expect(testrun.request.callCount).to.be(3);

            var err = testrun.request.firstCall.args[0],
                response = testrun.request.firstCall.args[2];

            expect(err).to.be(null);
            expect(response.code).to.eql(401);
        });
    });

    describe('with correct details', function () {
        before(function (done) {
            runOptions.environment = {
                values: [{
                    key: 'uname',
                    value: 'harryi3t'
                }, {
                    key: 'pass',
                    value: '1234'
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

        it('must have sent the request thrice', function () {
            expect(testrun.request.callCount).to.be(3);

            var err = testrun.request.thirdCall.args[0],
                response = testrun.request.thirdCall.args[2];

            expect(err).to.be(null);
            expect(response.code).to.eql(200);
        });
    });

});
