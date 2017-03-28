describe('HEAD requests', function () {
    var _ = require('lodash'),
        testrun;

    before(function (done) {
        this.run({
            collection: {
                item: [{
                    event: [{
                        listen: 'test',
                        script: {
                            exec: 'tests["Status is 200 OK"] = responseCode.code === 200;'
                        }
                    }],
                    request: {
                        url: 'http://google.com',
                        method: 'HEAD',
                        body: {
                            mode: 'formdata',
                            formdata: []
                        }
                    }
                }, {
                    event: [{
                        listen: 'test',
                        script: {
                            exec: 'tests["Status is 200 OK"] = responseCode.code === 200;'
                        }
                    }],
                    request: {
                        url: 'http://github.com',
                        method: 'HEAD',
                        body: {
                            mode: 'formdata',
                            formdata: []
                        }
                    }
                }]
            }
        }, function (err, results) {
            testrun = results;
            done(err);
        });
    });

    it('must have run the test script successfully', function () {
        expect(testrun).be.ok();
        expect(testrun.test.calledTwice).be.ok();

        expect(testrun.test.getCall(0).args[0]).to.be(null);
        expect(_.get(testrun.test.getCall(0).args[2], '0.result.globals.tests["Status is 200 OK"]')).to.be(true);

        expect(testrun.test.getCall(1).args[0]).to.be(null);
        expect(_.get(testrun.test.getCall(1).args[2], '0.result.globals.tests["Status is 200 OK"]')).to.be(true);
    });

    it('must have completed the run', function () {
        expect(testrun).be.ok();
        expect(testrun.done.calledOnce).be.ok();
        expect(testrun.done.getCall(0).args[0]).to.be(null);
        expect(testrun.start.calledOnce).be.ok();
    });
});
