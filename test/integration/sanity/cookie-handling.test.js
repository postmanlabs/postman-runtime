var expect = require('chai').expect;

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
                    request: 'https://postman-echo.com/cookies/set?foo=bar'
                }, {
                    event: [{
                        listen: 'test',
                        script: {
                            type: 'text/javascript',
                            exec: ['tests["working"] = postman.getResponseCookie("foo").value === "bar"']
                        }
                    }],
                    request: 'https://postman-echo.com/cookies/get'
                }]
            }
        }, function (err, results) {
            testrun = results;
            done(err);
        });
    });

    it('should have run the test script successfully', function () {
        expect(testrun).to.be.ok;
        expect(testrun).to.nested.include({
            'test.calledTwice': true
        });

        expect(testrun.test.getCall(0).args[0]).to.be.null;
        expect(_.find(testrun.test.getCall(0).args[2][0].result.cookies, {name: 'foo'})).to.have
            .property('value', 'bar');
        expect(_.get(testrun.test.getCall(0).args[2], '0.result.request.headers.reference.cookie.value')).to
            .match(/foo=bar;/);

        expect(testrun.test.getCall(1).args[0]).to.be.null;
        expect(_.find(testrun.test.getCall(1).args[2][0].result.cookies, {name: 'foo'})).to.have
            .property('value', 'bar');
        expect(_.get(testrun.test.getCall(1).args[2], '0.result.request.headers.reference.cookie.value')).to
            .match(/foo=bar;/);
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
