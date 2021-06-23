var expect = require('chai').expect;

(typeof window === 'undefined' ? describe : describe.skip)('cookies', function () {
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
                }, {
                    event: [{
                        listen: 'test',
                        script: {
                            type: 'text/javascript',
                            exec: ['tests["working"] = postman.getResponseCookie("foo").value === "bar"']
                        }
                    }],
                    request: global.servers.http + '/redirect-to?url=' + encodeURI('https://postman-echo.com/cookies')
                }]
            }
        }, function (err, results) {
            testrun = results;
            done(err);
        });
    });

    it('should have completed the run', function () {
        expect(testrun).to.be.ok;
        expect(testrun.done.getCall(0).args[0]).to.be.null;
        expect(testrun).to.nested.include({
            'done.calledOnce': true,
            'start.calledOnce': true
        });
    });

    it('should have run the test script successfully', function () {
        expect(testrun).to.nested.include({
            'test.calledThrice': true
        });

        const t1 = testrun.test.getCall(0).args,
            t2 = testrun.test.getCall(1).args,
            t3 = testrun.test.getCall(2).args;

        expect(t1[0]).to.be.null;
        expect(_.find(t1[2][0].result.cookies, {name: 'foo'})).to.have.property('value', 'bar');

        expect(t2[0]).to.be.null;
        expect(_.find(t2[2][0].result.cookies, {name: 'foo'})).to.have.property('value', 'bar');
        expect(_.get(t2[2], '0.result.request.headers.reference.cookie.value')).to.match(/foo=bar;/);

        // redirect request
        expect(t3[0]).to.be.null;
        expect(_.find(t3[2][0].result.cookies, {name: 'foo'})).to.have.property('value', 'bar');
        expect(_.get(t3[2], '0.result.request.headers.reference.cookie')).to.be.undefined;
    });

    it('should have CookieList in the response callback', function () {
        expect(testrun).to.nested.include({
            'response.calledThrice': true
        });

        const c1 = testrun.response.getCall(1).args[5],
            c2 = testrun.response.getCall(1).args[5],
            c3 = testrun.response.getCall(2).args[5];

        expect(c1.get('foo')).to.equal('bar');
        expect(c2.get('foo')).to.equal('bar');
        expect(c3.get('foo')).to.equal('bar'); // redirect
    });
});
