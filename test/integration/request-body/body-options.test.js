var expect = require('chai').expect;

describe('raw mode language', function () {
    var testrun,
        HOST = 'https://postman-echo.com/post';

    describe('without options', function () {
        before(function (done) {
            this.run({
                collection: {
                    item: [{
                        request: {
                            url: HOST,
                            method: 'POST',
                            body: {
                                mode: 'raw',
                                raw: 'POSTMAN'
                            }
                        }
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
                'start.calledOnce': true,
                'request.calledOnce': true,
                'response.calledOnce': true
            });
        });

        it('should set text/plain content-type by default', function () {
            var response = testrun.response.getCall(0).args[2],
                responseBody = JSON.parse(response.stream.toString());

            expect(response).to.have.property('code', 200);
            expect(responseBody).to.have.property('data', 'POSTMAN');
            expect(responseBody.headers).to.have.property('content-type', 'text/plain');
        });
    });

    describe('with valid language', function () {
        before(function (done) {
            this.run({
                collection: {
                    item: [{
                        request: {
                            url: HOST,
                            method: 'POST',
                            body: {
                                mode: 'raw',
                                raw: '{ "foo": "bar" }',
                                options: {
                                    raw: {
                                        language: 'json'
                                    }
                                }
                            }
                        }
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
                'start.calledOnce': true,
                'request.calledOnce': true,
                'response.calledOnce': true
            });
        });

        it('should set content-type according to specified language', function () {
            var response = testrun.response.getCall(0).args[2],
                responseBody = JSON.parse(response.stream.toString());

            expect(response).to.have.property('code', 200);
            expect(responseBody).to.have.property('data').that.eql({foo: 'bar'});
            expect(responseBody.headers).to.have.property('content-type', 'application/json');
        });
    });

    describe('with invalid language', function () {
        before(function (done) {
            this.run({
                collection: {
                    item: [{
                        request: {
                            url: HOST,
                            method: 'POST',
                            body: {
                                mode: 'raw',
                                raw: '{ "foo": "bar" }',
                                options: {
                                    raw: {
                                        language: 'graphql'
                                    }
                                }
                            }
                        }
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
                'start.calledOnce': true,
                'request.calledOnce': true,
                'response.calledOnce': true
            });
        });

        it('should set text/plain content-type as a fallback', function () {
            var response = testrun.response.getCall(0).args[2],
                responseBody = JSON.parse(response.stream.toString());

            expect(response).to.have.property('code', 200);
            expect(responseBody).to.have.property('data', '{ "foo": "bar" }');
            expect(responseBody.headers).to.have.property('content-type', 'text/plain');
        });
    });

    describe('with language and content-type', function () {
        before(function (done) {
            this.run({
                collection: {
                    item: [{
                        request: {
                            url: HOST,
                            method: 'POST',
                            header: [{
                                key: 'content-type',
                                value: 'text/something'
                            }],
                            body: {
                                mode: 'raw',
                                raw: '{ "foo": "bar" }',
                                options: {
                                    raw: {
                                        language: 'json'
                                    }
                                }
                            }
                        }
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
                'start.calledOnce': true,
                'request.calledOnce': true,
                'response.calledOnce': true
            });
        });

        it('should not override existing content-type', function () {
            var response = testrun.response.getCall(0).args[2],
                responseBody = JSON.parse(response.stream.toString());

            expect(response).to.have.property('code', 200);
            expect(responseBody).to.have.property('data', '{ "foo": "bar" }');
            expect(responseBody.headers).to.have.property('content-type', 'text/something');
        });
    });
});
