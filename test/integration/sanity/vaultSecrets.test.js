var expect = require('chai').expect;

describe('vaultSecrets', function () {
    describe('should correctly resolve secrets', function () {
        var testrun;

        before(function (done) {
            this.run({
                vaultSecrets: {
                    values: [
                        {
                            key: 'vault:var1',
                            type: 'secret',
                            value: 'https://postman-echo.com',
                            enabled: true,
                            _domains: []
                        },
                        {
                            key: 'vault:var2',
                            type: 'secret',
                            value: 'postman',
                            enabled: true,
                            _domains: ['https://postman-echo.com']
                        },
                        { key: 'vault:var3', type: 'vault', value: 'password', enabled: true }
                    ]
                },
                collection: {
                    item: {
                        name: 'Vault Secrets Test Request',
                        request: {
                            url: '{{vault:var1}}/basic-auth',
                            method: 'GET',
                            auth: {
                                type: 'basic',
                                basic: [
                                    { key: 'username', value: '{{vault:var2}}' },
                                    { key: 'password', value: '{{vault:var3}}' }
                                ]
                            }
                        }
                    }
                }
            }, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        it('should have completed the run', function () {
            expect(testrun).to.be.ok;
            expect(testrun.done.getCall(0).args[0]).to.be.null;
            expect(testrun).to.nested.include({
                'done.calledOnce': true,
                'start.calledOnce': true
            });
        });

        it('should be resolved in request URL', function () {
            var url = testrun.request.getCall(0).args[3].url.toString(),
                response = testrun.response.getCall(0).args[2];

            expect(url).to.equal('https://postman-echo.com/basic-auth');
            expect(response).to.have.property('code', 200);
        });

        it('should be resolved in request auth', function () {
            var request = testrun.response.getCall(0).args[3],
                response = testrun.response.getCall(0).args[2],
                auth = request.auth.parameters().toObject();

            expect(auth).to.deep.include({
                username: 'postman',
                password: 'password'
            });
            expect(response).to.have.property('code', 200);
        });
    });

    describe('should not resolve secrets with invalid domain', function () {
        var testrun;

        before(function (done) {
            this.run({
                vaultSecrets: {
                    values: [
                        {
                            key: 'vault:var1',
                            type: 'vault',
                            value: 'https://postman-echo.com',
                            enabled: true,
                            _domains: []
                        },
                        {
                            key: 'vault:var2',
                            type: 'vault',
                            value: 'postman',
                            enabled: true,
                            _domains: ['https://postman.com']
                        },
                        { key: 'vault:var3', type: 'vault', value: 'password', enabled: true }
                    ]
                },
                collection: {
                    item: {
                        name: 'Vault Secrets Test Request',
                        request: {
                            url: '{{vault:var1}}/basic-auth',
                            method: 'GET',
                            auth: {
                                type: 'basic',
                                basic: [
                                    { key: 'username', value: '{{vault:var2}}' },
                                    { key: 'password', value: '{{vault:var3}}' }
                                ]
                            }
                        }
                    }
                }
            }, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        it('should have completed the run', function () {
            expect(testrun).to.be.ok;
            expect(testrun.done.getCall(0).args[0]).to.be.null;
            expect(testrun).to.nested.include({
                'done.calledOnce': true,
                'start.calledOnce': true
            });
        });

        it('should be resolved in request URL', function () {
            var url = testrun.request.getCall(0).args[3].url.toString(),
                response = testrun.response.getCall(0).args[2];

            expect(url).to.equal('https://postman-echo.com/basic-auth');
            expect(response).to.have.property('code', 401);
        });

        it('should be resolved in request auth', function () {
            var request = testrun.response.getCall(0).args[3],
                response = testrun.response.getCall(0).args[2],
                auth = request.auth.parameters().toObject();

            expect(auth).to.deep.include({
                username: '{{vault:var2}}',
                password: 'password'
            });
            expect(response).to.have.property('code', 401);
        });
    });

    describe('should resolve env variable in url and use that for resolving further variables', function () {
        var testrun;

        before(function (done) {
            this.run({
                environment: {
                    values: [
                        {
                            key: 'url',
                            value: 'https://postman-echo.com',
                            enabled: true
                        }
                    ]
                },
                vaultSecrets: {
                    values: [
                        {
                            key: 'vault:var1',
                            type: 'secret',
                            value: 'https://postman-echo.com',
                            enabled: true,
                            _domains: []
                        },
                        {
                            key: 'vault:var2',
                            type: 'secret',
                            value: 'postman',
                            enabled: true,
                            _domains: ['https://postman-echo.com']
                        },
                        { key: 'vault:var3', type: 'vault', value: 'password', enabled: true }
                    ]
                },
                collection: {
                    item: {
                        name: 'Vault Secrets Test Request',
                        request: {
                            url: '{{url}}/basic-auth',
                            method: 'GET',
                            auth: {
                                type: 'basic',
                                basic: [
                                    { key: 'username', value: '{{vault:var2}}' },
                                    { key: 'password', value: '{{vault:var3}}' }
                                ]
                            }
                        }
                    }
                }
            }, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        it('should have completed the run', function () {
            expect(testrun).to.be.ok;
            expect(testrun.done.getCall(0).args[0]).to.be.null;
            expect(testrun).to.nested.include({
                'done.calledOnce': true,
                'start.calledOnce': true
            });
        });

        it('should be resolved in request URL', function () {
            var url = testrun.request.getCall(0).args[3].url.toString(),
                response = testrun.response.getCall(0).args[2];

            expect(url).to.equal('https://postman-echo.com/basic-auth');
            expect(response).to.have.property('code', 200);
        });

        it('should be resolved in request auth', function () {
            var request = testrun.response.getCall(0).args[3],
                response = testrun.response.getCall(0).args[2],
                auth = request.auth.parameters().toObject();

            expect(auth).to.deep.include({
                username: 'postman',
                password: 'password'
            });
            expect(response).to.have.property('code', 200);
        });
    });
});
