var expect = require('chai').expect;

describe('Hawk authentication', function () {
    var testrun;

    before(function (done) {
        this.run({
            collection: {
                item: [{
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
                        url: 'https://postman-echo.com/auth/hawk',
                        method: 'GET'
                    }
                }]
            }
        }, function (err, results) {
            testrun = results;
            done(err);
        });
    });

    it('should have authorized successfully', function () {
        expect(testrun).to.be.ok;
        expect(testrun).to.nested.include({
            'request.calledOnce': true
        });

        expect(testrun.request.getCall(0).args[0]).to.be.null;

        var response = testrun.request.getCall(0).args[2];
        expect(response).to.have.property('code', 200);
        expect(response.json()).to.have.property('message', 'Hawk Authentication Successful');
    });

    it('should have completed the run', function () {
        expect(testrun).to.be.ok;
        expect(testrun.done.getCall(0).args[0]).to.be.null;
        expect(testrun).to.nested.include({
            'done.calledOnce': true,
            'start.calledOnce': true
        });
    });
});
