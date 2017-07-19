describe('form data', function () {
    describe('multiple values for query parameters', function () {
        var testrun;

        before(function(done) {
            this.run({
                collection: {
                    item: [{
                        request: {
                            url: 'https://postman-echo.com/get?hi=hello&hi=lolol',
                            method: 'GET'
                        }
                    }]
                }
            }, function(err, results) {
                testrun = results;
                done(err);
            });
        });

        it('must have sent the request successfully', function() {
            expect(testrun).be.ok();
            expect(testrun.request.calledOnce).be.ok();

            var response = testrun.request.getCall(0).args[2],
                body = response.json();
            expect(body).to.have.property('args');
            expect(body.args).to.have.property('hi');
            expect(body.args.hi).to.eql(['hello', 'lolol']);
        });

        it('must have completed the run', function() {
            expect(testrun).be.ok();
            expect(testrun.done.calledOnce).be.ok();
            expect(testrun.done.getCall(0).args[0]).to.be(null);
            expect(testrun.start.calledOnce).be.ok();
        });
    });

    describe('empty urlencoded body', function () {
        var testrun;

        before(function(done) {
            this.run({
                collection: {
                    item: [{
                        request: {
                            url: 'https://postman-echo.com/post',
                            method: 'POST',
                            body: {
                                mode: 'urlencoded',
                                urlencoded: []
                            }
                        }
                    }]
                }
            }, function(err, results) {
                testrun = results;
                done(err);
            });
        });

        it('must have sent the request successfully', function() {
            expect(testrun).be.ok();
            expect(testrun.request.calledOnce).be.ok();

            var response = testrun.request.getCall(0).args[2];
            expect(response.code).to.eql(200);
        });

        it('must have completed the run', function() {
            expect(testrun).be.ok();
            expect(testrun.done.calledOnce).be.ok();
            expect(testrun.done.getCall(0).args[0]).to.be(null);
            expect(testrun.start.calledOnce).be.ok();
        });
    });

    describe('empty formdata body', function () {
        var testrun;

        before(function(done) {
            this.run({
                collection: {
                    item: [{
                        request: {
                            url: 'https://postman-echo.com/post',
                            method: 'POST',
                            body: {
                                mode: 'formdata',
                                formdata: []
                            }
                        }
                    }]
                }
            }, function(err, results) {
                testrun = results;
                done(err);
            });
        });

        it('must have sent the request successfully', function() {
            expect(testrun).be.ok();
            expect(testrun.request.calledOnce).be.ok();

            var response = testrun.request.getCall(0).args[2];
            expect(response.code).to.eql(200);
        });

        it('must have completed the run', function() {
            expect(testrun).be.ok();
            expect(testrun.done.calledOnce).be.ok();
            expect(testrun.done.getCall(0).args[0]).to.be(null);
            expect(testrun.start.calledOnce).be.ok();
        });
    });
});
