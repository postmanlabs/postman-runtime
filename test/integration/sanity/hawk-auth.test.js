describe('HAWK authentication', function () {
    var _ = require('lodash'),
        testrun;

    before(function (done) {
        this.run({
            collection: {
                item: [{
                    event: [{
                        listen: 'test',
                        script: {
                            exec: ['var response = JSON.parse(responseBody);',
                                'tests["working"] = response.status === "pass";']
                        }
                    }],
                    request: {
                        auth: {
                            type: 'hawk',
                            hawk: {
                                authId: 'dh37fgj492je',
                                authKey: 'werxhqb98rpaxn39848xrunpaw3489ruxnpa98w4rxn',
                                algorithm: 'sha256',
                                user: 'asda',
                                saveHelperData: true,
                                nonce: 'eFRP2o',
                                extraData: 'skjdfklsjhdflkjhsdf',
                                appId: '',
                                delegation: '',
                                timestamp: ''
                            }
                        },
                        url: 'http://postman-echo.com/auth/hawk',
                        method: 'GET',
                        header: [{
                            key: 'Authorization',
                            value: 'Hawk id=\'dh37fgj492je\', ts=\'1448888081\', nonce=\'HoH6Ay\', ext=\'skjdfklsjhdflkjhsdf\', mac=\'moWleO5f/8QbvIiy7oo2zj1bmezhrYwrCkz4BsXg0M4=\''
                        }]
                    }
                }]
            }
        }, function (err, results) {
            testrun = results;
            done(err);
        });
    });

    it('must have run the test script successfully', function () {
        expect(testrun).be.ok();
        expect(testrun.test.calledOnce).be.ok();

        expect(testrun.test.getCall(0).args[0]).to.be(null);
        expect(_.get(testrun.test.getCall(0).args[2], '0.result.globals.tests.working')).to.be(true);
    });

    it('must have completed the run', function () {
        expect(testrun).be.ok();
        expect(testrun.done.calledOnce).be.ok();
        expect(testrun.done.getCall(0).args[0]).to.be(null);
        expect(testrun.start.calledOnce).be.ok();
    });
});
