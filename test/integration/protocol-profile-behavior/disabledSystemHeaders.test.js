var sinon = require('sinon'),
    expect = require('chai').expect;

describe('protocolProfileBehavior', function () {
    var testrun;

    describe('with disabledSystemHeaders: undefined', function () {
        before(function (done) {
            this.run({
                collection: {
                    item: [{
                        request: {
                            url: global.servers.raw,
                            method: 'GET'
                        }
                    }]
                }
            }, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        it('should complete the run', function () {
            expect(testrun).to.be.ok;
            sinon.assert.calledOnce(testrun.start);
            sinon.assert.calledOnce(testrun.done);
            sinon.assert.calledWith(testrun.done.getCall(0), null);
        });

        it('should send all the system headers by default', function () {
            sinon.assert.calledOnce(testrun.request);
            sinon.assert.calledWith(testrun.request.getCall(0), null);

            sinon.assert.calledOnce(testrun.response);
            sinon.assert.calledWith(testrun.response.getCall(0), null);

            var response = testrun.request.getCall(0).args[2].stream.toString();

            expect(response).to.include('GET / HTTP/1.1');
            expect(response).to.include('User-Agent: PostmanRuntime/');
            expect(response).to.include('Accept: */*');
            expect(response).to.include('Cache-Control: no-cache');
            expect(response).to.include('Postman-Token: ');
            expect(response).to.include('Host: localhost:');
            expect(response).to.include('Accept-Encoding: gzip, deflate, br');
            expect(response).to.include('Connection: keep-alive');
        });
    });

    describe('with disabledSystemHeaders', function () {
        before(function (done) {
            this.run({
                collection: {
                    item: [{
                        request: {
                            url: global.servers.raw,
                            method: 'POST',
                            body: {
                                mode: 'raw',
                                raw: 'foo=bar'
                            }
                        },
                        protocolProfileBehavior: {
                            disabledSystemHeaders: {
                                'content-type': true,
                                'content-length': true,
                                'user-agent': true,
                                'accept': true,
                                'cache-control': true,
                                'postman-token': true,
                                'host': true,
                                'accept-encoding': true,
                                'connection': true
                            }
                        }
                    }]
                }
            }, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        it('should complete the run', function () {
            expect(testrun).to.be.ok;
            sinon.assert.calledOnce(testrun.start);
            sinon.assert.calledOnce(testrun.done);
            sinon.assert.calledWith(testrun.done.getCall(0), null);
        });

        it('should send body with GET method', function () {
            sinon.assert.calledOnce(testrun.request);
            sinon.assert.calledWith(testrun.request.getCall(0), null);

            sinon.assert.calledOnce(testrun.response);
            sinon.assert.calledWith(testrun.response.getCall(0), null);

            var response = testrun.request.getCall(0).args[2].stream.toString();

            expect(response).to.equals('POST / HTTP/1.1\r\n\r\nfoo=bar');
        });
    });

    describe('with user override', function () {
        before(function (done) {
            this.run({
                collection: {
                    item: [{
                        request: {
                            url: global.servers.raw,
                            method: 'POST',
                            header: [{
                                key: 'content-type',
                                value: 'something/else'
                            }, {
                                key: 'content-type',
                                value: 'text/plain',
                                disabled: true
                            }, {
                                key: 'content-length',
                                value: '1',
                                disabled: true
                            }, {
                                key: 'content-length',
                                value: '2',
                                disabled: true
                            }],
                            body: {
                                mode: 'raw',
                                raw: 'foo=bar'
                            }
                        },
                        protocolProfileBehavior: {
                            disabledSystemHeaders: {
                                'content-type': true,
                                'content-length': true,
                                'user-agent': true,
                                'accept': true,
                                'cache-control': true,
                                'postman-token': true,
                                'host': true,
                                'accept-encoding': true,
                                'connection': true
                            }
                        }
                    }]
                }
            }, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        it('should complete the run', function () {
            expect(testrun).to.be.ok;
            sinon.assert.calledOnce(testrun.start);
            sinon.assert.calledOnce(testrun.done);
            sinon.assert.calledWith(testrun.done.getCall(0), null);
        });

        it('should send body with GET method', function () {
            sinon.assert.calledOnce(testrun.request);
            sinon.assert.calledWith(testrun.request.getCall(0), null);

            sinon.assert.calledOnce(testrun.response);
            sinon.assert.calledWith(testrun.response.getCall(0), null);

            var response = testrun.request.getCall(0).args[2].stream.toString();

            expect(response).to.equals('POST / HTTP/1.1\r\ncontent-type: something/else\r\n\r\nfoo=bar');
        });
    });
});
