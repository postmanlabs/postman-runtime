var fs = require('fs'),
    expect = require('chai').expect,
    IS_BROWSER = typeof window !== 'undefined';

describe('request mutations', function () {
    var testrun;

    describe('url', function () {
        before(function (done) {
            this.run({
                collection: {
                    item: [{
                        request: 'http://localhost',
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
            var initialRequest = testrun.beforeItem.getCall(0).args[2].request,
                request = testrun.response.getCall(0).args[3],
                response = testrun.response.getCall(0).args[2],
                responseBody = JSON.parse(response.stream.toString());

            expect(initialRequest).to.have.property('method', 'GET');
            expect(initialRequest.url.toString()).to.equal('http://localhost');

            expect(request).to.have.property('method', 'GET');
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
            var initialRequest = testrun.beforeItem.getCall(0).args[2].request,
                request = testrun.response.getCall(0).args[3],
                response = testrun.response.getCall(0).args[2],
                responseBody = JSON.parse(response.stream.toString());

            expect(initialRequest).to.have.property('method', 'GET');
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
                                { key: 'h0', value: 'v0' },
                                { key: 'h1', value: 'v0' }
                            ]
                        },
                        event: [{
                            listen: 'prerequest',
                            script: {
                                exec: [
                                    'pm.request.headers.add({key: "h2", value: "v2"})',
                                    'pm.request.headers.add({key: "h3", value: "v3"})',
                                    'pm.request.headers.upsert({key: "h1", value: "v1"})',
                                    'pm.request.headers.remove("h0")'
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
            var initialRequest = testrun.beforeItem.getCall(0).args[2].request,
                initialHeaders = initialRequest.getHeaders(),
                request = testrun.response.getCall(0).args[3],
                requestHeaders = request.getHeaders(),
                response = testrun.response.getCall(0).args[2],
                responseBody = JSON.parse(response.stream.toString()),
                headers = {
                    h1: 'v1',
                    h2: 'v2',
                    h3: 'v3'
                };

            expect(initialHeaders).to.eql({ h0: 'v0', h1: 'v0' });
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
                                basic: {
                                    username: 'postman',
                                    password: 'password'
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
                responseBody = JSON.parse(response.stream.toString()),
                requestAuth = request.auth.parameters().toObject();

            expect(request.auth).to.have.property('type', 'basic');
            expect(requestAuth).to.have.property('username').eql('postman');
            expect(requestAuth).to.have.property('password').eql('password');

            expect(response).to.have.property('code', 200);
            expect(responseBody).to.have.property('authenticated', true);
        });
    });

    describe('body', function () {
        describe('raw', function () {
            before(function (done) {
                this.run({
                    fileResolver: fs,
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
                                        'pm.request.body.update("postman-updated");'
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

            it('should update the request body', function () {
                var request = testrun.response.getCall(0).args[3],
                    response = testrun.response.getCall(0).args[2],
                    responseBody = JSON.parse(response.stream.toString());

                expect(request.body).to.deep.include({ mode: 'raw', raw: 'postman-updated' });

                expect(response).to.have.property('code', 200);
                expect(responseBody).to.deep.include({ data: 'postman-updated' });
            });
        });

        (IS_BROWSER ? describe.skip : describe)('file accessible', function () {
            before(function (done) {
                this.run({
                    fileResolver: fs,
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
                                        'pm.request.body.file = {src: "test/fixtures/upload-file.json"}'
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

            it('should send the file', function () {
                var response = testrun.response.getCall(0).args[2],
                    responseBody = JSON.parse(response.stream.toString());

                expect(response).to.have.property('code', 200);
                expect(responseBody.data).to.be.eql({ key1: 'value1', key2: 2 });
            });
        });

        describe('file inaccessible', function () {
            before(function (done) {
                this.run({
                    fileResolver: {
                        stat (path, callback) {
                            callback(new Error('File not accessible'));
                        },
                        createReadStream () {
                            return null;
                        }
                    },
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
                                        'pm.request.body.file = {src: "test/fixtures/upload-file.json"}'
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

            it('should not read the file', function () {
                var request = testrun.response.getCall(0).args[3],
                    response = testrun.response.getCall(0).args[2],
                    responseBody = JSON.parse(response.stream.toString()),
                    consoleLogs = testrun.console.getCall(0).args[2];

                expect(request.body).to.deep.include({ file: { src: 'test/fixtures/upload-file.json', value: null } });

                expect(response).to.have.property('code', 200);
                expect(consoleLogs).to.include('File not accessible');
                expect(responseBody).to.deep.include({ data: {} });
            });
        });

        describe('formdata inaccessible', function () {
            before(function (done) {
                this.run({
                    fileResolver: {
                        stat (path, callback) {
                            callback(new Error('File not accessible'));
                        },
                        createReadStream () {
                            return null;
                        }
                    },
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
                                        'pm.request.body.mode = "formdata";',
                                        // eslint-disable-next-line @stylistic/js/max-len
                                        'pm.request.body.formdata = [{ key: "file", src: ["test/fixtures/upload-file.json"], type: "file"}];'
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

            it('should not read the file', function () {
                var response = testrun.response.getCall(0).args[2],
                    responseBody = JSON.parse(response.stream.toString()),
                    consoleLogs = testrun.console.getCall(0).args[2];

                expect(response).to.have.property('code', 200);
                expect(consoleLogs).to.include('File not accessible');
                expect(responseBody).to.deep.include({ files: {} });
            });
        });

        // failing because pm.request.body.update() function does not exist
        describe.skip('with no body in original request', function () {
            before(function (done) {
                this.run({
                    fileResolver: fs,
                    collection: {
                        item: [{
                            request: {
                                url: 'https://postman-echo.com/post',
                                method: 'POST'
                            },
                            event: [{
                                listen: 'prerequest',
                                script: {
                                    exec: [
                                        'pm.request.body.update("postman-updated");'
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

            it('should update the request body', function () {
                var request = testrun.response.getCall(0).args[3],
                    response = testrun.response.getCall(0).args[2],
                    responseBody = JSON.parse(response.stream.toString());

                expect(request.body).to.deep.include({ mode: 'raw', raw: 'postman-updated' });

                expect(response).to.have.property('code', 200);
                expect(responseBody).to.deep.include({ data: 'postman-updated' });
            });
        });
    });

    describe('with multiple prerequest', function () {
        before(function (done) {
            this.run({
                collection: {
                    item: [{
                        request: {
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
            var initialRequest = testrun.beforeItem.getCall(0).args[2].request,
                request = testrun.response.getCall(0).args[3],
                response = testrun.response.getCall(0).args[2],
                responseBody = JSON.parse(response.stream.toString());

            expect(initialRequest).to.have.property('method', 'GET');
            expect(initialRequest.url.toString()).to.equal('');
            expect(initialRequest.getHeaders()).to.eql({});

            expect(request).to.have.property('method', 'POST');
            expect(request.url.toString()).to.equal('https://postman-echo.com/post');
            expect(request.getHeaders()).to.deep.include({ h0: 'v0' });

            expect(response).to.have.property('code', 200);
            expect(responseBody).to.have.property('url', 'https://postman-echo.com/post');
            expect(responseBody).to.have.property('data', 'new-postman');
            expect(responseBody).to.have.property('headers').that.deep.include({ h0: 'v0' });
        });
    });

    describe('with multiple iterations', function () {
        before(function (done) {
            this.run({
                iterationCount: 2,
                collection: {
                    item: [{
                        request: {
                            url: '',
                            body: {
                                mode: 'raw',
                                raw: 'postman'
                            }
                        },
                        event: [{
                            listen: 'prerequest',
                            script: {
                                exec: [
                                    'pm.request.update({ url: "https://postman-echo.com/post" });',
                                    'pm.request.update({ method: "POST" });',
                                    'pm.request.headers.add({key: "h0", value: "v0"})',
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
                'iteration.calledTwice': true,
                'request.calledTwice': true,
                'response.calledTwice': true
            });
        });

        it('should mutate the request correctly', function () {
            var initialRequest = testrun.beforeItem.getCall(0).args[2].request,
                request = testrun.response.getCall(0).args[3],
                response = testrun.response.getCall(0).args[2],
                responseBody = JSON.parse(response.stream.toString());

            expect(initialRequest).to.have.property('method', 'GET');
            expect(initialRequest.url.toString()).to.equal('');
            expect(initialRequest.getHeaders()).to.eql({});

            expect(request).to.have.property('method', 'POST');
            expect(request.url.toString()).to.equal('https://postman-echo.com/post');
            expect(request.getHeaders()).to.deep.include({ h0: 'v0' });

            expect(response).to.have.property('code', 200);
            expect(responseBody).to.have.property('url', 'https://postman-echo.com/post');
            expect(responseBody).to.have.property('data', 'new-postman');
            expect(responseBody).to.have.property('headers').that.deep.include({ h0: 'v0' });
        });

        it('should not persist request mutations across iterations', function () {
            var request = testrun.response.getCall(1).args[3],
                response = testrun.response.getCall(1).args[2],
                responseBody = JSON.parse(response.stream.toString()),
                initialRequest = testrun.beforeItem.getCall(1).args[2].request;

            expect(initialRequest).to.have.property('method', 'GET');
            expect(initialRequest.url.toString()).to.equal('');
            expect(initialRequest.getHeaders()).to.eql({});

            expect(request).to.have.property('method', 'POST');
            expect(request.url.toString()).to.equal('https://postman-echo.com/post');
            expect(request.getHeaders()).to.deep.include({ h0: 'v0' });

            expect(response).to.have.property('code', 200);
            expect(responseBody).to.have.property('url', 'https://postman-echo.com/post');
            expect(responseBody).to.have.property('data', 'new-postman');
            expect(responseBody).to.have.property('headers').that.deep.include({ h0: 'v0' });
        });
    });
});
