var expect = require('chai').expect;
describe('Different case url', function() {

    describe('Lowercase', function() {
        var testrun;
        before(function(done) {
            this.run({
                collection: {
                    item: [{
                        request: {
                            url: 'http://postman-echo.com/post',
                            method: 'POST',
                            body: {
                                mode: 'raw',
                                raw: ''
                            }
                        }
                    }]
                }
            }, function(err, result) {
                testrun = result;
                done(err);
            });
        });

        it('Should process request when url is in lowercase', function() {
            expect(testrun.response.getCall(0).args[2]).to.have.property('code', 200);
            expect(testrun.response.getCall(0).args[3].url.toString()).eql('http://postman-echo.com/post');
        });
    });

    describe('Uppercase', function() {
        var testrun;
        before(function(done) {
            this.run({
                collection: {
                    item: [{
                        request: {
                            url: 'HTTP://POSTMAN-ECHO.COM/POST',
                            method: 'POST',
                            body: {
                                mode: 'raw',
                                raw: ''
                            }
                        }
                    }]
                }
            }, function(err, result) {
                testrun = result;
                done(err);
            });
        });

        it('Should process request when url is in uppercase', function() {
            expect(testrun.response.getCall(0).args[2]).to.have.property('code', 200);
            expect(testrun.response.getCall(0).args[3].url.toString()).eql('HTTP://POSTMAN-ECHO.COM/POST');
        });
    });

    describe('Mixed Case', function() {
        var testrun;
        before(function(done) {
            this.run({
                collection: {
                    item: [{
                        request: {
                            url: 'HtTp://POSTMAN-ECHO.COM/POST',
                            method: 'POST',
                            body: {
                                mode: 'raw',
                                raw: ''
                            }
                        }
                    }]
                }
            }, function(err, result) {
                testrun = result;
                done(err);
            });
        });

        it('Should process request when url is in mixed case', function() {
            expect(testrun.response.getCall(0).args[2]).to.have.property('code', 200);
            expect(testrun.response.getCall(0).args[3].url.toString()).eql('HtTp://POSTMAN-ECHO.COM/POST');
        });
    });


    describe('Mixed Case with https', function() {
        var testrun;
        before(function(done) {
            this.run({
                collection: {
                    item: [{
                        request: {
                            url: 'HtTpS://POsTMaN-ecHo.cOm/PosT',
                            method: 'POST',
                            body: {
                                mode: 'raw',
                                raw: ''
                            }
                        }
                    }]
                }
            }, function(err, result) {
                testrun = result;
                done(err);
            });
        });

        it('Should process https request when url is in mixed case : HtTpS://...', function() {
            expect(testrun.response.getCall(0).args[2]).to.have.property('code', 200);
            expect(testrun.response.getCall(0).args[3].url.toString()).eql('HtTpS://POsTMaN-ecHo.cOm/PosT');
        });
    });

});
