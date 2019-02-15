var sinon = require('sinon'),
    expect = require('chai').expect,
    server = require('../../fixtures/server');

describe('cache-control and postman-token headers', function () {
    var httpServer,
        testrun,
        PORT = 5050,
        HOST = 'http://localhost:' + PORT;

    describe('when `noCache` and `postmanToken` requester options are not provided', function() {
        before(function(done) {
            httpServer = server.createRawEchoServer();

            httpServer.listen(PORT, function(err) {
                if (err) { return done(err); }

                this.run({
                    collection: {
                        item: [{
                            name: 'Cache-Control and postman-token 1',
                            request: {
                                url: HOST
                            }
                        }]
                    }
                }, function (err, results) {
                    testrun = results;
                    done(err);
                });
            }.bind(this));
        });

        after(function (done) {
            httpServer.destroy(done);
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

        it('should send request with `Cache-Control: no-cache` header', function () {
            var request = testrun.request.getCall(0).args[3].toJSON(),
                response = testrun.response.getCall(0).args[2].stream.toString();

            expect(request.header).to.deep.include({key: 'Cache-Control', value: 'no-cache'});
            expect(response).to.deep.include('Cache-Control: no-cache');
        });

        it('should send request with `Postman-Token` header', function () {
            var request = testrun.request.getCall(0).args[3].toJSON(),
                response = testrun.response.getCall(0).args[2].stream.toString(),

                regex = /^(Postman-Token: )?[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/mi,

                header = request.header.filter(function(header) {
                    return (header.key === 'Postman-Token');
                });

            expect(regex.test(response)).to.be.true;
            expect(regex.test(header[0].value)).to.be.true;
        });
    });

    describe('when `noCache` and `postmanToken` requester options are set to true', function() {
        before(function(done) {
            httpServer = server.createRawEchoServer();

            httpServer.listen(PORT, function(err) {
                if (err) { return done(err); }

                this.run({
                    requester: {
                        noCacheHeader: true,
                        postmanTokenHeader: true
                    },
                    collection: {
                        item: [{
                            name: 'Cache-Control and postman-token 1',
                            request: {
                                url: HOST
                            }
                        }]
                    }
                }, function (err, results) {
                    testrun = results;
                    done(err);
                });
            }.bind(this));
        });

        after(function (done) {
            httpServer.destroy(done);
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

        it('should send request with `Cache-Control: no-cache` header', function () {
            var request = testrun.request.getCall(0).args[3].toJSON(),
                response = testrun.response.getCall(0).args[2].stream.toString();

            expect(request.header).to.deep.include({key: 'Cache-Control', value: 'no-cache'});
            expect(response).to.deep.include('Cache-Control: no-cache');
        });

        it('should send request with `Postman-Token` header', function () {
            var request = testrun.request.getCall(0).args[3].toJSON(),
                response = testrun.response.getCall(0).args[2].stream.toString(),

                regex = /^(Postman-Token: )?[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/mi,

                header = request.header.filter(function(header) {
                    return (header.key === 'Postman-Token');
                });

            expect(regex.test(response)).to.be.true;
            expect(regex.test(header[0].value)).to.be.true;
        });
    });

    describe('when `noCache` and `postmanToken` requester options are set to false', function() {
        before(function(done) {
            httpServer = server.createRawEchoServer();

            httpServer.listen(PORT, function(err) {
                if (err) { return done(err); }

                this.run({
                    requester: {
                        noCacheHeader: false,
                        postmanTokenHeader: false
                    },
                    collection: {
                        item: [{
                            name: 'Cache-Control and postman-token 1',
                            request: {
                                url: HOST
                            }
                        }]
                    }
                }, function (err, results) {
                    testrun = results;
                    done(err);
                });
            }.bind(this));
        });

        after(function (done) {
            httpServer.destroy(done);
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

        it('should send request without `Cache-Control: no-cache` header', function () {
            var request = testrun.request.getCall(0).args[3].toJSON(),
                response = testrun.response.getCall(0).args[2].stream.toString();

            expect(request.header).to.deep.not.include({key: 'Cache-Control', value: 'no-cache'});
            expect(response).to.deep.not.include('Cache-Control: no-cache');
        });

        it('should send request without `Postman-Token` header', function () {
            var request = testrun.request.getCall(0).args[3].toJSON(),
                response = testrun.response.getCall(0).args[2].stream.toString(),

                regex = /^(Postman-Token: )?[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/mi,

                header = request.header.filter(function(header) {
                    return (header.key === 'Postman-Token');
                });

            expect(regex.test(response)).to.be.false;
            expect(header).to.be.empty;
        });
    });

    describe('when custom headers are provided', function() {
        before(function(done) {
            httpServer = server.createRawEchoServer();

            httpServer.listen(PORT, function(err) {
                if (err) { return done(err); }

                this.run({
                    requester: {
                        noCacheHeader: false,
                        postmanTokenHeader: false
                    },
                    collection: {
                        item: [{
                            name: 'Cache-Control and postman-token 1',
                            request: {
                                url: HOST,
                                header: {
                                    'Cache-Control': 'max-age=1200',
                                    'Postman-Token': 'CustomToken'
                                }
                            }
                        }]
                    }
                }, function (err, results) {
                    testrun = results;
                    done(err);
                });
            }.bind(this));
        });

        after(function (done) {
            httpServer.destroy(done);
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

        it('should override `Cache-Control` header', function () {
            var request = testrun.request.getCall(0).args[3].toJSON(),
                response = testrun.response.getCall(0).args[2].stream.toString();

            expect(request.header).to.deep.include({key: 'Cache-Control', value: 'max-age=1200'});
            expect(response).to.deep.include('Cache-Control: max-age=1200');
        });

        it('should override `Postman-Token` header', function () {
            var request = testrun.request.getCall(0).args[3].toJSON(),
                response = testrun.response.getCall(0).args[2].stream.toString();

            expect(request.header).to.deep.include({key: 'Postman-Token', value: 'CustomToken'});
            expect(response).to.deep.include('Postman-Token: CustomToken');
        });
    });
});
