var expect = require('chai').expect,
    sinon = require('sinon');

describe('api key auth', function() {
    var testrun,
        url = 'https://www.postman-echo.com/get',
        api_key = 'SDYD9APseA6TZOHS8FQwYzd1RG4m7euPckK7zxWp',
        secret_api_key = 'EMAF2APseB6TZOHS8FQwYzd1RG4m7euPckK6xzXy';

    describe('with single key in header', function() {
        before(function (done) {
            this.run({
                collection: {
                    item: {
                        request: {
                            auth: {
                                type: 'apikey',
                                apikey: [{
                                    key: 'X-API-KEY',
                                    value: api_key
                                },
                                {
                                    key: 'in',
                                    value: 'header'
                                }]
                            },
                            url: url,
                            method: 'GET'
                        }
                    }
                }
            }, function(err, results) {
                testrun = results;
                done(err);
            });
        });

        it('should have completed the run', function() {
            expect(testrun).to.be.ok;
            sinon.assert.calledOnce(testrun.start);
            sinon.assert.calledOnce(testrun.done);
            sinon.assert.calledWith(testrun.done.getCall(0), null);

            sinon.assert.calledOnce(testrun.request);
            sinon.assert.calledWith(testrun.request.getCall(0), null);

            sinon.assert.calledOnce(testrun.response);
            sinon.assert.calledWith(testrun.response.getCall(0), null);
        });

        it('should include api key parameter in request headers', function() {
            var request = testrun.request.getCall(0).args[3].toJSON(),
                response = JSON.parse(testrun.response.getCall(0).args[2].stream.toString());

            expect(request.header).to.deep.include({key: 'X-API-KEY', value: api_key, system: true});
            expect(response.headers).to.have.property('x-api-key', api_key);
        });
    });

    describe('with multiple keys in header', function() {
        before(function (done) {
            this.run({
                collection: {
                    item: {
                        request: {
                            auth: {
                                type: 'apikey',
                                apikey: [{
                                    key: 'X-API-KEY',
                                    value: api_key
                                },
                                {
                                    key: 'X-SECRET-KEY',
                                    value: secret_api_key
                                },
                                {
                                    key: 'in',
                                    value: 'header'
                                }]
                            },
                            url: url,
                            method: 'GET'
                        }
                    }
                }
            }, function(err, results) {
                testrun = results;
                done(err);
            });
        });

        it('should have completed the run', function() {
            expect(testrun).to.be.ok;
            sinon.assert.calledOnce(testrun.start);
            sinon.assert.calledOnce(testrun.done);
            sinon.assert.calledWith(testrun.done.getCall(0), null);

            sinon.assert.calledOnce(testrun.request);
            sinon.assert.calledWith(testrun.request.getCall(0), null);

            sinon.assert.calledOnce(testrun.response);
            sinon.assert.calledWith(testrun.response.getCall(0), null);
        });

        it('should include api key parameters in request headers', function() {
            var request = testrun.request.getCall(0).args[3].toJSON(),
                response = JSON.parse(testrun.response.getCall(0).args[2].stream.toString());

            expect(request.header).to.deep.include({key: 'X-API-KEY', value: api_key, system: true});
            expect(request.header).to.deep.include({key: 'X-SECRET-KEY', value: secret_api_key, system: true});

            expect(response.headers).to.have.property('x-api-key', api_key);
            expect(response.headers).to.have.property('x-secret-key', secret_api_key);
        });
    });

    describe('with single key in query', function() {
        before(function (done) {
            this.run({
                collection: {
                    item: {
                        request: {
                            auth: {
                                type: 'apikey',
                                apikey: [{
                                    key: 'X-API-KEY',
                                    value: api_key
                                },
                                {
                                    key: 'in',
                                    value: 'query'
                                }]
                            },
                            url: url,
                            method: 'GET'
                        }
                    }
                }
            }, function(err, results) {
                testrun = results;
                done(err);
            });
        });

        it('should have completed the run', function() {
            expect(testrun).to.be.ok;
            sinon.assert.calledOnce(testrun.start);
            sinon.assert.calledOnce(testrun.done);
            sinon.assert.calledWith(testrun.done.getCall(0), null);

            sinon.assert.calledOnce(testrun.request);
            sinon.assert.calledWith(testrun.request.getCall(0), null);

            sinon.assert.calledOnce(testrun.response);
            sinon.assert.calledWith(testrun.response.getCall(0), null);
        });

        it('should include api key parameter in query parameters', function() {
            var request = testrun.request.getCall(0).args[3].toJSON(),
                response = JSON.parse(testrun.response.getCall(0).args[2].stream.toString());

            expect(request.url.query).to.deep.include({key: 'X-API-KEY', value: api_key, system: true});
            expect(response.args).to.have.property('X-API-KEY', api_key);
        });
    });

    describe('with multiple keys in query', function() {
        before(function (done) {
            this.run({
                collection: {
                    item: {
                        request: {
                            auth: {
                                type: 'apikey',
                                apikey: [{
                                    key: 'X-API-KEY',
                                    value: api_key
                                },
                                {
                                    key: 'X-SECRET-KEY',
                                    value: secret_api_key
                                },
                                {
                                    key: 'in',
                                    value: 'query'
                                }]
                            },
                            url: url,
                            method: 'GET'
                        }
                    }
                }
            }, function(err, results) {
                testrun = results;
                done(err);
            });
        });

        it('should have completed the run', function() {
            expect(testrun).to.be.ok;
            sinon.assert.calledOnce(testrun.start);
            sinon.assert.calledOnce(testrun.done);
            sinon.assert.calledWith(testrun.done.getCall(0), null);

            sinon.assert.calledOnce(testrun.request);
            sinon.assert.calledWith(testrun.request.getCall(0), null);

            sinon.assert.calledOnce(testrun.response);
            sinon.assert.calledWith(testrun.response.getCall(0), null);
        });

        it('should include api key parameters in query parameters', function() {
            var request = testrun.request.getCall(0).args[3].toJSON(),
                response = JSON.parse(testrun.response.getCall(0).args[2].stream.toString());

            expect(request.url.query).to.deep.include({key: 'X-API-KEY', value: api_key, system: true});
            expect(request.url.query).to.deep.include({key: 'X-SECRET-KEY', value: secret_api_key, system: true});

            expect(response.args).to.have.property('X-API-KEY', api_key);
            expect(response.args).to.have.property('X-SECRET-KEY', secret_api_key);
        });
    });
});
