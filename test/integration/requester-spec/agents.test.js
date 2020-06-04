var sinon = require('sinon'),
    http = require('http'),
    https = require('https'),
    expect = require('chai').expect;

describe('Requester Spec: agents', function () {
    var testrun;

    describe('http agent', function () {
        var customAgent = new http.Agent(),
            agentSpy = sinon.spy(customAgent, 'createConnection');

        before(function (done) {
            this.run({
                collection: {
                    item: [{
                        request: 'http://postman-echo.com/get'
                    }]
                },
                requester: {
                    agents: {
                        http: customAgent
                    }
                }
            }, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        after(function () {
            agentSpy.restore();
        });

        it('should accept custom http agent', function () {
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

    describe('https agent', function () {
        var customAgent = new https.Agent(),
            agentSpy = sinon.spy(customAgent, 'createConnection');

        before(function (done) {
            this.run({
                collection: {
                    item: [{
                        request: 'https://postman-echo.com/get'
                    }]
                },
                requester: {
                    agents: {
                        https: customAgent
                    }
                }
            }, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        after(function () {
            agentSpy.restore();
        });

        it('should accept custom https agent', function () {
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

    describe('http to https redirection', function () {
        var httpAgentSpy = sinon.spy(http.Agent.prototype, 'createConnection'),
            httpsAgentSpy = sinon.spy(https.Agent.prototype, 'createConnection');

        before(function (done) {
            this.run({
                collection: {
                    item: [{
                        request: 'http://postman-echo.com/redirect-to?url=https://httpbin.org/get'
                    }]
                },
                requester: {
                    agents: {
                        http: {
                            agentClass: http.Agent
                        },
                        https: {
                            agentClass: https.Agent,
                            agentOptions: {foo: 'bar'}
                        }
                    }
                }
            }, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        after(function () {
            httpAgentSpy.restore();
            httpsAgentSpy.restore();
        });

        it('should accept custom requesting agents', function () {
            expect(testrun).to.be.ok;
            sinon.assert.calledWith(testrun.done.getCall(0), null);
            sinon.assert.calledOnce(testrun.request);
            sinon.assert.calledOnce(testrun.response);

            sinon.assert.calledOnce(httpAgentSpy);
            sinon.assert.calledOnce(httpsAgentSpy);

            var httpAgentOpts = httpAgentSpy.getCall(0).args[0],
                httpsAgentOpts = httpsAgentSpy.getCall(0).args[0],
                response = testrun.response.getCall(0).args[2];

            expect(httpsAgentOpts).to.have.property('agent').that.be.an.instanceof(http.Agent);
            expect(httpAgentOpts).to.have.property('host').that.equal('postman-echo.com');
            // inherited from requester.keepAlive because agentOptions are not provided
            expect(httpAgentOpts.agent).to.have.property('options').that.include({keepAlive: true});

            expect(httpsAgentOpts).to.have.property('agent').that.be.an.instanceof(https.Agent);
            expect(httpsAgentOpts).to.have.property('host').that.equal('httpbin.org');
            expect(httpsAgentOpts.agent).to.have.property('options').that.include({foo: 'bar'});

            expect(response.reason()).to.equal('OK');
        });
    });
});
