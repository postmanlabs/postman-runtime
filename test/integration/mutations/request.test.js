var expect = require('chai').expect;

describe('request mutations', function () {
    var testrun;

    describe('url', function () {
        before(function (done) {
            this.run({
                collection: {
                    item: [{
                        request: {
                            url: 'http://localhost'
                        },
                        event: [{
                            listen: 'prerequest',
                            script: {
                                exec: [
                                    'pm.request.update({ url: "https://postman-echo.com/get" });'
                                ],
                                type: 'text/javascript'
                            }
                        }]
                    }]
                }
            },
            function (err, results) {
                testrun = results;
                done(err);
            });
        });

        it('should have completed the run', function () {
            expect(testrun).to.be.ok;
            expect(testrun.done.getCall(0).args[0]).to.be.null;
            expect(testrun).to.nested.include({
                'done.calledOnce': true,
                'start.calledOnce': true,
                'request.calledOnce': true,
                'response.calledOnce': true
            });
        });

        it('should update the request URL', function () {
            var request = testrun.response.getCall(0).args[3],
                response = testrun.response.getCall(0).args[2],
                responseBody = JSON.parse(response.stream.toString());

            expect(request).to.have.property('method', 'GET');
            expect(request).to.have.property('url').that.has.property('toString');
            expect(request.url.toString()).to.equal('https://postman-echo.com/get');

            expect(response).to.have.property('code', 200);
            expect(responseBody).to.have.property('url', 'https://postman-echo.com/get');
        });
    });

    describe('method', function () {
        before(function (done) {
            this.run({
                collection: {
                    item: [{
                        request: {
                            url: 'https://postman-echo.com/post'
                        },
                        event: [{
                            listen: 'prerequest',
                            script: {
                                exec: [
                                    'pm.request.update({ method: "POST" });'
                                ],
                                type: 'text/javascript'
                            }
                        }]
                    }]
                }
            },
            function (err, results) {
                testrun = results;
                done(err);
            });
        });

        it('should have completed the run', function () {
            expect(testrun).to.be.ok;
            expect(testrun.done.getCall(0).args[0]).to.be.null;
            expect(testrun).to.nested.include({
                'done.calledOnce': true,
                'start.calledOnce': true,
                'request.calledOnce': true,
                'response.calledOnce': true
            });
        });

        it('should update the request method', function () {
            var request = testrun.response.getCall(0).args[3],
                response = testrun.response.getCall(0).args[2],
                responseBody = JSON.parse(response.stream.toString());

            expect(request).to.have.property('method', 'POST');

            expect(response).to.have.property('code', 200);
            expect(responseBody).to.have.property('url', 'https://postman-echo.com/post');
        });
    });

    describe('header', function () {
        before(function (done) {
            this.run({
                collection: {
                    item: [{
                        request: {
                            url: 'https://postman-echo.com/get',
                            header: [
                                {key: 'h0', value: 'v0'},
                                {key: 'h1', value: 'v0'}
                            ]
                        },
                        event: [{
                            listen: 'prerequest',
                            script: {
                                exec: [
                                    'pm.request.headers.add({key: "h2", value: "v2"})',
                                    'pm.request.addHeader({key: "h3", value: "v3"})',
                                    'pm.request.upsertHeader({key: "h1", value: "v1"})',
                                    'pm.request.removeHeader("h0")'
                                ],
                                type: 'text/javascript'
                            }
                        }]
                    }]
                }
            },
            function (err, results) {
                testrun = results;
                done(err);
            });
        });

        it('should have completed the run', function () {
            expect(testrun).to.be.ok;
            expect(testrun.done.getCall(0).args[0]).to.be.null;
            expect(testrun).to.nested.include({
                'done.calledOnce': true,
                'start.calledOnce': true,
                'request.calledOnce': true,
                'response.calledOnce': true
            });
        });

        it('should update the request headers', function () {
            var request = testrun.response.getCall(0).args[3],
                requestHeaders = request.getHeaders(),
                response = testrun.response.getCall(0).args[2],
                responseBody = JSON.parse(response.stream.toString()),
                headers = {
                    h1: 'v1',
                    h2: 'v2',
                    h3: 'v3'
                };

            expect(requestHeaders).to.deep.include(headers);
            expect(requestHeaders).to.not.have.property('h0');

            expect(response).to.have.property('code', 200);
            expect(responseBody).to.have.property('headers').that.deep.include(headers);
            expect(responseBody.headers).to.not.have.property('h0');
        });
    });

    describe('auth', function () {
        before(function (done) {
            this.run({
                collection: {
                    item: [{
                        request: {
                            url: 'https://postman-echo.com/basic-auth',
                            auth: {
                                type: 'digest',
                                digest: {
                                    username: 'foo',
                                    password: 'bar'
                                }
                            }
                        },
                        event: [{
                            listen: 'prerequest',
                            script: {
                                exec: [
                                    'pm.request.authorizeUsing("basic", {username: "postman", password: "password"});'
                                ],
                                type: 'text/javascript'
                            }
                        }]
                    }]
                }
            },
            function (err, results) {
                testrun = results;
                done(err);
            });
        });

        it('should have completed the run', function () {
            expect(testrun).to.be.ok;
            expect(testrun.done.getCall(0).args[0]).to.be.null;
            expect(testrun).to.nested.include({
                'done.calledOnce': true,
                'start.calledOnce': true,
                'request.calledOnce': true,
                'response.calledOnce': true
            });
        });

        it('should update the request auth', function () {
            var request = testrun.response.getCall(0).args[3],
                response = testrun.response.getCall(0).args[2],
                responseBody = JSON.parse(response.stream.toString());

            expect(request.auth).to.have.property('type', 'basic');
            expect(request.auth.current()).to.eql({username: 'postman', password: 'password'});

            expect(response).to.have.property('code', 200);
            expect(responseBody).to.have.property('authenticated', true);
        });
    });

    // @todo allow request body mutation
    describe('body', function () {
        before(function (done) {
            this.run({
                collection: {
                    item: [{
                        request: {
                            url: 'https://postman-echo.com/post',
                            method: 'POST',
                            body: {
                                mode: 'raw',
                                raw: 'postman'
                            }
                        },
                        event: [{
                            listen: 'prerequest',
                            script: {
                                exec: [
                                    'pm.request.body.mode = "file"',
                                    'pm.request.body.raw = "new-postman"'
                                ],
                                type: 'text/javascript'
                            }
                        }]
                    }]
                }
            },
            function (err, results) {
                testrun = results;
                done(err);
            });
        });

        it('should have completed the run', function () {
            expect(testrun).to.be.ok;
            expect(testrun.done.getCall(0).args[0]).to.be.null;
            expect(testrun).to.nested.include({
                'done.calledOnce': true,
                'start.calledOnce': true,
                'request.calledOnce': true,
                'response.calledOnce': true
            });
        });

        it('should not update the request body', function () {
            var request = testrun.response.getCall(0).args[3],
                response = testrun.response.getCall(0).args[2],
                responseBody = JSON.parse(response.stream.toString());

            expect(request.body).to.deep.include({mode: 'raw', raw: 'postman'});

            expect(response).to.have.property('code', 200);
            expect(responseBody).to.have.property('data', 'postman');
        });
    });

    describe('multiple prerequest', function () {
        before(function (done) {
            this.run({
                collection: {
                    item: [{
                        request: {
                            url: 'http://localhost',
                            body: {
                                mode: 'raw',
                                raw: 'postman'
                            }
                        },
                        event: [{
                            listen: 'prerequest',
                            script: {
                                exec: [
                                    'pm.request.update({ url: "https://postman-echo.com/post" });'
                                ],
                                type: 'text/javascript'
                            }
                        }, {
                            listen: 'prerequest',
                            script: {
                                exec: [
                                    'pm.request.update({ method: "POST" });',
                                    'pm.request.headers.add({key: "h0", value: "v0"})'
                                ],
                                type: 'text/javascript'
                            }
                        }, {
                            listen: 'prerequest',
                            script: {
                                exec: [
                                    'pm.request.body.mode = "file"',
                                    'pm.request.body.raw = "new-postman"'
                                ],
                                type: 'text/javascript'
                            }
                        }]
                    }]
                }
            },
            function (err, results) {
                testrun = results;
                done(err);
            });
        });

        it('should have completed the run', function () {
            expect(testrun).to.be.ok;
            expect(testrun.done.getCall(0).args[0]).to.be.null;
            expect(testrun).to.nested.include({
                'done.calledOnce': true,
                'start.calledOnce': true,
                'request.calledOnce': true,
                'response.calledOnce': true
            });
        });

        it('should persist request mutations within multiple prerequest', function () {
            var request = testrun.response.getCall(0).args[3],
                response = testrun.response.getCall(0).args[2],
                responseBody = JSON.parse(response.stream.toString());

            expect(request).to.have.property('method', 'POST');
            expect(request).to.have.property('url').that.has.property('toString');
            expect(request.url.toString()).to.equal('https://postman-echo.com/post');
            expect(request.getHeaders()).to.deep.include({h0: 'v0'});

            expect(response).to.have.property('code', 200);
            expect(responseBody).to.have.property('url', 'https://postman-echo.com/post');
            expect(responseBody).to.have.property('data', 'postman');
            expect(responseBody).to.have.property('headers').that.deep.include({h0: 'v0'});
        });
    });
});
