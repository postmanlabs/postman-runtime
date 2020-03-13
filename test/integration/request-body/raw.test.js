var expect = require('chai').expect;

describe('Request Body Mode: raw', function () {
    var testrun,
        HOST = 'https://postman-echo.com/post';

    describe('with string', function () {
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

        it('should post raw string', function () {
            var response = testrun.response.getCall(0).args[2],
                responseBody = JSON.parse(response.stream.toString());

            expect(response).to.have.property('code', 200);
            expect(responseBody).to.have.property('data', 'POSTMAN');
            expect(responseBody.headers).to.have.property('content-type', 'text/plain');
        });
    });

    describe('with object', function () {
        before(function (done) {
            this.run({
                collection: {
                    item: [{
                        request: {
                            url: HOST,
                            header: [{
                                key: 'content-type',
                                value: 'text/plain'
                            }],
                            method: 'POST',
                            body: {
                                mode: 'raw',
                                raw: {
                                    name: 'POSTMAN'
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

        it('should post stringified object', function () {
            var response = testrun.response.getCall(0).args[2],
                responseBody = JSON.parse(response.stream.toString());

            expect(response).to.have.property('code', 200);
            expect(responseBody).to.have.property('data', JSON.stringify({
                name: 'POSTMAN'
            }));
            expect(responseBody.headers).to.have.property('content-type', 'text/plain');
        });
    });

    describe('with number', function () {
        before(function (done) {
            this.run({
                collection: {
                    item: [{
                        request: {
                            url: HOST,
                            method: 'POST',
                            body: {
                                mode: 'raw',
                                raw: 12345
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

        // @note RequestBody~isEmpty returns true for number
        it('should post empty body', function () {
            var response = testrun.response.getCall(0).args[2],
                responseBody = JSON.parse(response.stream.toString());

            expect(response).to.have.property('code', 200);
            expect(responseBody).to.have.property('data').that.is.empty;
        });
    });

    describe('with null', function () {
        before(function (done) {
            this.run({
                collection: {
                    item: [{
                        request: {
                            url: HOST,
                            method: 'POST',
                            body: {
                                mode: 'raw',
                                raw: null
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

        it('should post empty body', function () {
            var response = testrun.response.getCall(0).args[2],
                responseBody = JSON.parse(response.stream.toString());

            expect(response).to.have.property('code', 200);
            expect(responseBody).to.have.property('data').that.is.empty;
        });
    });

    describe('with undefined', function () {
        before(function (done) {
            this.run({
                collection: {
                    item: [{
                        request: {
                            url: HOST,
                            method: 'POST',
                            body: {
                                mode: 'raw',
                                raw: undefined
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

        it('should post empty body', function () {
            var response = testrun.response.getCall(0).args[2],
                responseBody = JSON.parse(response.stream.toString());

            expect(response).to.have.property('code', 200);
            expect(responseBody).to.have.property('data').that.is.empty;
        });
    });

    describe('with custom content-type', function () {
        before(function (done) {
            this.run({
                collection: {
                    item: [{
                        request: {
                            url: HOST,
                            header: [{
                                key: 'content-type',
                                value: 'application/xml'
                            }, {
                                key: 'content-type',
                                value: 'application/json',
                                disabled: true
                            }],
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

        it('should honor custom content-type header', function () {
            var response = testrun.response.getCall(0).args[2],
                responseBody = JSON.parse(response.stream.toString());

            expect(response).to.have.property('code', 200);
            expect(responseBody).to.have.property('data', 'POSTMAN');
            expect(responseBody.headers).to.have.property('content-type', 'application/xml');
        });
    });

    describe('with disabled content-type', function () {
        before(function (done) {
            this.run({
                collection: {
                    item: [{
                        request: {
                            url: HOST,
                            header: [{
                                key: 'content-type',
                                value: 'application/xml',
                                disabled: true
                            }, {
                                key: 'content-type',
                                value: 'application/json',
                                disabled: true
                            }],
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

        it('should handle disabled content-type header', function () {
            var response = testrun.response.getCall(0).args[2],
                responseBody = JSON.parse(response.stream.toString());

            expect(response).to.have.property('code', 200);
            expect(responseBody).to.have.property('data', 'POSTMAN');
            expect(responseBody.headers).to.have.property('content-type', 'text/plain');
        });
    });
});
