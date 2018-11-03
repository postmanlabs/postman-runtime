var expect = require('chai').expect;

describe('Set next request', function() {
    var testrun;

    before(function(done) {
        this.run({
            collection: {
                item: [{
                    name: 'one',
                    request: {
                        url: 'https://postman-echo.com/get?name=one',
                        method: 'GET'
                    },
                    event: [{
                        listen: 'test',
                        script: {
                            exec: ['postman.setNextRequest("three");']
                        }
                    }]
                }, {
                    name: 'two',
                    request: {
                        url: 'https://postman-echo.com/get?name=two',
                        method: 'GET'
                    }
                }, {
                    name: 'three',
                    request: {
                        url: 'https://postman-echo.com/get?name=three',
                        method: 'GET'
                    }
                }]
            }
        }, function(err, results) {
            testrun = results;
            done(err);
        });
    });

    it('should have run the test script successfully', function() {
        expect(testrun).to.be.ok;
        expect(testrun).to.nested.include({
            'request.calledTwice': true
        });

        expect(testrun.request.getCall(0)).to.have.nested.property('args[4].name', 'one');
        expect(testrun.request.getCall(1)).to.have.nested.property('args[4].name', 'three');
    });

    it('should have completed the run', function() {
        expect(testrun).to.be.ok;
        expect(testrun.done.getCall(0).args[0]).to.be.null;
        expect(testrun).to.nested.include({
            'done.calledOnce': true,
            'start.calledOnce': true
        });
    });
});
