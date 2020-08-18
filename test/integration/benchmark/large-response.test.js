var sinon = require('sinon'),
    expect = require('chai').expect;

// @todo move to bipbip
(typeof window === 'undefined' ? describe : describe.skip)('Benchmark: large response', function () {
    var testrun;

    // @todo increase to 100 MB once we drop support for Node v6
    describe('50 MB response with test script', function () {
        const RESPONSE_SIZE = 50 * 1024 * 1024; // 50 MB

        before(function (done) {
            this.run({
                timeout: {
                    global: 20000 // 20s
                },
                collection: {
                    item: [{
                        request: global.servers.bytes + '/' + (RESPONSE_SIZE),
                        event: [{
                            listen: 'test',
                            script: {
                                type: 'text/javascript',
                                exec: `
                                "use sandbox2";
                                pm.test("response size", function () {
                                    pm.response.to.be.ok;
                                    pm.response.to.have.statusCode(200);
                                    pm.expect(pm.response.size().body).to.equal(${RESPONSE_SIZE});
                                });
                                `
                            }
                        }]
                    }]
                }
            }, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        it('should complete the run', function () {
            expect(testrun).to.be.ok;
            sinon.assert.calledOnce(testrun.start);
            sinon.assert.calledOnce(testrun.done);
            sinon.assert.calledWith(testrun.done.getCall(0), null);
        });

        it('should run the test script successfully', function () {
            sinon.assert.calledOnce(testrun.request);
            sinon.assert.calledWith(testrun.request.getCall(0), null);

            sinon.assert.calledOnce(testrun.response);
            sinon.assert.calledWith(testrun.response.getCall(0), null);

            sinon.assert.calledOnce(testrun.assertion);

            expect(testrun.assertion.getCall(0).args[1][0]).to.include({
                error: null,
                index: 0,
                passed: true,
                skipped: false,
                name: 'response size'
            });
        });
    });
});
