var fs = require('fs'),
    sinon = require('sinon'),
    expect = require('chai').expect;

(typeof window === 'undefined' ? describe : describe.skip)('content-type', function () {
    var URL,
        testrun;

    before(function () {
        URL = global.servers.rawContentType;
    });

    describe('default', function () {
        before(function (done) {
            this.run({
                fileResolver: fs,
                collection: {
                    item: [{
                        request: {
                            url: URL,
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
                            url: URL,
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
                            url: URL,
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
                            url: URL,
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
