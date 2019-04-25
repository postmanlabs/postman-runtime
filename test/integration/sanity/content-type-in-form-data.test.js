var fs = require('fs'),
    sinon = require('sinon'),
    expect = require('chai').expect,
    server = require('../../fixtures/server');

describe('content-type', function () {
    var httpServer,
        testrun;

    /**
     * Parse raw form-data content
     *
     * @param {String} raw
     * @returns {Array}
     *
     * Reference: https: //tools.ietf.org/html/rfc7578
     *
     * @example
     * --boundary
     * Content-Disposition: form-data; name="foo"
     * Content-Type: text/plain
     *
     * bar
     * --boundary
     *
     * returns -> [{name: 'foo', contentType: 'text/plain'}]
     */
    function parseRaw (raw) {
        raw = raw.split('\r\n');
        var boundary = raw[0],
            result = [],
            data,
            match,
            i,
            ii;

        for (i = 0, ii = raw.length; i < ii; i++) {
            if (raw[i] !== boundary) { continue; }

            data = {};
            match = (/\sname="(.*?)"/).exec(raw[++i]);
            match && (data.name = match[1]);

            match = (/^Content-Type:\s(.*)$/).exec(raw[++i]);
            match && (data.contentType = match[1]);

            Object.keys(data).length && result.push(data);
        }

        return result;
    }

    before(function (done) {
        httpServer = server.createHTTPServer();

        httpServer.on('/', function (req, res) {
            var rawBody = '';

            req.on('data', function (chunk) {
                rawBody += chunk.toString(); // decode buffer to string
            }).on('end', function () {
                res.writeHead(200, {
                    'Content-Type': 'application/json',
                    'Connection': 'close'
                });
                res.end(JSON.stringify(parseRaw(rawBody)));
            });
        });

        httpServer.listen(5050, done);
    });

    after(function (done) {
        httpServer.destroy(done);
    });

    describe('default', function () {
        before(function (done) {
            this.run({
                fileResolver: fs,
                collection: {
                    item: [{
                        request: {
                            url: 'http://localhost:5050/',
                            method: 'POST',
                            body: {
                                mode: 'formdata',
                                formdata: [{
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
        });

        it('should upload the file without content-type in formdata', function () {
            var request = testrun.request.getCall(0).args[3],
                response = testrun.request.getCall(0).args[2].stream.toString();

            sinon.assert.calledOnce(testrun.request);
            sinon.assert.calledWith(testrun.request.getCall(0), null);

            // content-type sent to server in request
            expect(request).to.have.property('body').that.nested.include({
                'formdata.members[0].contentType': undefined
            });

            // content-type received at server
            expect(JSON.parse(response)[0]).to.have.property('contentType', 'application/octet-stream');
        });
    });

    describe('text', function () {
        before(function (done) {
            this.run({
                collection: {
                    item: [{
                        request: {
                            url: 'http://localhost:5050/',
                            method: 'POST',
                            body: {
                                mode: 'formdata',
                                formdata: [{
                                    key: 'data',
                                    value: '{"key": "value"}',
                                    contentType: 'application/json',
                                    type: 'text'
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
        });

        it('should send the text with provided content-type in formdata', function () {
            var request = testrun.request.getCall(0).args[3],
                response = testrun.request.getCall(0).args[2].stream.toString();

            sinon.assert.calledOnce(testrun.request);
            sinon.assert.calledWith(testrun.request.getCall(0), null);

            // content-type sent to server in request
            expect(request).to.have.property('body').that.nested.include({
                'formdata.members[0].contentType': 'application/json'
            });

            // content-type received at server
            expect(JSON.parse(response)[0]).to.have.property('contentType', 'application/json');
        });
    });

    describe('file upload', function () {
        before(function (done) {
            this.run({
                fileResolver: fs,
                collection: {
                    item: [{
                        event: [{
                            listen: 'test',
                            script: {
                                type: 'text/javascript',
                                exec: [
                                    'pm.test("content-type", function () {',
                                    '    var jsonData = pm.response.json();',
                                    '    var file = jsonData.find(function (f) { return f.name === "fileName" });',
                                    '    pm.expect(file.contentType).to.eql("text/csv");',
                                    '});'
                                ]
                            }
                        }],
                        request: {
                            url: 'http://localhost:5050/',
                            method: 'POST',
                            body: {
                                mode: 'formdata',
                                formdata: [{
                                    key: 'fileName',
                                    src: 'test/fixtures/upload-csv',
                                    contentType: 'text/csv',
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
        });

        it('should run the test script successfully', function () {
            var assertions = testrun.assertion.getCall(0).args[1];

            sinon.assert.calledOnce(testrun.test);
            sinon.assert.calledWith(testrun.test.getCall(0), null);

            expect(assertions[0]).to.deep.include({
                name: 'content-type',
                passed: true
            });
        });

        it('should upload the file with provided content-type in formdata', function () {
            var request = testrun.request.getCall(0).args[3],
                response = testrun.request.getCall(0).args[2].stream.toString();

            sinon.assert.calledOnce(testrun.request);
            sinon.assert.calledWith(testrun.request.getCall(0), null);

            // content-type sent to server in request
            expect(request).to.have.property('body').that.nested.include({
                'formdata.members[0].contentType': 'text/csv'
            });

            // content-type received at server
            expect(JSON.parse(response)[0]).to.have.property('contentType', 'text/csv');
        });
    });

    describe('multi src param', function () {
        before(function (done) {
            this.run({
                fileResolver: fs,
                collection: {
                    item: [{
                        event: [{
                            listen: 'test',
                            script: {
                                type: 'text/javascript',
                                exec: [
                                    'pm.test("content-type", function () {',
                                    '    var jsonData = pm.response.json();',
                                    '    jsonData.forEach(function (file) {',
                                    '        pm.expect(file.name).to.equal("fileName");',
                                    '        pm.expect(file.contentType).to.equal("text/csv");',
                                    '    });',
                                    '});'
                                ]
                            }
                        }],
                        request: {
                            url: 'http://localhost:5050/',
                            method: 'POST',
                            body: {
                                mode: 'formdata',
                                formdata: [{
                                    key: 'fileName',
                                    src: ['test/fixtures/upload-file.json', 'test/fixtures/upload-csv.json'],
                                    contentType: 'text/csv',
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
        });

        it('should run the test script successfully', function () {
            var assertions = testrun.assertion.getCall(0).args[1];

            sinon.assert.calledOnce(testrun.test);
            sinon.assert.calledWith(testrun.test.getCall(0), null);

            expect(assertions[0]).to.deep.include({
                name: 'content-type',
                passed: true
            });
        });

        it('should upload multiple files with provided content-type in formdata', function () {
            var request = testrun.request.getCall(0).args[3],
                response = testrun.request.getCall(0).args[2].stream.toString();

            sinon.assert.calledOnce(testrun.request);
            sinon.assert.calledWith(testrun.request.getCall(0), null);

            // content-type sent to server in request for the first param
            expect(request).to.have.property('body').that.nested.include({
                'formdata.members[0].contentType': 'text/csv'
            });

            // content-type sent to server in request for the second param
            expect(request).to.have.property('body').that.nested.include({
                'formdata.members[0].contentType': 'text/csv'
            });

            // content-type received at server
            expect(JSON.parse(response)[0]).to.have.property('contentType', 'text/csv');
            expect(JSON.parse(response)[1]).to.have.property('contentType', 'text/csv');
        });
    });
});
