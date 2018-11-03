var expect = require('chai').expect;

describe('Dynamic Variables', function () {
    var _ = require('lodash');

    describe('{{$guid}}', function () {
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
                                urlencoded: [
                                    {key: 'FriendlyName', value: '{{$guid}}', type: 'text', enabled: true}
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

        it('should have sent the request successfully', function () {
            expect(testrun).to.be.ok;
            expect(testrun).to.nested.include({
                'request.calledOnce': true
            });
            expect(testrun.request.getCall(0).args[0]).to.be.null;
        });

        it('should have replaced the GUID variable', function () {
            var sent = testrun.request.getCall(0).args[3],
                param;

            expect(sent.body.urlencoded).to.be.ok;

            param = sent.body.urlencoded.idx(0);
            expect(param).to.have.property('value')
                .that.match(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/i);
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

    describe('{{$randomInt}}', function () {
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
                                urlencoded: [{key: 'RandomId', value: '{{$randomInt}}', type: 'text', enabled: true}]
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
            expect(testrun.request.getCall(0).args[0]).to.be.null;
        });

        it('should have replaced the randomInt variable', function () {
            var sent = testrun.request.getCall(0).args[3],
                param;

            expect(sent.body.urlencoded).to.be.ok;

            param = sent.body.urlencoded.idx(0);
            param = _.parseInt(param.value, 10);
            expect(param).to.be.a('number');
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

    describe('{{$timestamp}}', function () {
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
                                urlencoded: [{key: 'TimeCreated', value: '{{$timestamp}}', type: 'text', enabled: true}]
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
            expect(testrun.request.getCall(0).args[0]).to.be.null;
        });

        it('should have replaced the timestamp variable', function () {
            var sent = testrun.request.getCall(0).args[3],
                param;

            expect(sent.body.urlencoded).to.be.ok;

            param = sent.body.urlencoded.idx(0);
            param = _.parseInt(param.value, 10);
            expect(param).to.be.a('number');
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
