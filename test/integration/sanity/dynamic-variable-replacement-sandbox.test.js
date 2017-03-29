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

        it('must have sent the request successfully', function () {
            expect(testrun).be.ok();
            expect(testrun.request.calledOnce).be.ok();
            expect(testrun.request.getCall(0).args[0]).to.be(null);
        });

        it('must have replaced the GUID variable', function () {
            var sent = testrun.request.getCall(0).args[3],
                param;

            expect(sent.body.urlencoded).to.be.ok();

            param = sent.body.urlencoded.idx(0);
            expect(param.value)
                .to.match(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/i);
        });

        it('must have completed the run', function () {
            expect(testrun).be.ok();
            expect(testrun.done.calledOnce).be.ok();
            expect(testrun.done.getCall(0).args[0]).to.be(null);
            expect(testrun.start.calledOnce).be.ok();
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

        it('must have sent the request successfully', function () {
            expect(testrun).be.ok();
            expect(testrun.request.calledOnce).be.ok();
            expect(testrun.request.getCall(0).args[0]).to.be(null);
        });

        it('must have replaced the randomInt variable', function () {
            var sent = testrun.request.getCall(0).args[3],
                param;

            expect(sent.body.urlencoded).to.be.ok();

            param = sent.body.urlencoded.idx(0);
            param = _.parseInt(param.value, 10);
            expect(_.isInteger(param)).to.be(true);
        });

        it('must have completed the run', function () {
            expect(testrun).be.ok();
            expect(testrun.done.calledOnce).be.ok();
            expect(testrun.done.getCall(0).args[0]).to.be(null);
            expect(testrun.start.calledOnce).be.ok();
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

        it('must have sent the request successfully', function () {
            expect(testrun).be.ok();
            expect(testrun.request.calledOnce).be.ok();
            expect(testrun.request.getCall(0).args[0]).to.be(null);
        });

        it('must have replaced the timestamp variable', function () {
            var sent = testrun.request.getCall(0).args[3],
                param;

            expect(sent.body.urlencoded).to.be.ok();

            param = sent.body.urlencoded.idx(0);
            param = _.parseInt(param.value, 10);
            expect(_.isInteger(param)).to.be(true);
        });

        it('must have completed the run', function () {
            expect(testrun).be.ok();
            expect(testrun.done.calledOnce).be.ok();
            expect(testrun.done.getCall(0).args[0]).to.be(null);
            expect(testrun.start.calledOnce).be.ok();
        });
    });
});
