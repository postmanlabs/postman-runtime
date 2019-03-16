var expect = require('chai').expect;

describe('form data', function () {
    describe('multiple values for query parameters', function () {
        var testrun;

        before(function (done) {
            this.run({
                collection: {
                    item: [{
                        request: {
                            url: 'https://postman-echo.com/get?hi=hello&hi=lolol',
                            method: 'GET'
                        }
                    }]
                }
            }, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        it('should have sent the request successfully', function () {
            expect(testrun).to.be.ok;
            expect(testrun).to.nested.include({
                'request.calledOnce': true
            });

            var response = testrun.request.getCall(0).args[2],
                body = response.json();

            expect(body).to.have.deep.nested.property('args.hi', ['hello', 'lolol']);
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

    describe('empty urlencoded body', function () {
        var testrun;

        before(function (done) {
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
            }, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        it('should have sent the request successfully', function () {
            expect(testrun).to.be.ok;
            expect(testrun).to.nested.include({
                'request.calledOnce': true
            });

            var response = testrun.request.getCall(0).args[2];

            expect(response).to.have.property('code', 200);
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

    describe('empty formdata body', function () {
        var testrun;

        before(function (done) {
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
            }, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        it('should have sent the request successfully', function () {
            expect(testrun).to.be.ok;
            expect(testrun).to.nested.include({
                'request.calledOnce': true
            });

            var response = testrun.request.getCall(0).args[2];

            expect(response).to.have.property('code', 200);
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
});
