var sinon = require('sinon'),
    expect = require('chai').expect;

(typeof window === 'undefined' ? describe : describe.skip)('Cookies expiry in response callback', function () {
    var testrun;

    before(function (done) {
        this.run({
            collection: {
                item: [{
                    request: {
                        url: `${global.ECHO_SERVER}/response-headers?` +
                            'Set-Cookie=cookie_1%3Dvalue_1%3B%20path%3D%2F&' +
                            'Set-Cookie=cookie_2%3Dvalue_2%3B%20path%3D%2F%3B%20Max-Age%3D1000'
                    }
                }]
            }
        }, function (err, result) {
            testrun = result;
            done(err);
        });
    });

    it('should complete the run', function () {
        expect(testrun).to.be.ok;
        sinon.assert.calledOnce(testrun.start);
        sinon.assert.calledOnce(testrun.done);
        sinon.assert.calledWith(testrun.done.getCall(0), null);
    });

    it('should have null expiry for session cookie', function () {
        var cookie = testrun.response.getCall(0).args[5].find({ name: 'cookie_1' });

        expect(cookie.expires).to.be.null;
    });


    it('should have expiry for cookie with Max-Age>0', function () {
        var cookie = testrun.response.getCall(0).args[5].find({ name: 'cookie_2' });

        expect(cookie.expires).to.be.ok;
        expect(cookie.expires).to.be.instanceOf(Date);
    });
});
