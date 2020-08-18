var sinon = require('sinon'),
    expect = require('chai').expect;

(typeof window === 'undefined' ? describe : describe.skip)('Requester Spec: redirect', function () {
    var testrun;

    describe('with followOriginalHttpMethod: false', function () {
        before(function (done) {
            this.run({
                requester: {
                    followOriginalHttpMethod: false
                },
                collection: {
                    item: [{
                        request: {
                            url: global.servers.followRedirects + '/1/302',
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
            var response = testrun.response.getCall(0).args[2],
                hits;

            expect(response).to.have.property('code', 200);
            expect(response).to.have.property('stream');

            hits = response.json();

            expect(hits).to.have.lengthOf(2);
            expect(hits[1]).to.have.property('url', '/?');
            expect(hits[1]).to.have.property('method', 'GET');
        });
    });

    describe('with followOriginalHttpMethod: true', function () {
        before(function (done) {
            this.run({
                requester: {
                    followOriginalHttpMethod: true
                },
                collection: {
                    item: [{
                        request: {
                            url: global.servers.followRedirects + '/1/302',
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
            var response = testrun.response.getCall(0).args[2],
                hits;

            expect(response).to.have.property('code', 200);
            expect(response).to.have.property('stream');

            hits = response.json();

            expect(hits).to.have.lengthOf(2);
            expect(hits[1]).to.have.property('url', '/?');
            expect(hits[1]).to.have.property('method', 'POST');
        });
    });

    describe('with removeRefererHeaderOnRedirect: false', function () {
        var URL;

        before(function (done) {
            URL = global.servers.followRedirects + '/1/302';
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
                response = testrun.response.getCall(0).args[2],
                hits;

            expect(response).to.have.property('code', 200);
            expect(response).to.have.property('stream');

            hits = response.json();

            expect(hits).to.have.lengthOf(2);
            expect(hits[1]).to.have.property('url', '/?');
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
        describe('should not have referer header', function () {
            before(function (done) {
                this.run({
                    requester: {
                        removeRefererHeaderOnRedirect: true
                    },
                    collection: {
                        item: [{
                            request: {
                                url: global.servers.followRedirects + '/1/302',
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
                var response = testrun.response.getCall(0).args[2],
                    hits;

                expect(response).to.have.property('code', 200);
                expect(response).to.have.property('stream');

                hits = response.json();

                expect(hits).to.have.lengthOf(2);
                expect(hits[1]).to.have.property('url', '/?');
                expect(hits[1]).to.have.property('method', 'GET');
                expect(hits[1]).to.have.property('headers');
                expect(hits[1].headers).to.not.have.property('referer');
            });
        });

        describe('should preserve referer header set in the initial request', function () {
            before(function (done) {
                this.run({
                    requester: {
                        removeRefererHeaderOnRedirect: true
                    },
                    collection: {
                        item: [{
                            request: {
                                url: global.servers.followRedirects + '/1/302',
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
                var response = testrun.response.getCall(0).args[2],
                    hits;

                expect(response).to.have.property('code', 200);
                expect(response).to.have.property('stream');

                hits = response.json();

                expect(hits).to.have.lengthOf(2);
                expect(hits[1]).to.have.property('url', '/?');
                expect(hits[1]).to.have.property('method', 'GET');
                expect(hits[1]).to.have.property('headers');
                expect(hits[1].headers).to.have.property('referer', 'http://foo.bar');
            });
        });
    });

    describe('without maxRedirects', function () {
        var HOST;

        before(function (done) {
            HOST = global.servers.followRedirects;
            this.run({
                collection: {
                    item: [{
                        request: {
                            url: HOST + '/11/302',
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
                `Exceeded maxRedirects. Probably stuck in a redirect loop ${HOST}/1/302?`);
        });
    });

    describe('with maxRedirects', function () {
        before(function (done) {
            this.run({
                requester: {
                    maxRedirects: 11
                },
                collection: {
                    item: [{
                        request: {
                            url: global.servers.followRedirects + '/11/302',
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
            var response = testrun.response.getCall(0).args[2],
                hits;

            expect(response).to.have.property('code', 200);
            expect(response).to.have.property('stream');

            hits = response.json();

            expect(hits).to.have.lengthOf(12);
            expect(hits[11]).to.have.property('url', '/?');
            expect(hits[11]).to.have.property('method', 'GET');
        });
    });
});
