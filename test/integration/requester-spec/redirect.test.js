var sinon = require('sinon'),
    expect = require('chai').expect,
    server = require('../../fixtures/server');

describe('Requester Spec: redirect', function () {
    var redirectServer,
        testrun,
        hits = [],
        PORT = 5050,
        HOST = 'http://localhost:' + PORT;

    before(function (done) {
        redirectServer = server.createRedirectServer();

        redirectServer.on('hit', function (req) {
            // keep track of all the requests made during redirects.
            hits.push({
                url: req.url,
                method: req.method,
                headers: req.headers
            });
        });

        // This will be called on final redirect
        redirectServer.on('/', function (req, res) {
            res.writeHead(200, {'content-type': 'text/plain'});
            res.end('okay');
        });

        redirectServer.listen(PORT, done);
    });

    after(function (done) {
        redirectServer.destroy(done);
    });

    describe('with followOriginalHttpMethod: false', function () {
        var URL = HOST + '/1/302';

        before(function (done) {
            hits = [];
            this.run({
                requester: {
                    followOriginalHttpMethod: false
                },
                collection: {
                    item: [{
                        request: {
                            url: URL,
                            method: 'POST',
                            header: [{key: 'Connection', value: 'close'}]
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

        it('should not follow post redirects by default', function () {
            var response = testrun.response.getCall(0).args[2];

            expect(response).to.have.property('code', 200);
            expect(response).to.have.property('stream');
            expect(response.stream.toString()).to.equal('okay');

            expect(hits).to.have.lengthOf(2);
            expect(hits[1]).to.have.property('url', '/');
            expect(hits[1]).to.have.property('method', 'GET');
        });
    });

    describe('with followOriginalHttpMethod: true', function () {
        var URL = HOST + '/1/302';

        before(function (done) {
            hits = [];
            this.run({
                requester: {
                    followOriginalHttpMethod: true
                },
                collection: {
                    item: [{
                        request: {
                            url: URL,
                            method: 'POST',
                            header: [{key: 'Connection', value: 'close'}]
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

        it('should follow post redirects', function () {
            var response = testrun.response.getCall(0).args[2];

            expect(response).to.have.property('code', 200);
            expect(response).to.have.property('stream');
            expect(response.stream.toString()).to.equal('okay');

            expect(hits).to.have.lengthOf(2);
            expect(hits[1]).to.have.property('url', '/');
            expect(hits[1]).to.have.property('method', 'POST');
        });
    });

    describe('with removeRefererHeaderOnRedirect: false', function () {
        var URL = HOST + '/1/302';

        before(function (done) {
            hits = [];
            this.run({
                requester: {
                    removeRefererHeaderOnRedirect: false
                },
                collection: {
                    item: [{
                        request: {
                            url: URL,
                            method: 'POST',
                            header: [
                                {key: 'Connection', value: 'close'},
                                {key: 'referer', value: 'POSTMAN'}
                            ]
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

        it('should have referer header on redirects', function () {
            var request = testrun.response.getCall(0).args[3],
                response = testrun.response.getCall(0).args[2];

            expect(response).to.have.property('code', 200);
            expect(response).to.have.property('stream');
            expect(response.stream.toString()).to.equal('okay');

            expect(hits).to.have.lengthOf(2);
            expect(hits[1]).to.have.property('url', '/');
            expect(hits[1]).to.have.property('method', 'GET');
            expect(hits[1]).to.have.property('headers');
            expect(hits[1].headers).to.have.property('referer', URL);

            // this also checks that referer header is updated in the request
            expect(request.headers.reference).to.have.property('referer');
            expect(request.headers).to.have.nested.property('reference.referer.value', URL);
            expect(request.headers).to.have.nested.property('reference.referer.system', true);
        });
    });

    describe('with removeRefererHeaderOnRedirect: true', function () {
        var URL = HOST + '/1/302';

        describe('should not have referer header', function () {
            before(function (done) {
                hits = [];
                this.run({
                    requester: {
                        removeRefererHeaderOnRedirect: true
                    },
                    collection: {
                        item: [{
                            request: {
                                url: URL,
                                method: 'POST',
                                header: [{key: 'Connection', value: 'close'}]
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

            it('should not have referer header when removeRefererHeaderOnRedirect is true', function () {
                var response = testrun.response.getCall(0).args[2];

                expect(response).to.have.property('code', 200);
                expect(response).to.have.property('stream');
                expect(response.stream.toString()).to.equal('okay');

                expect(hits).to.have.lengthOf(2);
                expect(hits[1]).to.have.property('url', '/');
                expect(hits[1]).to.have.property('method', 'GET');
                expect(hits[1]).to.have.property('headers');
                expect(hits[1].headers).to.not.have.property('referer');
            });
        });

        describe('should preserve referer header set in the initial request', function () {
            before(function (done) {
                hits = [];
                this.run({
                    requester: {
                        removeRefererHeaderOnRedirect: true
                    },
                    collection: {
                        item: [{
                            request: {
                                url: URL,
                                method: 'POST',
                                header: [
                                    {key: 'Connection', value: 'close'},
                                    {key: 'Referer', value: 'http://foo.bar'}
                                ]
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

            it('should preserve referer header set in the initial request', function () {
                var response = testrun.response.getCall(0).args[2];

                expect(response).to.have.property('code', 200);
                expect(response).to.have.property('stream');
                expect(response.stream.toString()).to.equal('okay');

                expect(hits).to.have.lengthOf(2);
                expect(hits[1]).to.have.property('url', '/');
                expect(hits[1]).to.have.property('method', 'GET');
                expect(hits[1]).to.have.property('headers');
                expect(hits[1].headers).to.have.property('referer', 'http://foo.bar');
            });
        });
    });

    describe('without maxRedirects', function () {
        var URL = HOST + '/11/302';

        before(function (done) {
            hits = [];
            this.run({
                collection: {
                    item: [{
                        request: {
                            url: URL,
                            method: 'POST',
                            header: [{key: 'Connection', value: 'close'}]
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
            sinon.assert.calledOnce(testrun.response);
        });

        it('should follow maximum 10 redirects by default and throw error after that', function () {
            var response = testrun.response.getCall(0);

            expect(response.args[0]).to.have.property('message',
                `Exceeded maxRedirects. Probably stuck in a redirect loop ${HOST}/1/302`);

            expect(hits).to.have.lengthOf(11);
            expect(hits[10]).to.have.property('url', '/1/302');
            expect(hits[10]).to.have.property('method', 'GET');
        });
    });

    describe('with maxRedirects', function () {
        var URL = HOST + '/11/302';

        before(function (done) {
            hits = [];
            this.run({
                requester: {
                    maxRedirects: 11
                },
                collection: {
                    item: [{
                        request: {
                            url: URL,
                            method: 'POST',
                            header: [{key: 'Connection', value: 'close'}]
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

        it('should follow all the redirects with maxRedirects set', function () {
            var response = testrun.response.getCall(0).args[2];

            expect(response).to.have.property('code', 200);
            expect(response).to.have.property('stream');
            expect(response.stream.toString()).to.equal('okay');

            expect(hits).to.have.lengthOf(12);
            expect(hits[11]).to.have.property('url', '/');
            expect(hits[11]).to.have.property('method', 'GET');
        });
    });
});
