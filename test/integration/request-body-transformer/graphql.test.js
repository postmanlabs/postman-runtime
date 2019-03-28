var expect = require('chai').expect;

// @todo test with GraphQL server and add more tests
describe('BodyTransformer: graphql', function () {
    var testrun;

    before(function (done) {
        this.run({
            collection: {
                item: [{
                    request: {
                        url: 'https://postman-echo.com/post',
                        method: 'POST',
                        header: [{
                            key: 'Content-Type',
                            value: 'application/json'
                        }],
                        body: {
                            mode: 'transform',
                            transform: {
                                type: 'graphql',
                                content: 'query Test { hello }',
                                params: {
                                    operationName: 'Test',
                                    variables: {
                                        foo: 'bar'
                                    }
                                }
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
        var response = JSON.parse(testrun.response.getCall(0).args[2].stream.toString());

        expect(response).to.have.property('json');
        expect(response.json).to.eql({
            query: 'query Test { hello }',
            operationName: 'Test',
            variables: {
                foo: 'bar'
            }
        });
    });
});
