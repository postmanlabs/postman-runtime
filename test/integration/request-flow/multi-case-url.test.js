var expect = require('chai').expect,
    sinon = require('sinon');

describe('request url', function () {
    var testrun;

    describe('with lowercase', function () {
        before(function (done) {
            this.run({
                collection: {
                    item: [{
                        request: {
                            url: 'http://postman-echo.com/post?name=postman',
                            method: 'POST'
                        }
                    }, {
                        request: {
                            url: 'https://postman-echo.com/post?name=postman',
                            method: 'POST'
                        }
                    }]
                }
            }, function (err, result) {
                testrun = result;
                done(err);
            });
        });

        it('should complete the run', function () {
            expect(testrun).to.be.ok;
            sinon.assert.calledOnce(testrun.start);
            sinon.assert.calledOnce(testrun.done);
            sinon.assert.calledTwice(testrun.request);
            sinon.assert.calledTwice(testrun.response);
            sinon.assert.calledWith(testrun.done.getCall(0), null);
        });

        it('should process the http request', function () {
            sinon.assert.calledWith(testrun.request.getCall(0), null);
            sinon.assert.calledWith(testrun.response.getCall(0), null);

            expect(testrun.response.getCall(0).args[2]).to.have.property('code', 200);
        });

        it('should process the https request', function () {
            sinon.assert.calledWith(testrun.request.getCall(1), null);
            sinon.assert.calledWith(testrun.response.getCall(1), null);

            expect(testrun.response.getCall(1).args[2]).to.have.property('code', 200);
        });

        it('should normalise the url for http', function () {
            var request = testrun.request.getCall(0).args[2].stream.toString();

            expect(JSON.parse(request)).to.have
                .property('url', 'http://postman-echo.com/post?name=postman');
        });

        it('should normalise the url for https', function () {
            var request = testrun.request.getCall(1).args[2].stream.toString();

            expect(JSON.parse(request)).to.have
                .property('url', 'https://postman-echo.com/post?name=postman');
        });

        it('should maintain the case sensitivity of path and query parameters for http', function () {
            var request = testrun.request.getCall(0).args[2].stream.toString();

            expect(JSON.parse(request)).to.have.property('url')
                .that.have.string('/post?name=postman');
        });

        it('should maintain the case sensitivity of path and query parameters for https', function () {
            var request = testrun.request.getCall(1).args[2].stream.toString();

            expect(JSON.parse(request)).to.have.property('url')
                .that.have.string('/post?name=postman');
        });
    });

    describe('with uppercase', function () {
        before(function (done) {
            this.run({
                collection: {
                    item: [{
                        request: {
                            url: 'HTTP://POSTMAN-ECHO.COM/POST?NAME=POSTMAN',
                            method: 'POST'
                        }
                    },
                    {
                        request: {
                            url: 'HTTPS://POSTMAN-ECHO.COM/POST?NAME=POSTMAN',
                            method: 'POST'
                        }
                    }
                    ]
                }
            }, function (err, result) {
                testrun = result;
                done(err);
            });
        });

        it('should complete the run', function () {
            expect(testrun).to.be.ok;
            sinon.assert.calledOnce(testrun.start);
            sinon.assert.calledOnce(testrun.done);
            sinon.assert.calledTwice(testrun.request);
            sinon.assert.calledTwice(testrun.response);
            sinon.assert.calledWith(testrun.done.getCall(0), null);
        });

        it('should process the http request', function () {
            sinon.assert.calledWith(testrun.request.getCall(0), null);
            sinon.assert.calledWith(testrun.response.getCall(0), null);

            expect(testrun.response.getCall(0).args[2]).to.have.property('code', 200);
        });

        it('should process the https request', function () {
            sinon.assert.calledWith(testrun.request.getCall(1), null);
            sinon.assert.calledWith(testrun.response.getCall(1), null);

            expect(testrun.response.getCall(1).args[2]).to.have.property('code', 200);
        });

        it('should normalise the url for http', function () {
            var request = testrun.request.getCall(0).args[2].stream.toString();

            expect(JSON.parse(request)).to.have
                .property('url', 'http://postman-echo.com/POST?NAME=POSTMAN');
        });

        it('should normalise the url for https', function () {
            var request = testrun.request.getCall(1).args[2].stream.toString();

            expect(JSON.parse(request)).to.have
                .property('url', 'https://postman-echo.com/POST?NAME=POSTMAN');
        });

        it('should maintain the case sensitivity of path and query parameters for http', function () {
            var request = testrun.request.getCall(0).args[2].stream.toString();

            expect(JSON.parse(request)).to.have.property('url')
                .that.have.string('/POST?NAME=POSTMAN');
        });

        it('should maintain the case sensitivity of path and query parameters for https', function () {
            var request = testrun.request.getCall(1).args[2].stream.toString();

            expect(JSON.parse(request)).to.have.property('url')
                .that.have.string('/POST?NAME=POSTMAN');
        });
    });

    describe('with mixed case', function () {
        before(function (done) {
            this.run({
                collection: {
                    item: [{
                        request: {
                            url: 'HttP://POsTmaN-ecHo.CoM/PoST?NamE=PosTMaN',
                            method: 'POST'
                        }
                    },
                    {
                        request: {
                            url: 'htTpS://POsTmaN-eChO.Com/Post?NaMe=PostMaN',
                            method: 'POST'
                        }
                    }
                    ]
                }
            }, function (err, result) {
                testrun = result;
                done(err);
            });
        });

        it('should complete the run', function () {
            expect(testrun).to.be.ok;
            sinon.assert.calledOnce(testrun.start);
            sinon.assert.calledOnce(testrun.done);
            sinon.assert.calledTwice(testrun.request);
            sinon.assert.calledTwice(testrun.response);
            sinon.assert.calledWith(testrun.done.getCall(0), null);
        });

        it('should process the http request', function () {
            sinon.assert.calledWith(testrun.request.getCall(0), null);
            sinon.assert.calledWith(testrun.response.getCall(0), null);

            expect(testrun.response.getCall(0).args[2]).to.have.property('code', 200);
        });

        it('should process the https request', function () {
            sinon.assert.calledWith(testrun.request.getCall(1), null);
            sinon.assert.calledWith(testrun.response.getCall(1), null);

            expect(testrun.response.getCall(1).args[2]).to.have.property('code', 200);
        });

        it('should normalise the url for http', function () {
            var request = testrun.request.getCall(0).args[2].stream.toString();

            expect(JSON.parse(request)).to.have
                .property('url', 'http://postman-echo.com/PoST?NamE=PosTMaN');
        });

        it('should normalise the url for https', function () {
            var request = testrun.request.getCall(1).args[2].stream.toString();

            expect(JSON.parse(request)).to.have
                .property('url', 'https://postman-echo.com/Post?NaMe=PostMaN');
        });

        it('should maintain the case sensitivity of path and query parameters for http', function () {
            var request = testrun.request.getCall(0).args[2].stream.toString();

            expect(JSON.parse(request)).to.have.property('url')
                .that.have.string('/PoST?NamE=PosTMaN');
        });

        it('should maintain the case sensitivity of path and query parameters for https', function () {
            var request = testrun.request.getCall(1).args[2].stream.toString();

            expect(JSON.parse(request)).to.have.property('url')
                .that.have.string('/Post?NaMe=PostMaN');
        });
    });
});
