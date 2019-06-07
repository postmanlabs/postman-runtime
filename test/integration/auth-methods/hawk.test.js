var expect = require('chai').expect,
    server = require('../../fixtures/server'),
    hawk = require('@hapi/hawk').server;

describe('hawk auth', function () {
    // create local server with hawk auth because postman-echo does not support payload varification.
    var httpServer,

        credentialsFunc = function (id) {
            if (id === 'dh37fgj492je') {
                return {
                    key: 'werxhqb98rpaxn39848xrunpaw3489ruxnpa98w4rxn',
                    algorithm: 'sha256',
                    user: 'Postman'
                };
            }
        };

    before(function (done) {
        httpServer = server.createHTTPServer();
        
        httpServer.on('/', function (req, res) {
            var data = [];

            req.on('data', function (chunk) {
                data.push(chunk);
            });

            req.on('end', function () {
                data = Buffer.concat(data);

                let auth = hawk.authenticate(req, credentialsFunc, {
                    payload: data.length && data
                });

                auth.then(function (loginDetails) {
                    res.writeHead(200);
                    res.end(`Hello ${loginDetails.credentials.user}`);
                }).catch(function () {
                    res.writeHead(401);
                    res.end('unauthorized');
                });
            });
        });

        httpServer.listen(0, done);
    });

    after(function (done) {
        httpServer.destroy(done);
    });

    describe('without body', function () {
        var testrun;

        before(function (done) {
            // perform the collection run
            this.run({
                collection: {
                    item: {
                        request: {
                            auth: {
                                type: 'hawk',
                                hawk: {
                                    authId: 'dh37fgj492je',
                                    authKey: 'werxhqb98rpaxn39848xrunpaw3489ruxnpa98w4rxn',
                                    algorithm: 'sha256',
                                    user: 'asda',
                                    saveHelperData: true,
                                    nonce: 'eFRP2o',
                                    extraData: 'skjdfklsjhdflkjhsdf',
                                    app: 'someAppId',
                                    delegation: '',
                                    timestamp: ''
                                }
                            },
                            url: httpServer.url,
                            method: 'GET'
                        }
                    }
                }
            }, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        it('should include hawk auth parameters in request header', function () {
            var request = testrun.request.getCall(0).args[3],
                header = request.headers.members[0];

            expect(header).to.have.have.property('key', 'Authorization');
            expect(header).to.have.have.property('value').that.include('Hawk id="dh37fgj492je"');
            expect(header).to.have.have.property('value').that.include('ts=');
            expect(header).to.have.have.property('value').that.include('nonce="eFRP2o"');
            expect(header).to.have.have.property('value').that.include('ext="skjdfklsjhdflkjhsdf"');
            expect(header).to.have.have.property('value').that.include('mac=');
            expect(header).to.have.have.property('value').that.include('app="someAppId"');
        });

        it('should have completed the run', function () {
            expect(testrun).to.be.ok;
            expect(testrun).to.nested.include({
                'done.callCount': 1
            });
            testrun.done.getCall(0).args[0] && console.error(testrun.done.getCall(0).args[0].stack);
            expect(testrun.done.getCall(0).args[0]).to.be.null;
            expect(testrun).to.nested.include({
                'start.callCount': 1
            });
        });

        it('should have sent the request once', function () {
            expect(testrun).to.nested.include({
                'request.callCount': 1
            });

            var request = testrun.request.getCall(0).args[3],
                response = testrun.request.getCall(0).args[2];

            expect(request.url.toString()).to.eql(httpServer.url);
            expect(response).to.have.property('code', 200);
        });

        it('should have sent one request internally', function () {
            expect(testrun).to.nested.include({
                'io.callCount': 1
            });

            var firstError = testrun.io.firstCall.args[0],
                firstRequest = testrun.io.firstCall.args[4],
                firstResponse = testrun.io.firstCall.args[3];

            expect(firstError).to.be.null;
            expect(firstRequest.url.toString()).to.eql(httpServer.url);
            expect(firstResponse).to.have.property('code', 200);
        });

        it('should have passed the hawk authorization', function () {
            expect(testrun).to.nested.include({
                'request.callCount': 1
            });

            var request = testrun.request.getCall(0).args[3],
                response = testrun.request.getCall(0).args[2];

            expect(request.url.toString()).to.eql(httpServer.url);
            expect(response).to.have.property('code', 200);
        });
    });

    describe('with body', function () {
        var testrun;

        before(function (done) {
            // perform the collection run
            this.run({
                collection: {
                    item: {
                        request: {
                            auth: {
                                type: 'hawk',
                                hawk: {
                                    authId: 'dh37fgj492je',
                                    authKey: 'werxhqb98rpaxn39848xrunpaw3489ruxnpa98w4rxn',
                                    algorithm: 'sha256',
                                    user: 'asda',
                                    saveHelperData: true,
                                    nonce: 'eFRP2o',
                                    extraData: 'skjdfklsjhdflkjhsdf',
                                    app: 'someAppId',
                                    delegation: '',
                                    timestamp: '',
                                    includePayloadHash: true
                                }
                            },
                            url: httpServer.url,
                            method: 'POST',
                            body: {
                                'mode': 'raw',
                                'raw': 'Hello World!!'
                            },
                            header: {
                                'Content-Type': 'text/plain'
                            }
                        }
                    }
                }
            }, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        it('should include hawk auth parameters in request header', function () {
            var request = testrun.request.getCall(0).args[3],

                // check for second header because first header will be 'Content-Type'
                header = request.headers.members[1];

            expect(header).to.have.have.property('key', 'Authorization');
            expect(header).to.have.have.property('value').that.include('Hawk id="dh37fgj492je"');
            expect(header).to.have.have.property('value').that.include('ts=');
            expect(header).to.have.have.property('value').that.include('nonce="eFRP2o"');
            expect(header).to.have.have.property('value').that.include('ext="skjdfklsjhdflkjhsdf"');
            expect(header).to.have.have.property('value').that.include('hash=');
            expect(header).to.have.have.property('value').that.include('mac=');
            expect(header).to.have.have.property('value').that.include('app="someAppId"');
        });

        it('should have completed the run', function () {
            expect(testrun).to.be.ok;
            expect(testrun).to.nested.include({
                'done.callCount': 1
            });
            testrun.done.getCall(0).args[0] && console.error(testrun.done.getCall(0).args[0].stack);
            expect(testrun.done.getCall(0).args[0]).to.be.null;
            expect(testrun).to.nested.include({
                'start.callCount': 1
            });
        });

        it('should have sent the request once', function () {
            expect(testrun).to.nested.include({
                'request.callCount': 1
            });

            var request = testrun.request.getCall(0).args[3],
                response = testrun.request.getCall(0).args[2];

            expect(request.url.toString()).to.eql(httpServer.url);
            expect(response).to.have.property('code', 200);
        });

        it('should have sent one request internally', function () {
            expect(testrun).to.nested.include({
                'io.callCount': 1
            });

            var firstError = testrun.io.firstCall.args[0],
                firstRequest = testrun.io.firstCall.args[4],
                firstResponse = testrun.io.firstCall.args[3];

            expect(firstError).to.be.null;
            expect(firstRequest.url.toString()).to.eql(httpServer.url);
            expect(firstResponse).to.have.property('code', 200);
        });

        it('should have passed the hawk authorization', function () {
            expect(testrun).to.nested.include({
                'request.callCount': 1
            });

            var request = testrun.request.getCall(0).args[3],
                response = testrun.request.getCall(0).args[2];

            expect(request.url.toString()).to.eql(httpServer.url);
            expect(response).to.have.property('code', 200);
        });
    });
});
