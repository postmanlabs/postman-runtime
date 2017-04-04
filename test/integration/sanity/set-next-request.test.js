describe('Set next request', function() {
    var _ = require('lodash'),
        testrun;

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

    it('must have run the test script successfully', function() {
        expect(testrun).be.ok();
        expect(testrun.request.calledTwice).be.ok();

        expect(_.get(testrun.request.getCall(0).args[4], 'name')).to.be('one');
        expect(_.get(testrun.request.getCall(1).args[4], 'name')).to.be('three');
    });

    it('must have completed the run', function() {
        expect(testrun).be.ok();
        expect(testrun.done.calledOnce).be.ok();
        expect(testrun.done.getCall(0).args[0]).to.be(null);
        expect(testrun.start.calledOnce).be.ok();
    });
});
