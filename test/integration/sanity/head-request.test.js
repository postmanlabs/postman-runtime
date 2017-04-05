describe('HEAD requests', function () {
    var testrun;

    before(function (done) {
        this.run({
            collection: {
                item: [{
                    request: {
                        url: 'http://google.com',
                        method: 'HEAD',
                        body: {
                            mode: 'formdata',
                            formdata: []
                        }
                    }
                }, {
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

    it('must have completed the HEAD requests successfully', function () {
        expect(testrun).be.ok();
        expect(testrun.request.calledTwice).be.ok();

        expect(testrun.request.getCall(0).args[0]).to.be(null);
        expect(testrun.request.getCall(0).args[2].code).to.be(200);

        expect(testrun.request.getCall(1).args[0]).to.be(null);
        expect(testrun.request.getCall(1).args[2].code).to.be(200);
    });

    it('must have completed the run', function () {
        expect(testrun).be.ok();
        expect(testrun.done.calledOnce).be.ok();
        expect(testrun.done.getCall(0).args[0]).to.be(null);
        expect(testrun.start.calledOnce).be.ok();
    });
});
