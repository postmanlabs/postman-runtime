describe('content-type', function () {
    var http = require('http'),
        fs = require('fs'),
        server,
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
    function parseRaw(raw) {
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
            match = (/ name="(.*?)"/).exec(raw[++i]);
            match && (data.name = match[1]);

            match = (/^Content-Type: (.*)$/).exec(raw[++i]);
            match && (data.contentType = match[1]);

            Object.keys(data).length && result.push(data);
        }

        return result;
    }

    before(function(done) {
        server = http.createServer(function (req, res) {
            req.rawBody = '';
            req.on('data', function (chunk) {
                req.rawBody += chunk.toString();
            }).on('end', function () {
                res.writeHead(200, {'Content-Type': 'application/json'});
                res.end(JSON.stringify(parseRaw(req.rawBody)));
            });
        }).listen(5050, done);
    });

    after(function(done) {
        server.close(done);
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
            expect(testrun).be.ok();
            expect(testrun.done.calledOnce).be.ok();
            expect(testrun.done.getCall(0).args[0]).to.be(null);
            expect(testrun.start.calledOnce).be.ok();
        });

        it('should upload the file without content-type in formdata', function () {
            var request = testrun.request.getCall(0).args[3],
                response = testrun.request.getCall(0).args[2].stream.toString();

            expect(testrun.request.calledOnce).to.be.ok();
            expect(testrun.request.getCall(0).args[0]).to.be(null);

            // content-type sent to server in request
            expect(request.body.formdata.members[0]).to.have.property('contentType', undefined);

            // content-type received at server
            expect(JSON.parse(response)[0]).to.have.property('contentType', 'application/octet-stream');
        });
    });

    describe('text', function () {
        before(function(done) {
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
            }, function(err, results) {
                testrun = results;
                done(err);
            });
        });

        it('should complete the run', function() {
            expect(testrun).be.ok();
            expect(testrun.done.calledOnce).be.ok();
            expect(testrun.done.getCall(0).args[0]).to.be(null);
            expect(testrun.start.calledOnce).be.ok();
        });

        it('should send the text with provided content-type in formdata', function() {
            var request = testrun.request.getCall(0).args[3],
                response = testrun.request.getCall(0).args[2].stream.toString();

            expect(testrun.request.calledOnce).to.be.ok();
            expect(testrun.request.getCall(0).args[0]).to.be(null);

            // content-type sent to server in request
            expect(request.body.formdata.members[0]).to.have.property('contentType', 'application/json');

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
                                    '    var file = jsonData.find(function(f) { return f.name === "fileName" });',
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
            expect(testrun).be.ok();
            expect(testrun.done.calledOnce).be.ok();
            expect(testrun.done.getCall(0).args[0]).to.be(null);
            expect(testrun.start.calledOnce).be.ok();
        });

        it('should run the test script successfully', function () {
            var assertions = testrun.assertion.getCall(0).args[1];

            expect(testrun.test.calledOnce).be.ok();
            expect(testrun.test.getCall(0).args[0]).to.be(null);
            expect(assertions[0]).to.have.property('name', 'content-type');
            expect(assertions[0]).to.have.property('passed', true);
        });

        it('should upload the file with provided content-type in formdata', function () {
            var request = testrun.request.getCall(0).args[3],
                response = testrun.request.getCall(0).args[2].stream.toString();

            expect(testrun.request.calledOnce).to.be.ok();
            expect(testrun.request.getCall(0).args[0]).to.be(null);

            // content-type sent to server in request
            expect(request.body.formdata.members[0]).to.have.property('contentType', 'text/csv');

            // content-type received at server
            expect(JSON.parse(response)[0]).to.have.property('contentType', 'text/csv');
        });
    });

});
