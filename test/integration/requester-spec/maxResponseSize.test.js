var sinon = require('sinon'),
    expect = require('chai').expect;

(typeof window === 'undefined' ? describe : describe.skip)('Requester Spec: maxResponseSize', function () {
    var testrun,
        HOST = 'https://httpbin.org/bytes/10';

    describe('with response > maxResponseSize', function () {
        before(function (done) {
            this.run({
                requester: {
                    maxResponseSize: 9
                },
                collection: {
                    item: [{
                        request: {
                            url: HOST
                        }
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

        it('should abort the request', function () {
            sinon.assert.calledOnce(testrun.request);
            sinon.assert.calledOnce(testrun.response);
            sinon.assert.calledOnce(testrun.responseStart);

            sinon.assert.calledWith(testrun.responseStart.getCall(0), null);
            expect(testrun.request.getCall(0).args[0]).to.have.property('message')
                .that.equal('Maximum response size reached');
            expect(testrun.response.getCall(0).args[0]).to.have.property('message')
                .that.equal('Maximum response size reached');
        });
    });

    describe('with response = maxResponseSize', function () {
        before(function (done) {
            this.run({
                requester: {
                    maxResponseSize: 10
                },
                collection: {
                    item: [{
                        request: {
                            url: HOST
                        }
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

        it('should receive response body', function () {
            sinon.assert.calledOnce(testrun.request);
            sinon.assert.calledOnce(testrun.response);
            sinon.assert.calledOnce(testrun.responseStart);

            sinon.assert.calledWith(testrun.request.getCall(0), null);
            sinon.assert.calledWith(testrun.response.getCall(0), null);
            sinon.assert.calledWith(testrun.responseStart.getCall(0), null);

            var response = testrun.response.getCall(0).args[2];

            expect(response.size()).to.have.property('body', 10);
        });
    });

    describe('with response < maxResponseSize', function () {
        before(function (done) {
            this.run({
                requester: {
                    maxResponseSize: 100
                },
                collection: {
                    item: [{
                        request: {
                            url: HOST
                        }
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

        it('should receive response body', function () {
            sinon.assert.calledOnce(testrun.request);
            sinon.assert.calledOnce(testrun.response);
            sinon.assert.calledOnce(testrun.responseStart);

            sinon.assert.calledWith(testrun.request.getCall(0), null);
            sinon.assert.calledWith(testrun.response.getCall(0), null);
            sinon.assert.calledWith(testrun.responseStart.getCall(0), null);

            var response = testrun.response.getCall(0).args[2];

            expect(response.size()).to.have.property('body', 10);
        });
    });

    describe('with maxResponseSize 0', function () {
        before(function (done) {
            this.run({
                requester: {
                    maxResponseSize: 0
                },
                collection: {
                    item: [{
                        request: {
                            url: HOST
                        }
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

        it('should abort the request', function () {
            sinon.assert.calledOnce(testrun.request);
            sinon.assert.calledOnce(testrun.response);
            sinon.assert.calledOnce(testrun.responseStart);

            sinon.assert.calledWith(testrun.responseStart.getCall(0), null);
            expect(testrun.request.getCall(0).args[0]).to.have.property('message')
                .that.equal('Maximum response size reached');
            expect(testrun.response.getCall(0).args[0]).to.have.property('message')
                .that.equal('Maximum response size reached');
        });
    });

    describe('with maxResponseSize Infinity', function () {
        before(function (done) {
            this.run({
                requester: {
                    maxResponseSize: Infinity
                },
                collection: {
                    item: [{
                        request: {
                            url: HOST
                        }
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

        it('should receive response body', function () {
            sinon.assert.calledOnce(testrun.request);
            sinon.assert.calledOnce(testrun.response);
            sinon.assert.calledOnce(testrun.responseStart);

            sinon.assert.calledWith(testrun.request.getCall(0), null);
            sinon.assert.calledWith(testrun.response.getCall(0), null);
            sinon.assert.calledWith(testrun.responseStart.getCall(0), null);

            var response = testrun.response.getCall(0).args[2];

            expect(response.size()).to.have.property('body', 10);
        });
    });
});
