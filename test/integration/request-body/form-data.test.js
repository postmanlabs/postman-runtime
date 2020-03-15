var expect = require('chai').expect;

describe('Request Body Mode: formdata', function () {
    var testrun,
        HOST = 'https://postman-echo.com/post';

    describe('with string as value', function () {
        before(function (done) {
            this.run({
                collection: {
                    item: [{
                        request: {
                            url: HOST,
                            method: 'POST',
                            body: {
                                mode: 'formdata',
                                formdata: [
                                    {key: 'foo', value: 'bar'}
                                ]
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

        it('should post form-data with given string as value', function () {
            var response = testrun.response.getCall(0).args[2],
                responseBody = response.json();

            expect(response).to.have.property('code', 200);
            expect(responseBody).to.have.deep.property('form', {foo: 'bar'});
        });
    });

    describe('with object as value', function () {
        before(function (done) {
            this.run({
                collection: {
                    item: [{
                        request: {
                            url: HOST,
                            method: 'POST',
                            body: {
                                mode: 'formdata',
                                formdata: [
                                    {key: 'foo', value: {bar: 'baz'}}
                                ]
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

        it('should post stringified object as form-data value', function () {
            var response = testrun.response.getCall(0).args[2],
                responseBody = response.json();

            expect(response).to.have.property('code', 200);
            expect(responseBody).to.have.deep.property('form', {foo: '{"bar":"baz"}'});
        });
    });

    describe('with number as value', function () {
        before(function (done) {
            this.run({
                collection: {
                    item: [{
                        request: {
                            url: HOST,
                            method: 'POST',
                            body: {
                                mode: 'formdata',
                                formdata: [
                                    {key: 'foo', value: 123}
                                ]
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

        it('should post form-data with given number as value', function () {
            var response = testrun.response.getCall(0).args[2],
                responseBody = response.json();

            expect(response).to.have.property('code', 200);
            expect(responseBody).to.have.deep.property('form', {foo: '123'});
        });
    });

    describe('with null value', function () {
        before(function (done) {
            this.run({
                collection: {
                    item: [{
                        request: {
                            url: HOST,
                            method: 'POST',
                            body: {
                                mode: 'formdata',
                                formdata: [
                                    {key: 'foo', value: null}
                                ]
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

        it('should post empty form-data', function () {
            var response = testrun.response.getCall(0).args[2],
                responseBody = response.json();

            expect(response).to.have.property('code', 200);
            expect(responseBody).to.have.deep.property('form', {foo: ''});
        });
    });

    describe('with undefined value', function () {
        before(function (done) {
            this.run({
                collection: {
                    item: [{
                        request: {
                            url: HOST,
                            method: 'POST',
                            body: {
                                mode: 'formdata',
                                formdata: [
                                    {key: 'foo', value: undefined}
                                ]
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

        it('should post empty form-data', function () {
            var response = testrun.response.getCall(0).args[2],
                responseBody = response.json();

            expect(response).to.have.property('code', 200);
            expect(responseBody).to.have.deep.property('form', {foo: ''});
        });
    });

    describe('with undefined value of type file', function () {
        before(function (done) {
            this.run({
                collection: {
                    item: [{
                        request: {
                            url: HOST,
                            method: 'POST',
                            body: {
                                mode: 'formdata',
                                formdata: [
                                    {key: 'foo', type: 'file'}
                                ]
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

        it('should post empty form-data', function () {
            var response = testrun.response.getCall(0).args[2],
                responseBody = response.json();

            expect(response).to.have.property('code', 200);
            expect(responseBody).to.have.deep.property('files', {'': 'data:application/octet-stream;base64,'});
        });
    });

    describe('with disabled params', function () {
        before(function (done) {
            this.run({
                collection: {
                    item: [{
                        request: {
                            url: HOST,
                            method: 'POST',
                            body: {
                                mode: 'formdata',
                                formdata: [
                                    {key: 'foo', value: 'bar', disabled: true},
                                    {key: 'bar', value: 'foo', disabled: true}
                                ]
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

        it('should not post form-data', function () {
            var response = testrun.response.getCall(0).args[2],
                responseBody = response.json();

            expect(response).to.have.property('code', 200);
            expect(responseBody).to.have.deep.property('form', {});
            expect(responseBody.headers).to.not.have.property('content-type');
        });
    });

    describe('with invalid content-type', function () {
        before(function (done) {
            this.run({
                collection: {
                    item: [{
                        request: {
                            url: HOST,
                            method: 'POST',
                            header: [{
                                key: 'content-type',
                                value: 'something/else'
                            }],
                            body: {
                                mode: 'formdata',
                                formdata: [
                                    {key: 'foo', value: 'bar'}
                                ]
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

        it('should override with a valid content-type', function () {
            var response = testrun.response.getCall(0).args[2],
                responseBody = response.json();

            expect(response).to.have.property('code', 200);
            expect(responseBody.headers).to.have.property('content-length', '161');
            expect(responseBody.headers).to.have.property('content-type');
            expect(responseBody.headers).to.have.property('content-type')
                .that.match(/multipart\/form-data; boundary=--------------------------\d+/);
            expect(responseBody).to.have.deep.property('form', {foo: 'bar'});
        });
    });

    describe('with invalid content-type and disabled header', function () {
        before(function (done) {
            this.run({
                collection: {
                    item: [{
                        request: {
                            url: HOST,
                            method: 'POST',
                            header: [{
                                key: 'content-type',
                                value: 'something/else'
                            }],
                            body: {
                                mode: 'formdata',
                                formdata: [
                                    {key: 'foo', value: 'bar'}
                                ]
                            }
                        },
                        protocolProfileBehavior: {
                            disabledSystemHeaders: {
                                'content-type': true
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

        it('should honor custom content-type', function () {
            var response = testrun.response.getCall(0).args[2],
                responseBody = response.json();

            expect(response).to.have.property('code', 200);
            expect(responseBody.headers).to.have.property('content-length', '161');
            expect(responseBody.headers).to.have.property('content-type', 'something/else');
        });
    });
});
