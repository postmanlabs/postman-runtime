describe('cookies', function () {
    var _ = require('lodash'),
        testrun;

    before(function (done) {
        this.run({
            collection: {
                item: [{
                    event: [{
                        listen: 'test',
                        script: {
                            type: 'text/javascript',
                            exec: ['tests["working"] = postman.getResponseCookie("foo").value === "bar"']
                        }
                    }],
                    request: 'http://postman-echo.com/cookies/set?foo=bar'
                }, {
                    event: [{
                        listen: 'test',
                        script: {
                            type: 'text/javascript',
                            exec: ['tests["working"] = postman.getResponseCookie("foo").value === "bar"']
                        }
                    }],
                    request: 'http://postman-echo.com/cookies/get'
                }]
            }
        }, function (err, results) {
            testrun = results;
            done(err);
        });
    });

    it('must have run the test script successfully', function () {
        expect(testrun).be.ok();
        expect(testrun.test.calledTwice).be.ok();

        expect(testrun.test.getCall(0).args[0]).to.be(null);
        expect(_.find(testrun.test.getCall(0).args[2][0].result.cookies, {name: 'foo'})).to.have
            .property('value', 'bar');
        expect(_.get(testrun.test.getCall(0).args[2], '0.result.request.headers.reference.cookie.value')).to
            .match(/foo=bar;/);

        expect(testrun.test.getCall(1).args[0]).to.be(null);
        expect(_.find(testrun.test.getCall(1).args[2][0].result.cookies, {name: 'foo'})).to.have
            .property('value', 'bar');
        expect(_.get(testrun.test.getCall(1).args[2], '0.result.request.headers.reference.cookie.value')).to
            .match(/foo=bar;/);
    });

    it('must have completed the run', function () {
        expect(testrun).be.ok();
        expect(testrun.done.calledOnce).be.ok();
        expect(testrun.done.getCall(0).args[0]).to.be(null);
        expect(testrun.start.calledOnce).be.ok();
    });
});
