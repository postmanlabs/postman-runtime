var expect = require('chai').expect,
    sinon = require('sinon');

(typeof window === 'undefined' ? describe : describe.skip)('Requester Spec: history', function () {
    var testrun;

    describe('default', function () {
        before(function (done) {
            this.run({
                collection: {
                    item: [{
                        request: {
                            url: 'https://httpbin.org/get',
                            method: 'GET',
                            header: [{
                                key: 'Connection',
                                value: 'close'
                            }]
                        }
                    }]
                }
            }, function (err, result) {
                testrun = result;
                done(err);
            });
        });

        it('should complete the run', function () {
            expect(testrun).to.be.ok;
            sinon.assert.calledOnce(testrun.start);
            sinon.assert.calledOnce(testrun.done);
            sinon.assert.calledWith(testrun.done.getCall(0), null);
            sinon.assert.calledWith(testrun.request.getCall(0), null);
            sinon.assert.calledWith(testrun.response.getCall(0), null);
        });

        it('should contain history object by default', function () {
            var history = testrun.request.getCall(0).lastArg,
                executionData;

            // `history` should be present
            expect(history).to.be.an('object').to.have.property('execution');
            expect(history.execution).to.be.an('object').that.has.all.keys(['verbose', 'sessions', 'data']);

            // same as response history
            expect(history).to.eql(testrun.response.getCall(0).lastArg);

            expect(history.execution.verbose).to.be.false;
            expect(history.execution.sessions).to.eql({});
            expect(history.execution.data).to.be.an('array').that.have.lengthOf(1);

            executionData = history.execution.data[0];

            expect(executionData).to.be.an('object').that.has.all.keys(['request', 'response', 'timings', 'session']);
            expect(executionData.request).to.be.an('object').that.is.not.empty;
            expect(executionData.response).to.be.an('object').that.is.not.empty;
            expect(executionData.timings).to.be.an('object').that.is.not.empty;
            expect(executionData.session).to.be.undefined;
        });
    });

    describe('with verbose: true', function () {
        before(function (done) {
            this.run({
                collection: {
                    item: [{
                        request: {
                            url: 'https://httpbin.org/get',
                            method: 'GET',
                            header: [{
                                key: 'Connection',
                                value: 'close'
                            }]
                        }
                    }]
                },
                requester: {
                    verbose: true
                }
            }, function (err, result) {
                testrun = result;
                done(err);
            });
        });

        it('should complete the run', function () {
            expect(testrun).to.be.ok;
            sinon.assert.calledOnce(testrun.start);
            sinon.assert.calledOnce(testrun.done);
            sinon.assert.calledWith(testrun.done.getCall(0), null);
            sinon.assert.calledWith(testrun.request.getCall(0), null);
            sinon.assert.calledWith(testrun.response.getCall(0), null);
        });

        it('should contain history object with verbose details', function () {
            sinon.assert.calledOnce(testrun.request);
            sinon.assert.calledOnce(testrun.response);

            var history = testrun.request.getCall(0).lastArg,
                session,
                executionData;

            // `history` should be present
            expect(history).to.be.an('object').to.have.property('execution');
            expect(history.execution).to.be.an('object').that.has.all.keys(['verbose', 'sessions', 'data']);

            // same as response history
            expect(history).to.eql(testrun.response.getCall(0).lastArg);

            expect(history.execution.verbose).to.be.true;
            expect(history.execution.data).to.be.an('array').that.have.lengthOf(1);
            expect(history.execution.sessions).to.be.an('object').that.is.not.empty;

            executionData = history.execution.data[0];
            session = history.execution.sessions[executionData.session.id];

            expect(session).to.have.all.keys(['addresses', 'tls']);

            expect(executionData).to.be.an('object').that.has.all.keys(['request', 'response', 'timings', 'session']);
            expect(executionData.request).to.be.an('object').that.is.not.empty;
            expect(executionData.response).to.be.an('object').that.is.not.empty;
            expect(executionData.timings).to.be.an('object').that.is.not.empty;
            expect(executionData.session).to.be.an('object').that.is.not.empty;
        });
    });

    describe('on request error', function () {
        before(function (done) {
            this.run({
                collection: {
                    item: [{
                        request: {
                            url: 'https://httpbin.org/get',
                            method: 'GET',
                            header: [{
                                key: 'Invalid Header Name', // contains spaces
                                value: 'value'
                            }]
                        }
                    }]
                },
                requester: {
                    verbose: true
                }
            }, function (err, result) {
                testrun = result;
                done(err);
            });
        });

        it('should complete the run', function () {
            expect(testrun).to.be.ok;
            sinon.assert.calledOnce(testrun.start);
            sinon.assert.calledOnce(testrun.done);
            sinon.assert.calledWith(testrun.done.getCall(0), null);
        });

        it('should contain history object irrespective of request error', function () {
            sinon.assert.calledOnce(testrun.request);
            sinon.assert.calledOnce(testrun.response);

            expect(testrun.request.getCall(0).args[0]).to.be.an('error');
            expect(testrun.response.getCall(0).args[0]).to.be.an('error');

            var history = testrun.request.getCall(0).lastArg,
                executionData;

            // `history` should be present
            expect(history).to.be.an('object').to.have.property('execution');
            expect(history.execution).to.be.an('object').that.has.all.keys(['verbose', 'sessions', 'data']);

            // same as response history
            expect(history).to.eql(testrun.response.getCall(0).lastArg);

            expect(history.execution.verbose).to.be.true;
            expect(history.execution.sessions).to.eql({});
            expect(history.execution.data).to.be.an('array').that.have.lengthOf(1);

            executionData = history.execution.data[0];

            expect(executionData).to.be.an('object').that.has.all.keys(['request', 'response', 'timings', 'session']);
            expect(executionData.request).to.be.an('object').that.is.not.empty;
            expect(executionData.response).to.be.undefined;
            expect(executionData.timings).to.be.undefined;
            expect(executionData.session).to.be.undefined;
        });
    });
});
