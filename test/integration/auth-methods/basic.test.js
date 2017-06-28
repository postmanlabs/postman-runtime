describe('basic auth', function () {
    var testrun;

    before(function (done) {
        // perform the collection run
        this.run({
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
            },
            environment: {
                values: [{
                    key: 'uname',
                    value: 'postman'
                }, {
                    key: 'pass',
                    value: 'password'
                }]
            },
            authorizer: {interactive: true}
        }, function (err, results) {
            testrun = results;
            done(err);
        });
    });

    it('must have completed the run', function () {
        expect(testrun).be.ok();
        expect(testrun.done.calledOnce).be.ok();
        testrun.done.getCall(0).args[0] && console.error(testrun.done.getCall(0).args[0].stack);
        expect(testrun.done.getCall(0).args[0]).to.be(null);
        expect(testrun.start.calledOnce).be.ok();
    });

    it('must have sent the request once', function () {
        expect(testrun.request.calledOnce).be.ok();

        var err = testrun.request.firstCall.args[0],
            request = testrun.request.firstCall.args[3],
            response = testrun.request.firstCall.args[2];

        expect(err).to.be(null);
        expect(request.url.toString()).to.eql('https://postman-echo.com/basic-auth');
        expect(response.code).to.eql(200);
    });
});
