var expect = require('chai').expect;

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
                    values: [{key: 'url', value: 'https://postman-echo.com'}]
                }
            }, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        it('should have started and completed the test run', function () {
            expect(testrun).to.be.ok;
            expect(testrun).to.nested.include({
                'done.calledOnce': true,
                'start.calledOnce': true
            });
        });

        it('should parse the url after variable resolution and path variable resolution', function () {
            var request = testrun.beforeRequest.getCall(0).args[2];

            expect(testrun).to.nested.include({ // one request
                'beforeRequest.calledOnce': true
            });
            expect(request).to.be.ok;
            expect(request.url.host).to.not.match(/^http:\/\/.*/);
            expect(request.url.toString()).eql('https://postman-echo.com/get');
            expect(request).to.have.property('method', 'GET');
        });

        it('should receive response with status code 200 OK', function () {
            var response = testrun.request.getCall(0).args[2];

            expect(testrun).to.nested.include({ // one request
                'request.calledOnce': true
            });
            expect(response).to.have.property('code', 200);
        });
    });

    describe('with nested variables', function () {
        var testrun;

        before(function (done) {
            this.run({
                collection: {
                    item: {
                        request: {
                            url: '{{domain#{{id}}}}/get',
                            method: 'GET'
                        }
                    }
                },
                globals: {
                    values: [
                        {key: 'id', value: '1'},
                        {key: 'domain#1', value: 'https://postman-echo.com'}
                    ]
                }
            }, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        it('should have started and completed the test run', function () {
            expect(testrun).to.be.ok;
            expect(testrun).to.nested.include({
                'done.calledOnce': true,
                'start.calledOnce': true
            });
        });

        it('should parse the url after variable resolution and path variable resolution', function () {
            var request = testrun.beforeRequest.getCall(0).args[2];

            expect(testrun).to.nested.include({ // one request
                'beforeRequest.calledOnce': true
            });
            expect(request).to.be.ok;
            expect(request.url.host).to.not.match(/^http:\/\/.*/);
            expect(request.url.toString()).eql('https://postman-echo.com/get');
            expect(request).to.have.property('method', 'GET');
        });

        it('should receive response with status code 200 OK', function () {
            var response = testrun.request.getCall(0).args[2];

            expect(testrun).to.nested.include({ // one request
                'request.calledOnce': true
            });
            expect(response).to.have.property('code', 200);
        });
    });

    describe('with variables having restricted chars', function () {
        var testrun;

        before(function (done) {
            this.run({
                collection: {
                    item: {
                        request: {
                            url: '{{proto://col}}://{{#host:name#}}/{{p/a/t/h}}',
                            method: 'GET'
                        }
                    }
                },
                globals: {
                    values: [
                        {key: 'proto://col', value: 'https'},
                        {key: '#host:name#', value: 'postman-echo.com'},
                        {key: 'p/a/t/h', value: 'get'}
                    ]
                }
            }, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        it('should have started and completed the test run', function () {
            expect(testrun).to.be.ok;
            expect(testrun).to.nested.include({
                'done.calledOnce': true,
                'start.calledOnce': true
            });
        });

        it('should parse the url after variable resolution and path variable resolution', function () {
            var request = testrun.beforeRequest.getCall(0).args[2];

            expect(testrun).to.nested.include({ // one request
                'beforeRequest.calledOnce': true
            });
            expect(request).to.be.ok;
            expect(request.url.host).to.not.match(/^http:\/\/.*/);
            expect(request.url.toString()).eql('https://postman-echo.com/get');
            expect(request).to.have.property('method', 'GET');
        });

        it('should receive response with status code 200 OK', function () {
            var response = testrun.request.getCall(0).args[2];

            expect(testrun).to.nested.include({ // one request
                'request.calledOnce': true
            });
            expect(response).to.have.property('code', 200);
        });
    });

    describe('empty', function () {
        var testrun;

        before(function (done) {
            this.run({
                collection: {
                    item: {
                        request: {}
                    }
                }
            }, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        it('should have called request event once', function () {
            var emptyUrlErrorMessage = 'runtime:extenstions~request: request url is empty';

            expect(testrun).to.nested.include({
                'request.callCount': 1
            });
            expect(testrun.request.getCall(0)).to.have.deep.nested.property('args[0].message', emptyUrlErrorMessage);
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
