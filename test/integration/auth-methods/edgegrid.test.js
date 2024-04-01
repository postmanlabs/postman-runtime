var fs = require('fs'),
    path = require('path'),
    expect = require('chai').expect;

describe('EdgeGrid auth', function () {
    var credentials = {
        accessToken: 'postman_access_token',
        clientToken: 'postman_client_token',
        clientSecret: 'postman_client_secret'
    };

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
                            url: global.servers.edgegrid,
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
                            url: global.servers.edgegrid,
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
                header = request.headers.get('Authorization'),
                nonceRegex = /nonce=([A-Z]|[a-z]|[0-9]|-){36};/,
                timestampRegex = /timestamp=[0-9]{8}T[0-9]{2}:[0-9]{2}:[0-9]{2}\+0000;/;

            expect(header).to.be.a('string');
            expect(header).to.include(`client_token=${credentials.clientToken}`);
            expect(header).to.include(`access_token=${credentials.accessToken}`);
            expect(header).to.include('signature=');
            expect(header).to.match(nonceRegex);
            expect(header).to.match(timestampRegex);

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
                            url: global.servers.edgegrid,
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
                header = request.headers.get('Authorization'),
                nonceRegex = /nonce=([A-Z]|[a-z]|[0-9]|-){36};/,
                timestampRegex = /timestamp=[0-9]{8}T[0-9]{2}:[0-9]{2}:[0-9]{2}\+0000;/;

            expect(header).to.be.a('string');
            expect(header).to.include(`client_token=${wrongCrededntials.clientToken}`);
            expect(header).to.include(`access_token=${wrongCrededntials.accessToken}`);
            expect(header).to.include('signature=');
            expect(header).to.match(nonceRegex);
            expect(header).to.match(timestampRegex);

            expect(response).to.have.property('code', 401);
        });
    });

    describe('POST request with raw body and correct credentials', function () {
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
                            url: global.servers.edgegrid,
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
                header = request.headers.get('Authorization'),
                nonceRegex = /nonce=([A-Z]|[a-z]|[0-9]|-){36};/,
                timestampRegex = /timestamp=[0-9]{8}T[0-9]{2}:[0-9]{2}:[0-9]{2}\+0000;/;

            expect(header).to.be.a('string');
            expect(header).to.include(`client_token=${credentials.clientToken}`);
            expect(header).to.include(`access_token=${credentials.accessToken}`);
            expect(header).to.include('signature=');
            expect(header).to.match(nonceRegex);
            expect(header).to.match(timestampRegex);

            expect(response).to.have.property('code', 200);
        });
    });

    describe('POST request with binary body and correct credentials', function () {
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
                            url: global.servers.edgegrid,
                            method: 'POST',
                            body: {
                                mode: 'file',
                                file: {
                                    src: path.resolve(__dirname, '../../fixtures/upload-csv')
                                }
                            }
                        }
                    }
                },
                fileResolver: fs
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
                header = request.headers.get('Authorization'),
                nonceRegex = /nonce=([A-Z]|[a-z]|[0-9]|-){36};/,
                timestampRegex = /timestamp=[0-9]{8}T[0-9]{2}:[0-9]{2}:[0-9]{2}\+0000;/;


            expect(header).to.be.a('string');
            expect(header).to.include(`client_token=${credentials.clientToken}`);
            expect(header).to.include(`access_token=${credentials.accessToken}`);
            expect(header).to.include('signature=');
            expect(header).to.match(nonceRegex);
            expect(header).to.match(timestampRegex);

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
                            url: global.servers.edgegrid,
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
                header = request.headers.get('Authorization'),
                nonceRegex = /nonce=([A-Z]|[a-z]|[0-9]|-){36};/,
                timestampRegex = /timestamp=[0-9]{8}T[0-9]{2}:[0-9]{2}:[0-9]{2}\+0000;/;

            expect(header).to.be.a('string');
            expect(header).to.include(`client_token=${credentials.clientToken}`);
            expect(header).to.include(`access_token=${credentials.accessToken}`);
            expect(header).to.include('signature=');
            expect(header).to.match(nonceRegex);
            expect(header).to.match(timestampRegex);

            expect(response).to.have.property('code', 200);
        });
    });

    describe('with correct credentials and max body, body as text', function () {
        var testrun;

        before(function (done) {
            // perform the collection run
            this.run({
                collection: {
                    item: {
                        request: {
                            auth: {
                                type: 'edgegrid',
                                edgegrid: { ...credentials, maxBody: 48 }
                            },
                            url: global.servers.edgegrid,
                            method: 'POST',
                            body: {
                                mode: 'raw',
                                raw: 'Hello World!!! Hello World!!! Hello World!!! Hello World!!!'
                            }
                        }
                    }
                }
            }, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        it('should pass the EdgeGrid authentication', function () {
            expect(testrun).to.nested.include({
                'request.callCount': 1
            });

            var request = testrun.request.getCall(0).args[3],
                response = testrun.request.getCall(0).args[2],
                header = request.headers.get('Authorization'),
                nonceRegex = /nonce=([A-Z]|[a-z]|[0-9]|-){36};/,
                timestampRegex = /timestamp=[0-9]{8}T[0-9]{2}:[0-9]{2}:[0-9]{2}\+0000;/;

            expect(header).to.be.a('string');
            expect(header).to.include(`client_token=${credentials.clientToken}`);
            expect(header).to.include(`access_token=${credentials.accessToken}`);
            expect(header).to.include('signature=');
            expect(header).to.match(nonceRegex);
            expect(header).to.match(timestampRegex);

            expect(response).to.have.property('code', 200);
        });
    });

    describe('with correct credentials and max body, body as json', function () {
        var testrun;

        before(function (done) {
            // perform the collection run
            this.run({
                collection: {
                    item: {
                        request: {
                            auth: {
                                type: 'edgegrid',
                                edgegrid: { ...credentials, maxBody: 48 }
                            },
                            url: global.servers.edgegrid,
                            method: 'POST',
                            body: {
                                mode: 'raw',
                                raw: '{\n    "key": "Hello World!!! Hello World!!! Hello World!!! Hello World!!!"\n}',
                                options: {
                                    raw: {
                                        language: 'json'
                                    }
                                }
                            }
                        }
                    }
                }
            }, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        it('should pass the EdgeGrid authentication', function () {
            expect(testrun).to.nested.include({
                'request.callCount': 1
            });

            var request = testrun.request.getCall(0).args[3],
                response = testrun.request.getCall(0).args[2],
                header = request.headers.get('Authorization'),
                nonceRegex = /nonce=([A-Z]|[a-z]|[0-9]|-){36};/,
                timestampRegex = /timestamp=[0-9]{8}T[0-9]{2}:[0-9]{2}:[0-9]{2}\+0000;/;

            expect(header).to.be.a('string');
            expect(header).to.include(`client_token=${credentials.clientToken}`);
            expect(header).to.include(`access_token=${credentials.accessToken}`);
            expect(header).to.include('signature=');
            expect(header).to.match(nonceRegex);
            expect(header).to.match(timestampRegex);

            expect(response).to.have.property('code', 200);
        });
    });

    describe('with correct credentials and max body, body as GraphQl', function () {
        var testrun;

        before(function (done) {
            // perform the collection run
            this.run({
                collection: {
                    item: {
                        request: {
                            auth: {
                                type: 'edgegrid',
                                edgegrid: { ...credentials, maxBody: 48 }
                            },
                            url: global.servers.edgegrid,
                            method: 'POST',
                            body: {
                                mode: 'graphql',
                                graphql: {
                                    query: 'query Hello {\n    Hello World!!! Hello World!!! Hello World!!! Hello\n}',
                                    variables: ''
                                }
                            }
                        }
                    }
                }
            }, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        it('should pass the EdgeGrid authentication', function () {
            expect(testrun).to.nested.include({
                'request.callCount': 1
            });

            var request = testrun.request.getCall(0).args[3],
                response = testrun.request.getCall(0).args[2],
                header = request.headers.get('Authorization'),
                nonceRegex = /nonce=([A-Z]|[a-z]|[0-9]|-){36};/,
                timestampRegex = /timestamp=[0-9]{8}T[0-9]{2}:[0-9]{2}:[0-9]{2}\+0000;/;

            expect(header).to.be.a('string');
            expect(header).to.include(`client_token=${credentials.clientToken}`);
            expect(header).to.include(`access_token=${credentials.accessToken}`);
            expect(header).to.include('signature=');
            expect(header).to.match(nonceRegex);
            expect(header).to.match(timestampRegex);

            expect(response).to.have.property('code', 200);
        });
    });

    describe('with correct credentials and max body, body as binary file', function () {
        var testrun;

        before(function (done) {
            // perform the collection run
            this.run({
                collection: {
                    item: {
                        request: {
                            auth: {
                                type: 'edgegrid',
                                edgegrid: { ...credentials, maxBody: 48 }
                            },
                            url: global.servers.edgegrid,
                            method: 'POST',
                            body: {
                                mode: 'file',
                                file: {
                                    src: path.resolve(__dirname, '../../fixtures/new-csv')
                                }
                            }
                        }
                    }
                },
                fileResolver: fs
            }, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        it('should pass the EdgeGrid authentication', function () {
            expect(testrun).to.nested.include({
                'request.callCount': 1
            });

            var request = testrun.request.getCall(0).args[3],
                response = testrun.request.getCall(0).args[2],
                header = request.headers.get('Authorization'),
                nonceRegex = /nonce=([A-Z]|[a-z]|[0-9]|-){36};/,
                timestampRegex = /timestamp=[0-9]{8}T[0-9]{2}:[0-9]{2}:[0-9]{2}\+0000;/;

            expect(header).to.be.a('string');
            expect(header).to.include(`client_token=${credentials.clientToken}`);
            expect(header).to.include(`access_token=${credentials.accessToken}`);
            expect(header).to.include('signature=');
            expect(header).to.match(nonceRegex);
            expect(header).to.match(timestampRegex);

            expect(response).to.have.property('code', 200);
        });
    });
});
