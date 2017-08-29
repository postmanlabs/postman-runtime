describe('url', function () {
    describe('with variables', function () {
        var testrun;

        before(function (done) {
            this.run({
                collection: {
                    item: {
                        request: {
                            url: {
                                host: ['{{url}}'],
                                path: [':verb'],
                                variable: [{
                                    value: 'get',
                                    id: 'verb'
                                }]
                            },
                            method: 'GET'
                        }
                    }
                },
                globals: {
                    values: [{key: 'url', value: 'http://postman-echo.com'}]
                }
            }, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        it('must have started and completed the test run', function () {
            expect(testrun).be.ok();
            expect(testrun.done.calledOnce).be.ok();
            expect(testrun.start.calledOnce).be.ok();
        });

        it('must parse the url after variable resolution and path variable resolution', function () {
            var request = testrun.beforeRequest.getCall(0).args[2];

            expect(testrun.beforeRequest.calledOnce).be.ok(); // one request
            expect(request).be.ok();
            expect(request.url.host).to.not.match(/^http:\/\/.*/);
            expect(request.url.toString()).eql('http://postman-echo.com/get');
            expect(request.method).be('GET');
        });

        it('must receive response with status code 200 OK', function () {
            var response = testrun.request.getCall(0).args[2];

            expect(testrun.request.calledOnce).be.ok(); // one request
            expect(response.code).to.be(200);
        });
    });

    describe('empty', function () {
        var testrun;

        before(function(done) {
            this.run({
                collection: {
                    item: {
                        request: {}
                    }
                }
            }, function(err, results) {
                testrun = results;
                done(err);
            });
        });

        it('should have called request event once', function () {
            var emptyUrlErrorMessage = 'runtime:extenstions~request: request url is empty';

            expect(testrun.request.callCount).to.eql(1);
            expect(testrun.request.getCall(0).args[0].message).to.eql(emptyUrlErrorMessage);
        });

        it('must have completed the run', function() {
            expect(testrun).be.ok();
            expect(testrun.done.calledOnce).be.ok();
            expect(testrun.done.getCall(0).args[0]).to.be(null);
            expect(testrun.start.calledOnce).be.ok();
        });
    });
});
