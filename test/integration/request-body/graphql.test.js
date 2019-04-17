var expect = require('chai').expect,
    server = require('../../fixtures/server');

describe('Request Body Mode: graphql', function () {
    var testrun,
        graphqlServer = server.createGraphQLServer({
            schema: `
                type Query {
                    hello: String,
                    square(n: Int!): Int
                }
            `,
            root: {
                hello: function () {
                    return 'Hello world!';
                },
                square: function (args) {
                    return args.n * args.n;
                }
            }
        });

    before(function (done) {
        graphqlServer.listen(0, done);
    });

    after(function (done) {
        graphqlServer.destroy(done);
    });

    describe('single query', function () {
        before(function (done) {
            this.run({
                collection: {
                    item: [{
                        request: {
                            url: graphqlServer.url,
                            method: 'POST',
                            body: {
                                mode: 'graphql',
                                graphql: {
                                    query: '{ hello }'
                                }
                            }
                        }
                    }]
                }
            }, function (err, results) {
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

        it('should transform graphql request body correctly', function () {
            var response = testrun.response.getCall(0).args[2],
                responseBody = JSON.parse(response.stream.toString());

            expect(response).to.have.property('code', 200);

            expect(responseBody.request).to.have.property('headers');
            expect(responseBody.request.headers).to.have.property('content-type', 'application/json');

            expect(responseBody.request).to.have.property('body', '{"query":"{ hello }"}');
            expect(responseBody.result).to.eql({
                data: {hello: 'Hello world!'}
            });
        });
    });

    describe('multiple queries', function () {
        before(function (done) {
            this.run({
                collection: {
                    item: [{
                        request: {
                            url: graphqlServer.url,
                            method: 'POST',
                            body: {
                                mode: 'graphql',
                                graphql: {
                                    query: 'query Test { hello } query Test2 { hello }',
                                    operationName: 'Test'
                                }
                            }
                        }
                    }]
                }
            }, function (err, results) {
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

        it('should transform graphql request body correctly', function () {
            var response = testrun.response.getCall(0).args[2],
                responseBody = JSON.parse(response.stream.toString());

            expect(response).to.have.property('code', 200);

            expect(responseBody.request).to.have.property('headers');
            expect(responseBody.request.headers).to.have.property('content-type', 'application/json');

            expect(responseBody.request).to.have.property('body',
                '{"query":"query Test { hello } query Test2 { hello }","operationName":"Test"}');
            expect(responseBody.result).to.eql({
                data: {hello: 'Hello world!'}
            });
        });
    });

    describe('empty query', function () {
        before(function (done) {
            this.run({
                collection: {
                    item: [{
                        request: {
                            url: graphqlServer.url,
                            method: 'POST',
                            body: {
                                mode: 'graphql',
                                graphql: {}
                            }
                        }
                    }]
                }
            }, function (err, results) {
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

        it('should transform graphql request body correctly', function () {
            var response = testrun.response.getCall(0).args[2],
                responseBody = JSON.parse(response.stream.toString());

            expect(response).to.have.property('code', 400);

            expect(responseBody.request).to.have.property('headers');
            expect(responseBody.request.headers).to.have.property('content-type', 'application/json');

            expect(responseBody.request).to.have.property('body', '{}');
            expect(responseBody.error).to.be.an('array').that.is.not.empty;
        });
    });

    describe('variables', function () {
        before(function (done) {
            this.run({
                collection: {
                    item: [{
                        request: {
                            url: graphqlServer.url,
                            method: 'POST',
                            body: {
                                mode: 'graphql',
                                graphql: {
                                    query: `
                                        query Square($ten: Int!) {
                                            square(n: $ten)
                                        }
                                    `,
                                    variables: {ten: 10}
                                }
                            }
                        }
                    }]
                }
            }, function (err, results) {
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

        it('should transform graphql request body correctly', function () {
            var response = testrun.response.getCall(0).args[2],
                responseBody = JSON.parse(response.stream.toString());

            expect(response).to.have.property('code', 200);

            expect(responseBody.request).to.have.property('headers');
            expect(responseBody.request.headers).to.have.property('content-type', 'application/json');

            expect(responseBody.result).to.eql({
                data: {square: 100}
            });
        });
    });

    describe('missing operationName', function () {
        before(function (done) {
            this.run({
                collection: {
                    item: [{
                        request: {
                            url: graphqlServer.url,
                            method: 'POST',
                            body: {
                                mode: 'graphql',
                                graphql: {
                                    query: `
                                        query Square($ten: Int!) { square(n: $ten) }
                                        query Test { hello }
                                    `,
                                    variables: JSON.stringify({ten: 2}) // stringified JSON
                                }
                            }
                        }
                    }]
                }
            }, function (err, results) {
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

        it('should transform graphql request body correctly', function () {
            var response = testrun.response.getCall(0).args[2],
                responseBody = JSON.parse(response.stream.toString());

            expect(response).to.have.property('code', 400);

            expect(responseBody.request).to.have.property('headers');
            expect(responseBody.request.headers).to.have.property('content-type', 'application/json');

            expect(responseBody.error).to.be.an('array').that.is.not.empty;
            expect(responseBody.error[0]).to.have.property('message',
                'Must provide operation name if query contains multiple operations.');
        });
    });

    describe('empty variables as a string', function () {
        before(function (done) {
            this.run({
                collection: {
                    item: [{
                        request: {
                            url: graphqlServer.url,
                            method: 'POST',
                            body: {
                                mode: 'graphql',
                                graphql: {
                                    query: 'query Test { hello }',
                                    operationName: 'Test',
                                    variables: '' // blank string as variables
                                }
                            }
                        }
                    }]
                }
            }, function (err, results) {
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

        it('should allow a valid JSON to go through by omiting variables', function () {
            var response = testrun.response.getCall(0).args[2],
                responseBody = JSON.parse(response.stream.toString());

            expect(response).to.have.property('code', 200);

            expect(responseBody.request).to.have.property('headers');
            expect(responseBody.request.headers).to.have.property('content-type', 'application/json');

            expect(responseBody.request).to.have.property('body',
                '{"query":"query Test { hello }","operationName":"Test"}');
            expect(responseBody.result).to.eql({
                data: {hello: 'Hello world!'}
            });
        });
    });
});
