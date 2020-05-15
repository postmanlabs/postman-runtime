var sinon = require('sinon'),
    http = require('http'),
    expect = require('chai').expect;

describe('Requester Spec: agent', function () {
    var testrun,
        customAgent = new http.Agent(),
        agentSpy = sinon.spy(customAgent, 'createConnection');

    before(function (done) {
        this.run({
            collection: {
                item: [{
                    request: 'http://postman-echo.com/get'
                }]
            },
            requester: {
                agent: customAgent
            }
        }, function (err, results) {
            testrun = results;
            done(err);
        });
    });

    after(function () {
        agentSpy.restore();
    });

    it('should accept custom requesting agent', function () {
        expect(testrun).to.be.ok;
        sinon.assert.calledWith(testrun.done.getCall(0), null);
        sinon.assert.calledWith(testrun.request.getCall(0), null);
        sinon.assert.calledWith(testrun.response.getCall(0), null);
        sinon.assert.calledOnce(agentSpy);

        var options = agentSpy.getCall(0).args[0],
            response = testrun.response.getCall(0).args[2];

        expect(options).to.have.property('agent').that.eql(customAgent);
        expect(response.reason()).to.equal('OK');
    });
});
