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
});
