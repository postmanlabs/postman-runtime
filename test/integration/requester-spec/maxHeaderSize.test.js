const expect = require('chai').expect,
    IS_NODE = typeof window === 'undefined';

(IS_NODE ? describe : describe.skip)('Requester Spec: maxHeaderSize', function () {
    let testrun,
        BASE_URL_HTTP1,
        BASE_URL_HTTP2;

    before(function (done) {
        BASE_URL_HTTP1 = global.servers.dynamicHeadersHTTP1;
        BASE_URL_HTTP2 = global.servers.dynamicHeadersHTTP2;
        done();
    });

    describe('HTTP/1: with maxHeaderSize: undefined (Node.js default)', function () {
        before(function (done) {
            this.run({
                collection: {
                    item: [{
                        request: {
                            url: `${BASE_URL_HTTP1}/1024`, // 1KB
                            method: 'GET'
                        }
                    }]
                }
            }, (err, results) => {
                testrun = results;
                done(err);
            });
        });

        it('should complete the request successfully', function () {
            expect(testrun).to.be.ok;
            const response = testrun.response.getCall(0).args[2];

            expect(response).to.have.property('code', 200); // HTTP OK
        });

        it('should include the correct number of headers', function () {
            const response = testrun.response.getCall(0).args[2];

            expect(response.headers.count()).to.be.eql(5);
        });
    });

    describe('HTTP/1: with maxHeaderSize: undefined and exceeded', function () {
        before(function (done) {
            this.run({
                collection: {
                    item: [{
                        request: {
                            url: `${BASE_URL_HTTP1}/16325`, // 16KB + 1B
                            method: 'GET'
                        }
                    }]
                }
            }, (err, results) => {
                testrun = results;
                done(err);
            });
        });

        it('should not complete the request and throw an error', function () {
            const error = testrun.request.getCall(0).args[0];

            expect(error).to.be.ok;
            expect(error.code).to.eql('HPE_HEADER_OVERFLOW'); // Node.js error
        });
    });

    describe('HTTP/1: with maxHeaderSize: defined and exceeded', function () {
        const MAX_HEADER_SIZE = 512;

        before(function (done) {
            this.run({
                collection: {
                    item: [{
                        request: {
                            url: `${BASE_URL_HTTP1}/600`, // Send 50 headers
                            method: 'GET'
                        }
                    }]
                },
                requester: {
                    maxHeaderSize: MAX_HEADER_SIZE // Set a limit less than required to trigger failure
                }
            }, (err, results) => {
                testrun = results;
                done(err);
            });
        });

        it('should not complete the request and throw an error', function () {
            const error = testrun.request.getCall(0).args[0];

            expect(error).to.be.ok;
            expect(error.code).to.eql('HPE_HEADER_OVERFLOW'); // Node.js error
        });
    });

    describe('HTTP/1: with maxHeaderSize: defined and respected', function () {
        const MAX_HEADER_SIZE = 8192;

        before(function (done) {
            this.run({
                collection: {
                    item: [{
                        request: {
                            url: `${BASE_URL_HTTP1}/500`, // Send 10 headers
                            method: 'GET'
                        }
                    }]
                },
                requester: {
                    maxHeaderSize: MAX_HEADER_SIZE // Set a limit more than required
                }
            }, (err, results) => {
                testrun = results;
                done(err);
            });
        });

        it('should complete the request successfully', function () {
            expect(testrun).to.be.ok;
            const response = testrun.response.getCall(0).args[2];

            expect(response).to.have.property('code', 200); // HTTP OK
        });

        it('should include the correct number of headers', function () {
            const response = testrun.response.getCall(0).args[2];

            expect(response.headers.count()).to.be.eql(5);
        });
    });

    describe('HTTP/2: with maxHeaderSize: defined and exceeded (NO-OP)', function () {
        before(function (done) {
            this.run({
                collection: {
                    item: [{
                        request: {
                            url: `${BASE_URL_HTTP2}/50`, // Send 50 headers
                            method: 'GET'
                        }
                    }]
                },
                requester: {
                    strictSSL: false,
                    protocolVersion: 'auto',
                    maxHeaderSize: 10 // Set a limit less than required to trigger failure
                }
            }, (err, results) => {
                testrun = results;
                done(err);
            });
        });

        it('should include the correct number of headers', function () {
            const response = testrun.response.getCall(0).args[2];

            expect(response.headers.count()).to.be.eql(3);
        });
    });
});
