var fs = require('fs'),
    http = require('http'),
    sinon = require('sinon'),
    expect = require('chai').expect,
    enableServerDestroy = require('server-destroy');

describe('redirects', function() {
    var testrun,
        server,
        PORT = 5050,
        URL = 'http://localhost:' + PORT;

    before(function (done) {
        server = http.createServer(function (req, res) {
            var data = '';

            // /redirect/<responseCode>
            if ((/^\/redirect\/(\d{3})$/).test(req.url)) {
                res.writeHead(parseInt(req.url.substr(-3)), {location: '/'});
                return res.end();
            }


            req.on('data', function (d) { data += d; });

            req.once('end', function () {
                res.writeHead(200, {connection: 'close'});
                res.end(data);
            });
        }).listen(PORT, done);
        enableServerDestroy(server);
    });

    after(function (done) {
        server.destroy(done);
    });

    describe('sanity', function () {
        before(function(done) {
            this.run({
                requester: {followRedirects: false},
                collection: {
                    item: [{
                        request: 'https://postman-echo.com/redirect-to?url=https://postman-echo.com/get'
                    }]
                }
            }, function(err, results) {
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

        it('should not have followed the redirect', function() {
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
                            url: URL + '/redirect/301',
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

    describe('307 redirect', function () {
        before(function (done) {
            this.run({
                fileResolver: fs,
                collection: {
                    item: [{
                        request: {
                            url: URL + '/redirect/307',
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

    describe('308 redirect', function () {
        before(function (done) {
            this.run({
                fileResolver: fs,
                collection: {
                    item: [{
                        request: {
                            url: URL + '/redirect/308',
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
