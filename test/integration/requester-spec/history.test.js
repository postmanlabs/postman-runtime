var expect = require('chai').expect,
    sinon = require('sinon');

describe('Requester Spec: history', function () {
    var testrun,
        url = 'https://postman-echo.com/get';

    describe('with error', function () {
        before(function (done) {
            this.run({
                collection: {
                    item: [{
                        request: {
                            url,
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

        it('should contain history object', function () {
            var history = testrun.request.getCall(0).lastArg;

            sinon.assert.calledOnce(testrun.request);
            sinon.assert.calledOnce(testrun.response);

            // `history` should be present
            expect(history).to.be.an('object').to.have.property('execution');
            expect(history.execution).to.be.an('object').that.has.all.keys(['verbose', 'sessions', 'data']);
            expect(history.execution.data[0].request).to.be.an('object').and.not.be.empty;

            // `history` should not have data about response as it had error
            expect(history.execution.data[0].response).to.be.undefined;

            // session was not established, hence it should be empty
            expect(history.execution.sessions).to.be.an('object').and.be.empty;
        });
    });


    describe('without error', function () {
        before(function (done) {
            this.run({
                collection: {
                    item: [{
                        request: {
                            url,
                            method: 'GET',
                            header: [{
                                key: 'ValidHeaderName',
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

        it('should contain history object', function () {
            var history = testrun.request.getCall(0).lastArg,
                executionData = history.execution.data[0];

            sinon.assert.calledOnce(testrun.request);
            sinon.assert.calledOnce(testrun.response);

            // `history` should be present
            expect(history).to.be.an('object').to.have.property('execution');
            expect(history.execution).to.be.an('object').that.has.all.keys(['verbose', 'sessions', 'data']);

            expect(executionData.request).to.be.an('object').and.not.be.empty;
            expect(executionData.response).to.be.an('object').and.not.be.empty;
            expect(executionData.timings).to.be.an('object').and.not.be.empty;
            expect(executionData.session).to.be.an('object').and.not.be.empty;

            // session was established, hence it should not be empty
            expect(history.execution.sessions).to.be.an('object').and.not.be.empty;
        });
    });
});
