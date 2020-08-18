var fs = require('fs'),
    sinon = require('sinon'),
    expect = require('chai').expect,
    IS_BROWSER = typeof window !== 'undefined';

describe('redirects', function () {
    var testrun;

    // @todo un-skip https://github.com/postmanlabs/httpbin/issues/617
    describe.skip('sanity', function () {
        before(function (done) {
            this.run({
                requester: {followRedirects: false},
                collection: {
                    item: [{
                        request: 'https://postman-echo.com/redirect-to?url=https://postman-echo.com/get'
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

            sinon.assert.calledOnce(testrun.request);
            sinon.assert.calledWith(testrun.request.getCall(0), null);

            sinon.assert.calledOnce(testrun.response);
            sinon.assert.calledWith(testrun.response.getCall(0), null);
        });

        it('should not have followed the redirect', function () {
            var response = testrun.request.getCall(0).args[2];

            expect(response).to.have.property('code', 302);
        });
    });

    describe('301 redirect', function () {
        before(function (done) {
            this.run({
                collection: {
                    item: [{
                        request: {
                            url: global.servers.redirects + '/1/301',
                            method: 'POST',
                            body: {
                                mode: 'formdata',
                                formdata: [{
                                    type: 'text',
                                    key: 'key1',
                                    value: 'POSTMAN'
                                }]
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

            sinon.assert.calledOnce(testrun.request);
            sinon.assert.calledWith(testrun.request.getCall(0), null);

            sinon.assert.calledOnce(testrun.response);
            sinon.assert.calledWith(testrun.response.getCall(0), null);
        });

        it('should drop body on 301 redirect', function () {
            var response = testrun.request.getCall(0).args[2];

            expect(response).to.have.property('code', 200);
            expect(response.stream.toString()).to.be.empty;
        });
    });

    (IS_BROWSER ? describe.skip : describe)('307 redirect', function () {
        before(function (done) {
            this.run({
                fileResolver: fs,
                collection: {
                    item: [{
                        request: {
                            url: global.servers.redirects + '/1/307',
                            method: 'POST',
                            body: {
                                mode: 'formdata',
                                formdata: [{
                                    type: 'text',
                                    key: 'key1',
                                    value: 'POSTMAN'
                                }, {
                                    key: 'fileName',
                                    src: 'test/fixtures/upload-csv',
                                    type: 'file'
                                }]
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

            sinon.assert.calledOnce(testrun.request);
            sinon.assert.calledWith(testrun.request.getCall(0), null);

            sinon.assert.calledOnce(testrun.response);
            sinon.assert.calledWith(testrun.response.getCall(0), null);
        });

        it('should retain body on 307 redirect', function () {
            var response = testrun.request.getCall(0).args[2];

            expect(response).to.have.property('code', 200);
            expect(response.stream.toString())
                .to.include('Content-Disposition: form-data; name="key1"')
                .and.include('POSTMAN') // form-param `key1` value
                .and.include('Content-Disposition: form-data; name="fileName"; filename="upload-csv"')
                .and.include('key,value'); // file content
        });
    });

    (IS_BROWSER ? describe.skip : describe)('308 redirect', function () {
        // eslint-disable-next-line mocha/no-sibling-hooks
        before(function (done) {
            this.run({
                fileResolver: fs,
                collection: {
                    item: [{
                        request: {
                            url: global.servers.redirects + '/1/308',
                            method: 'POST',
                            body: {
                                mode: 'formdata',
                                formdata: [{
                                    type: 'text',
                                    key: 'key1',
                                    value: 'POSTMAN'
                                }, {
                                    key: 'fileName',
                                    src: 'test/fixtures/upload-csv',
                                    type: 'file'
                                }]
                            }
                        }
                    }]
                }
            }, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        // eslint-disable-next-line mocha/no-identical-title
        it('should complete the run', function () {
            expect(testrun).to.be.ok;
            sinon.assert.calledOnce(testrun.start);
            sinon.assert.calledOnce(testrun.done);
            sinon.assert.calledWith(testrun.done.getCall(0), null);

            sinon.assert.calledOnce(testrun.request);
            sinon.assert.calledWith(testrun.request.getCall(0), null);

            sinon.assert.calledOnce(testrun.response);
            sinon.assert.calledWith(testrun.response.getCall(0), null);
        });

        it('should retain body on 308 redirect', function () {
            var response = testrun.request.getCall(0).args[2];

            expect(response).to.have.property('code', 200);
            expect(response.stream.toString())
                .to.include('Content-Disposition: form-data; name="key1"')
                .and.include('POSTMAN') // form-param `key1` value
                .and.include('Content-Disposition: form-data; name="fileName"; filename="upload-csv"')
                .and.include('key,value'); // file content
        });
    });
});
