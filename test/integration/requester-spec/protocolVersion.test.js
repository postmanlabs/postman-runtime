var sinon = require('sinon'),
    expect = require('chai').expect,
    IS_NODE = typeof window === 'undefined',
    IS_NODE_20 = IS_NODE && parseInt(process.versions.node.split('.')[0], 10) >= 20,
    server = IS_NODE && require('../../fixtures/servers/_servers');

(IS_NODE ? describe : describe.skip)('Requester Spec: protocolVersion', function () {
    var protocolVersions = [undefined, 'http1', 'http2', 'auto'],
        servers = {
            http1: null,
            http2: null
        },
        requestHandler = function (req, res) {
            res.writeHead(200, { 'Content-Type': 'text/plain' });
            res.end('okay');
        },
        forInAsync = function (obj, fn, cb) {
            if (!(obj && fn)) { return; }
            !cb && (cb = function () { /* (ಠ_ಠ) */ });

            var index = 0,
                keys = Object.keys(obj),
                next = function (err) {
                    if (err || index >= keys.length) {
                        return cb(err);
                    }

                    fn.call(obj, keys[index++], next);
                };

            if (!keys.length) {
                return cb();
            }

            next();
        };

    before(function (done) {
        servers = {
            http1: server.createSSLServer(),
            http2: server.createHTTP2Server()
        };

        forInAsync(servers, function (protocol, next) {
            servers[protocol].on('/test', requestHandler);
            servers[protocol].listen(0, next);
        }, done);
    });

    after(function (done) {
        forInAsync(servers, function (protocol, next) {
            servers[protocol].destroy(next);
        }, done);
    });

    protocolVersions.forEach((protocolVersion) => {
        protocolVersions.forEach((requesterProtocolVersion) => {
            describe('HTTP/1.1 Server with item protocolVersion ' + protocolVersion +
                ' and requesterProtocolVersion ' + requesterProtocolVersion, function () {
                var testrun;

                before(function (done) {
                    this.run({
                        requester: {
                            strictSSL: false,
                            protocolVersion: requesterProtocolVersion
                        },
                        collection: {
                            item: [{
                                request: {
                                    url: 'https://localhost:' + servers.http1.port + '/test'
                                },
                                protocolProfileBehavior: {
                                    ...(protocolVersion ? { protocolVersion } : {})
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

                it('should use the requested protocol', function () {
                    var history = testrun.response.getCall(0).lastArg,
                        executionData = history.execution.data[0];

                    if (protocolVersion === 'http2' ||
                            (protocolVersion === undefined && requesterProtocolVersion === 'http2')) {
                        const error = testrun.response.getCall(0).firstArg;

                        expect(error.code).to.eql(IS_NODE_20 ? 'ERR_HTTP2_STREAM_CANCEL' : 'ERR_HTTP2_ERROR');
                        !IS_NODE_20 && expect(error.errno).to.eql(-505);

                        return;
                    }

                    expect(executionData.response.httpVersion).to.eql('1.1');
                });
            });
        });
    });

    protocolVersions.forEach((protocolVersion) => {
        protocolVersions.forEach((requesterProtocolVersion) => {
            describe('HTTP/2.0 Server with item protocolVersion ' + protocolVersion +
                ' and requesterProtocolVersion ' + requesterProtocolVersion, function () {
                var testrun;

                before(function (done) {
                    this.run({
                        requester: {
                            strictSSL: false,
                            protocolVersion: requesterProtocolVersion
                        },
                        collection: {
                            item: [{
                                request: {
                                    url: 'https://localhost:' + servers.http2.port + '/test'
                                },
                                protocolProfileBehavior: {
                                    ...(protocolVersion ? { protocolVersion } : {})
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

                it('should use the requested protocol', function () {
                    var history = testrun.response.getCall(0).lastArg,
                        executionData = history.execution.data[0],
                        response = testrun.response.getCall(0).args[2];

                    if (protocolVersion === 'http1' ||
                        (!protocolVersion && requesterProtocolVersion === 'http1') ||
                         (!protocolVersion && !requesterProtocolVersion)) {
                        expect(executionData.response.httpVersion).to.eql('1.0');
                        expect(response).to.have.property('code', 403);

                        return;
                    }
                    expect(executionData.response.httpVersion).to.eql('2.0');
                });
            });
        });
    });
});
