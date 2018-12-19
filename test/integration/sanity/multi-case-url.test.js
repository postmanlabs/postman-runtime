var expect = require('chai').expect,
    sinon = require('sinon');

describe('different case url', function() {
    var testrun;
    describe('lowercase', function() {
        before(function(done) {
            this.run({
                collection: {
                    item: [{
                        request: {
                            url: 'http://postman-echo.com/post',
                            method: 'POST'
                        }
                    }]
                }
            }, function(err, result) {
                testrun = result;
                done(err);
            });
        });

        it('should process request when url is in lowercase', function() {
            sinon.assert.calledOnce(testrun.start);
            sinon.assert.calledOnce(testrun.done);
            sinon.assert.calledWith(testrun.done.getCall(0), null);
            sinon.assert.calledOnce(testrun.request);
            sinon.assert.calledWith(testrun.request.getCall(0), null);
            sinon.assert.calledOnce(testrun.response);
            sinon.assert.calledWith(testrun.response.getCall(0), null);

            expect(testrun.response.getCall(0).args[2]).to.have.property('code', 200);
            expect(testrun.response.getCall(0).args[2].stream.toString()).to.include('https://postman-echo.com/post');
        });
    });

    describe('uppercase', function() {
        before(function(done) {
            this.run({
                collection: {
                    item: [{
                        request: {
                            url: 'HTTP://POSTMAN-ECHO.COM/POST',
                            method: 'POST'
                        }
                    }]
                }
            }, function(err, result) {
                testrun = result;
                done(err);
            });
        });

        it('should process request when url is in uppercase', function() {
            sinon.assert.calledOnce(testrun.start);
            sinon.assert.calledOnce(testrun.done);
            sinon.assert.calledWith(testrun.done.getCall(0), null);
            sinon.assert.calledOnce(testrun.request);
            sinon.assert.calledWith(testrun.request.getCall(0), null);
            sinon.assert.calledOnce(testrun.response);
            sinon.assert.calledWith(testrun.response.getCall(0), null);

            expect(testrun.response.getCall(0).args[2]).to.have.property('code', 200);
            expect(testrun.response.getCall(0).args[2].stream.toString()).to.include('https://postman-echo.com/POST');
        });
    });

    describe('mixed Case', function() {
        before(function(done) {
            this.run({
                collection: {
                    item: [{
                        request: {
                            url: 'HtTp://POSTMAN-ECHO.COM/POST',
                            method: 'POST'
                        }
                    }]
                }
            }, function(err, result) {
                testrun = result;
                done(err);
            });
        });

        it('should process request when url is in mixed case', function() {
            sinon.assert.calledOnce(testrun.start);
            sinon.assert.calledOnce(testrun.done);
            sinon.assert.calledWith(testrun.done.getCall(0), null);
            sinon.assert.calledWith(testrun.done.getCall(0), null);
            sinon.assert.calledOnce(testrun.request);
            sinon.assert.calledWith(testrun.request.getCall(0), null);
            sinon.assert.calledOnce(testrun.response);
            sinon.assert.calledWith(testrun.response.getCall(0), null);

            expect(testrun.response.getCall(0).args[2]).to.have.property('code', 200);
            expect(testrun.response.getCall(0).args[2].stream.toString()).to.include('https://postman-echo.com/POST');

        });
    });


    describe('mixed Case with https', function() {
        before(function(done) {
            this.run({
                collection: {
                    item: [{
                        request: {
                            url: 'HtTpS://POsTMaN-ecHo.cOm/PosT',
                            method: 'POST'
                        }
                    }]
                }
            }, function(err, result) {
                testrun = result;
                done(err);
            });
        });

        it('should process https request when url is in mixed case : HtTpS://...', function() {
            sinon.assert.calledOnce(testrun.start);
            sinon.assert.calledOnce(testrun.done);
            sinon.assert.calledWith(testrun.done.getCall(0), null);
            sinon.assert.calledWith(testrun.done.getCall(0), null);
            sinon.assert.calledOnce(testrun.request);
            sinon.assert.calledWith(testrun.request.getCall(0), null);
            sinon.assert.calledOnce(testrun.response);
            sinon.assert.calledWith(testrun.response.getCall(0), null);

            expect(testrun.response.getCall(0).args[2]).to.have.property('code', 200);
            expect(testrun.response.getCall(0).args[2].stream.toString()).to.include('https://postman-echo.com/PosT');

        });
    });

});
