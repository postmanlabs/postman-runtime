var expect = require('chai').expect,
    server = require('../../fixtures/server');

describe('EdgeGrid auth', function () {
    var credentials = {
            accessToken: 'postman_access_token',
            clientToken: 'postman_client_token',
            clientSecret: 'postman_client_secret'
        },
        edgeGridAuthServer = server.createEdgeGridAuthServer(credentials);

    before(function (done) {
        edgeGridAuthServer.listen(done);
    });

    after(function (done) {
        edgeGridAuthServer.destroy(done);
    });

    describe('with missing credentials', function () {
        var testrun;

        before(function (done) {
            // perform the collection run
            this.run({
                collection: {
                    item: {
                        request: {
                            auth: {
                                type: 'edgegrid',
                                edgegrid: {}
                            },
                            url: edgeGridAuthServer.url,
                            method: 'GET'
                        }
                    }
                }
            }, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        it('should complete the run', function () {
            expect(testrun).to.be.ok;
            testrun.done.getCall(0).args[0] && console.error(testrun.done.getCall(0).args[0].stack);

            expect(testrun.done.getCall(0).args[0]).to.be.null;
            expect(testrun).to.nested.include({
                'start.callCount': 1
            });
            expect(testrun).to.nested.include({
                'done.callCount': 1
            });
        });

        it('should not passe the EdgeGrid authentication', function () {
            expect(testrun).to.nested.include({
                'request.callCount': 1
            });

            var request = testrun.request.getCall(0).args[3],
                response = testrun.request.getCall(0).args[2];

            expect(request.headers.get('authorization')).to.be.undefined;
            expect(request.url.toString()).to.eql(edgeGridAuthServer.url);
            expect(response).to.have.property('code', 401);
        });
    });

    describe('with correct credentials', function () {
        var testrun;

        before(function (done) {
            // perform the collection run
            this.run({
                collection: {
                    item: {
                        request: {
                            auth: {
                                type: 'edgegrid',
                                edgegrid: credentials
                            },
                            url: edgeGridAuthServer.url,
                            method: 'GET'
                        }
                    }
                }
            }, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        it('should complete the run', function () {
            expect(testrun).to.be.ok;
            testrun.done.getCall(0).args[0] && console.error(testrun.done.getCall(0).args[0].stack);

            expect(testrun.done.getCall(0).args[0]).to.be.null;
            expect(testrun).to.nested.include({
                'start.callCount': 1
            });
            expect(testrun).to.nested.include({
                'done.callCount': 1
            });
        });

        it('should pass the EdgeGrid authentication', function () {
            expect(testrun).to.nested.include({
                'request.callCount': 1
            });

            var request = testrun.request.getCall(0).args[3],
                response = testrun.request.getCall(0).args[2],
                header = request.headers.members[0],
                nonceRegex = /nonce=([A-Z]|[a-z]|[0-9]|-){36};/,
                timestampRegex = /timestamp=[0-9]{8}T[0-9]{2}:[0-9]{2}:[0-9]{2}\+0000;/;

            expect(header).to.have.have.property('key', 'Authorization');
            expect(header).to.have.have.property('value')
                .that.include(`client_token=${credentials.clientToken}`);
            expect(header).to.have.have.property('value')
                .that.include(`access_token=${credentials.accessToken}`);
            expect(header).to.have.have.property('value')
                .that.include('signature=');
            expect(header).to.have.have.property('value')
                .that.match(nonceRegex);
            expect(header).to.have.have.property('value')
                .that.match(timestampRegex);

            expect(request.url.toString()).to.eql(edgeGridAuthServer.url);
            expect(response).to.have.property('code', 200);
        });
    });

    describe('with wrong credentials', function () {
        var testrun,
            wrongCrededntials = {
                accessToken: 'incorrect_access_token',
                clientToken: 'incorrect_client_token',
                clientSecret: 'incorrect_client_secret'
            };

        before(function (done) {
            // perform the collection run
            this.run({
                collection: {
                    item: {
                        request: {
                            auth: {
                                type: 'edgegrid',
                                edgegrid: wrongCrededntials
                            },
                            url: edgeGridAuthServer.url,
                            method: 'GET'
                        }
                    }
                }
            }, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        it('should complete the run', function () {
            expect(testrun).to.be.ok;
            testrun.done.getCall(0).args[0] && console.error(testrun.done.getCall(0).args[0].stack);

            expect(testrun.done.getCall(0).args[0]).to.be.null;
            expect(testrun).to.nested.include({
                'start.callCount': 1
            });
            expect(testrun).to.nested.include({
                'done.callCount': 1
            });
        });

        it('should not pass the EdgeGrid authentication', function () {
            expect(testrun).to.nested.include({
                'request.callCount': 1
            });

            var request = testrun.request.getCall(0).args[3],
                response = testrun.request.getCall(0).args[2],
                header = request.headers.members[0],
                nonceRegex = /nonce=([A-Z]|[a-z]|[0-9]|-){36};/,
                timestampRegex = /timestamp=[0-9]{8}T[0-9]{2}:[0-9]{2}:[0-9]{2}\+0000;/;

            expect(header).to.have.have.property('key', 'Authorization');
            expect(header).to.have.have.property('value')
                .that.include(`client_token=${wrongCrededntials.clientToken}`);
            expect(header).to.have.have.property('value')
                .that.include(`access_token=${wrongCrededntials.accessToken}`);
            expect(header).to.have.have.property('value')
                .that.include('signature=');
            expect(header).to.have.have.property('value')
                .that.match(nonceRegex);
            expect(header).to.have.have.property('value')
                .that.match(timestampRegex);

            expect(request.url.toString()).to.eql(edgeGridAuthServer.url);
            expect(response).to.have.property('code', 401);
        });
    });

    describe('POST request with body and correct credentials', function () {
        var testrun;

        before(function (done) {
            // perform the collection run
            this.run({
                collection: {
                    item: {
                        request: {
                            auth: {
                                type: 'edgegrid',
                                edgegrid: credentials
                            },
                            url: edgeGridAuthServer.url,
                            method: 'POST',
                            body: {
                                mode: 'raw',
                                raw: 'Hello World!!!'
                            }
                        }
                    }
                }
            }, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        it('should complete the run', function () {
            expect(testrun).to.be.ok;
            testrun.done.getCall(0).args[0] && console.error(testrun.done.getCall(0).args[0].stack);

            expect(testrun.done.getCall(0).args[0]).to.be.null;
            expect(testrun).to.nested.include({
                'start.callCount': 1
            });
            expect(testrun).to.nested.include({
                'done.callCount': 1
            });
        });

        it('should pass the EdgeGrid authentication', function () {
            expect(testrun).to.nested.include({
                'request.callCount': 1
            });

            var request = testrun.request.getCall(0).args[3],
                response = testrun.request.getCall(0).args[2],
                header = request.headers.members[0],
                nonceRegex = /nonce=([A-Z]|[a-z]|[0-9]|-){36};/,
                timestampRegex = /timestamp=[0-9]{8}T[0-9]{2}:[0-9]{2}:[0-9]{2}\+0000;/;

            expect(header).to.have.have.property('key', 'Authorization');
            expect(header).to.have.have.property('value')
                .that.include(`client_token=${credentials.clientToken}`);
            expect(header).to.have.have.property('value')
                .that.include(`access_token=${credentials.accessToken}`);
            expect(header).to.have.have.property('value')
                .that.include('signature=');
            expect(header).to.have.have.property('value')
                .that.match(nonceRegex);
            expect(header).to.have.have.property('value')
                .that.match(timestampRegex);

            expect(request.url.toString()).to.eql(edgeGridAuthServer.url);
            expect(response).to.have.property('code', 200);
        });
    });

    describe('PUT request with body and correct credentials', function () {
        var testrun;

        before(function (done) {
            // perform the collection run
            this.run({
                collection: {
                    item: {
                        request: {
                            auth: {
                                type: 'edgegrid',
                                edgegrid: credentials
                            },
                            url: edgeGridAuthServer.url,
                            method: 'PUT',
                            body: {
                                mode: 'raw',
                                raw: 'Hello World!!!'
                            }
                        }
                    }
                }
            }, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        it('should complete the run', function () {
            expect(testrun).to.be.ok;
            testrun.done.getCall(0).args[0] && console.error(testrun.done.getCall(0).args[0].stack);

            expect(testrun.done.getCall(0).args[0]).to.be.null;
            expect(testrun).to.nested.include({
                'start.callCount': 1
            });
            expect(testrun).to.nested.include({
                'done.callCount': 1
            });
        });

        it('should pass the EdgeGrid authentication', function () {
            expect(testrun).to.nested.include({
                'request.callCount': 1
            });

            var request = testrun.request.getCall(0).args[3],
                response = testrun.request.getCall(0).args[2],
                header = request.headers.members[0],
                nonceRegex = /nonce=([A-Z]|[a-z]|[0-9]|-){36};/,
                timestampRegex = /timestamp=[0-9]{8}T[0-9]{2}:[0-9]{2}:[0-9]{2}\+0000;/;

            expect(header).to.have.have.property('key', 'Authorization');
            expect(header).to.have.have.property('value')
                .that.include(`client_token=${credentials.clientToken}`);
            expect(header).to.have.have.property('value')
                .that.include(`access_token=${credentials.accessToken}`);
            expect(header).to.have.have.property('value')
                .that.include('signature=');
            expect(header).to.have.have.property('value')
                .that.match(nonceRegex);
            expect(header).to.have.have.property('value')
                .that.match(timestampRegex);

            expect(request.url.toString()).to.eql(edgeGridAuthServer.url);
            expect(response).to.have.property('code', 200);
        });
    });
});
