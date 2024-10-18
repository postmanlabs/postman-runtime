var expect = require('chai').expect;

describe('vaultSecrets', function () {
    describe('resolution', function () {
        describe('should correctly resolve secrets', function () {
            var testrun;

            before(function (done) {
                this.run({
                    vaultSecrets: {
                        id: 'vault',
                        values: [{
                            key: 'vault:var1',
                            value: 'https://postman-echo.com'
                        }, {
                            key: 'vault:var2',
                            value: 'postman'
                        }, {
                            key: 'vault:var3',
                            value: 'password'
                        }]
                    },
                    collection: {
                        item: {
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

        describe('should resolve env variable in url and use that for resolving further variables', function () {
            var testrun;

            before(function (done) {
                this.run({
                    environment: {
                        values: [
                            {
                                key: 'url',
                                value: 'https://postman-echo.com'
                            }
                        ]
                    },
                    vaultSecrets: {
                        id: 'vault',
                        prefix: 'vault:',
                        values: [
                            {
                                key: 'vault:var1',
                                value: 'https://postman-echo.com'
                            },
                            {
                                key: 'vault:var2',
                                value: 'postman',
                                _domains: ['https://postman-echo.com']
                            },
                            {
                                key: 'vault:var3',
                                value: 'password'
                            }
                        ]
                    },
                    collection: {
                        item: {
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

        describe('should resolve for multiple requests in a collection', function () {
            var testrun;

            before(function (done) {
                this.run({
                    vaultSecrets: {
                        id: 'vault',
                        prefix: 'vault:',
                        values: [
                            {
                                key: 'vault:var1',
                                value: 'https://postman-echo.com'
                            },
                            {
                                key: 'vault:var2',
                                value: 'postman',
                                _domains: [
                                    'https://postman.com', 'https://getpostman.com', 'https://*.postman-echo.com'
                                ]
                            },
                            {
                                key: 'vault:var3',
                                value: 'password'
                            }
                        ]
                    },
                    collection: {
                        item: [
                            {
                                request: {
                                    url: 'https://postman-echo.com/basic-auth',
                                    method: 'GET',
                                    auth: {
                                        type: 'basic',
                                        basic: [
                                            { key: 'username', value: '{{vault:var2}}' },
                                            { key: 'password', value: '{{vault:var3}}' }
                                        ]
                                    }
                                }
                            }, {
                                request: {
                                    url: 'https://postman-echo.com/get?var3={{vault:var3}}',
                                    method: 'GET'
                                }
                            }
                        ]
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

            it('should be resolved in request URL for first request', function () {
                var url = testrun.request.getCall(0).args[3].url.toString(),
                    response = testrun.response.getCall(0).args[2];

                expect(url).to.equal('https://postman-echo.com/basic-auth');
                expect(response).to.have.property('code', 200);
            });

            it('should be resolved in request auth for first request', function () {
                var request = testrun.response.getCall(0).args[3],
                    response = testrun.response.getCall(0).args[2],
                    auth = request.auth.parameters().toObject();

                expect(auth).to.deep.include({
                    username: 'postman',
                    password: 'password'
                });
                expect(response).to.have.property('code', 200);
            });

            it('should be resolved in request URL for second request', function () {
                var url = testrun.request.getCall(1).args[3].url.toString(),
                    response = testrun.response.getCall(1).args[2];

                expect(url).to.equal('https://postman-echo.com/get?var3=password');
                expect(response).to.have.property('code', 200);
            });
        });
    });

    describe('domains', function () {
        describe('should resolve secrets containing domains with protocol', function () {
            var testrun;

            before(function (done) {
                this.run({
                    vaultSecrets: {
                        id: 'vault',
                        prefix: 'vault:',
                        values: [
                            {
                                key: 'vault:var1',
                                value: 'https://postman-echo.com'
                            },
                            {
                                key: 'vault:var2',
                                value: 'postman',
                                _domains: ['postman-echo.com']
                            },
                            {
                                key: 'vault:var3',
                                value: 'password'
                            }
                        ]
                    },
                    collection: {
                        item: {
                            request: {
                                url: 'https://postman-echo.com/basic-auth',
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
                        id: 'vault',
                        prefix: 'vault:',
                        values: [
                            {
                                key: 'vault:var1',
                                value: 'https://postman-echo.com'
                            },
                            {
                                key: 'vault:var2',
                                value: 'postman',
                                _domains: ['https://postman.com']
                            },
                            {
                                key: 'vault:var3',
                                value: 'password'
                            }
                        ]
                    },
                    collection: {
                        item: {
                            request: {
                                url: '{{vault:var1}}/get?var2={{vault:var2}}&var3={{vault:var3}}',
                                method: 'GET'
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

            it('should only resolve secrets with matching domain in request URL', function () {
                var url = testrun.request.getCall(0).args[3].url.toString(),
                    response = testrun.response.getCall(0).args[2];

                expect(url).to.equal('https://postman-echo.com/get?var2=%7B%7Bvault:var2%7D%7D&var3=password');
                expect(response).to.have.property('code', 200);
            });
        });

        describe('should correctly resolve secrets with * in domains', function () {
            var testrun;

            before(function (done) {
                this.run({
                    vaultSecrets: {
                        id: 'vault',
                        prefix: 'vault:',
                        values: [
                            {
                                key: 'vault:var1',
                                value: 'https://postman-echo.com'
                            },
                            {
                                key: 'vault:var2',
                                value: 'postman',
                                _domains: ['https://*.postman-echo.com']
                            },
                            {
                                key: 'vault:var3',
                                value: 'password'
                            }
                        ]
                    },
                    collection: {
                        item: {
                            request: {
                                url: 'https://www.postman-echo.com/basic-auth',
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

                expect(url).to.equal('https://www.postman-echo.com/basic-auth');
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

        describe('should correctly resolve secrets with variable in non domain matching part of url', function () {
            var testrun;

            before(function (done) {
                this.run({
                    vaultSecrets: {
                        id: 'vault',
                        prefix: 'vault:',
                        values: [
                            {
                                key: 'vault:var1',
                                value: 'https://postman-echo.com'
                            },
                            {
                                key: 'vault:var2',
                                value: 'postman',
                                _domains: ['https://*.postman-echo.com']
                            },
                            {
                                key: 'vault:var3',
                                value: 'password'
                            },
                            {
                                key: 'vault:pathVar',
                                value: 'basic-auth',
                                _domains: ['https://*.postman-echo.com']
                            }
                        ]
                    },
                    collection: {
                        item: {
                            request: {
                                url: 'https://www.postman-echo.com/{{vault:pathVar}}',
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

                expect(url).to.equal('https://www.postman-echo.com/basic-auth');
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

        describe('should resolve when domains contains multiple elements', function () {
            var testrun;

            before(function (done) {
                this.run({
                    vaultSecrets: {
                        id: 'vault',
                        prefix: 'vault:',
                        values: [
                            {
                                key: 'vault:var1',
                                value: 'https://postman-echo.com'
                            },
                            {
                                key: 'vault:var2',
                                value: 'postman',
                                _domains: [
                                    'https://postman.com', 'https://getpostman.com', 'https://*.postman-echo.com'
                                ]
                            },
                            {
                                key: 'vault:var3',
                                value: 'password'
                            }
                        ]
                    },
                    collection: {
                        item: {
                            request: {
                                url: 'https://postman-echo.com/basic-auth',
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

        describe('should resolve secrets when protocol is not part of url', function () {
            var testrun;

            before(function (done) {
                this.run({
                    vaultSecrets: {
                        id: 'vault',
                        prefix: 'vault:',
                        _allowScriptAccess: true,
                        values: [
                            {
                                key: 'vault:var1',
                                value: 'basic-auth',
                                _domains: ['http://postman-echo.com']
                            },
                            {
                                key: 'vault:var2',
                                value: 'postman',
                                _domains: ['http://postman-echo.com']
                            },
                            {
                                key: 'vault:var3',
                                value: 'password'
                            }
                        ]
                    },
                    collection: {
                        item: [{
                            event: [
                                {
                                    listen: 'prerequest',
                                    script: {
                                        exec: 'pm.vault.set(\'var4\', \'http://postman-echo.com\')'
                                    }
                                }
                            ],
                            request: {
                                url: 'postman-echo.com/{{vault:var1}}',
                                method: 'GET',
                                auth: {
                                    type: 'basic',
                                    basic: [
                                        { key: 'username', value: '{{vault:var2}}' },
                                        { key: 'password', value: '{{vault:var3}}' }
                                    ]
                                }
                            }
                        }, {
                            request: {
                                url: '{{vault:var4}}/basic-auth',
                                method: 'GET',
                                auth: {
                                    type: 'basic',
                                    basic: [
                                        { key: 'username', value: '{{vault:var2}}' },
                                        { key: 'password', value: '{{vault:var3}}' }
                                    ]
                                }
                            }
                        }]
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

            it('should handle protocol for a resolved domain', function () {
                var url = testrun.request.getCall(0).args[3].url.toString(),
                    response = testrun.response.getCall(0).args[2];

                expect(url).to.equal('http://postman-echo.com/basic-auth');
                expect(response).to.have.property('code', 200);
            });

            it('should handle protocol for a unresolved domain', function () {
                var url = testrun.request.getCall(1).args[3].url.toString(),
                    response = testrun.response.getCall(1).args[2];

                expect(url).to.equal('http://postman-echo.com/basic-auth');
                expect(response).to.have.property('code', 200);
            });
        });
    });

    describe('scripts', function () {
        describe('should be able to get vault secrets using pm.vault.get', function () {
            var testrun;

            before(function (done) {
                this.run({
                    vaultSecrets: {
                        id: 'vault',
                        prefix: 'vault:',
                        _allowScriptAccess: true,
                        values: [
                            {
                                key: 'vault:var1',
                                value: 'value1'
                            }
                        ]
                    },
                    collection: {
                        item: {
                            event: [{
                                listen: 'prerequest',
                                script: {
                                    exec: `
                                        const v = await pm.vault.get('var1');
                                        console.log(v);
                                    `
                                }
                            }],
                            request: 'https://postman-echo.com/get'
                        }
                    }
                }, function (err, results) {
                    testrun = results;
                    done(err);
                });
            });

            it('should have sent the request successfully', function () {
                expect(testrun).to.be.ok;
                expect(testrun).to.nested.include({
                    'request.calledOnce': true
                });

                expect(testrun.request.getCall(0).args[0]).to.be.null;
            });

            it('should get vault secret value correctly', function () {
                var prConsoleArgs = testrun.console.getCall(0).args.slice(2);

                expect(prConsoleArgs).to.deep.equal(['value1']);
            });
        });

        describe('should be able to set vault secrets using pm.vault.get', function () {
            var testrun;

            before(function (done) {
                this.run({
                    vaultSecrets: {
                        id: 'vault',
                        prefix: 'vault:',
                        _allowScriptAccess: true,
                        values: [
                            {
                                key: 'vault:var1',
                                value: 'value1'
                            }
                        ]
                    },
                    collection: {
                        item: {
                            event: [{
                                listen: 'prerequest',
                                script: {
                                    exec: `
                                        await pm.vault.set('var1', 'modified-value1');
                                    `
                                }
                            }],
                            request: 'https://postman-echo.com/get'
                        }
                    }
                }, function (err, results) {
                    testrun = results;
                    done(err);
                });
            });

            it('should have sent the request successfully', function () {
                expect(testrun).to.be.ok;
                expect(testrun).to.nested.include({
                    'request.calledOnce': true
                });

                expect(testrun.request.getCall(0).args[0]).to.be.null;
            });

            it('should have updated vault secrets', function () {
                var prerequest = testrun.script.firstCall.args[2];

                expect(prerequest.vaultSecrets.values.toJSON()).to.deep.equal([{
                    type: 'any', value: 'modified-value1', key: 'vault:var1'
                }]);
            });
        });

        describe('should be able to unset vault secrets using pm.vault.unset', function () {
            var testrun;

            before(function (done) {
                this.run({
                    vaultSecrets: {
                        id: 'vault',
                        prefix: 'vault:',
                        _allowScriptAccess: true,
                        values: [
                            {
                                key: 'vault:var1',
                                value: 'value1'
                            },
                            {
                                key: 'vault:var2',
                                value: 'value2'
                            }
                        ]
                    },
                    collection: {
                        item: {
                            event: [{
                                listen: 'prerequest',
                                script: {
                                    exec: `
                                        await pm.vault.unset('var2');
                                    `
                                }
                            }],
                            request: 'https://postman-echo.com/get'
                        }
                    }
                }, function (err, results) {
                    testrun = results;
                    done(err);
                });
            });

            it('should have sent the request successfully', function () {
                expect(testrun).to.be.ok;
                expect(testrun).to.nested.include({
                    'request.calledOnce': true
                });

                expect(testrun.request.getCall(0).args[0]).to.be.null;
            });

            it('should have updated vault secrets', function () {
                var prerequest = testrun.script.firstCall.args[2];

                expect(prerequest.vaultSecrets.values.toJSON()).to.deep.equal([{
                    type: 'any', value: 'value1', key: 'vault:var1'
                }]);
            });
        });

        describe('should be accessible in scripts using pm.vault without needing vault: prefix', function () {
            var testrun;

            before(function (done) {
                this.run({
                    vaultSecrets: {
                        id: 'vault',
                        prefix: 'vault:',
                        _allowScriptAccess: true,
                        values: [
                            {
                                key: 'vault:var1',
                                value: 'value1'
                            }
                        ]
                    },
                    collection: {
                        item: {
                            event: [{
                                listen: 'prerequest',
                                script: {
                                    exec: `
                                        const v = await pm.vault.get('var1');
                                        console.log(v);
                                    `
                                }
                            }, {
                                listen: 'test',
                                script: {
                                    exec: `
                                        await pm.vault.set('var1', 'modified-value1');
                                        const v = await pm.vault.get('var1');
                                        console.log(v);
                                    `
                                }
                            }],
                            request: 'https://postman-echo.com/get'
                        }
                    }
                }, function (err, results) {
                    testrun = results;
                    done(err);
                });
            });

            it('should have sent the request successfully', function () {
                expect(testrun).to.be.ok;
                expect(testrun).to.nested.include({
                    'request.calledOnce': true
                });

                expect(testrun.request.getCall(0).args[0]).to.be.null;
            });

            it('should have triggered the script event twice', function () {
                expect(testrun).to.nested.include({
                    'script.calledTwice': true
                });
            });

            it('should be resolved in test and prerequest scripts', function () {
                var testConsoleArgs = testrun.console.getCall(1).args.slice(2),
                    prConsoleArgs = testrun.console.getCall(0).args.slice(2);

                expect(prConsoleArgs).to.deep.equal(['value1']);
                expect(testConsoleArgs).to.deep.equal(['modified-value1']);
            });
        });

        describe('should fail if Vault support in scripts is disabled', function () {
            var testrun;

            before(function (done) {
                this.run({
                    vaultSecrets: {
                        id: 'vault',
                        prefix: 'vault:',
                        values: [
                            {
                                key: 'vault:var1',
                                value: 'value1'
                            }
                        ]
                    },
                    collection: {
                        item: {
                            event: [{
                                listen: 'prerequest',
                                script: {
                                    exec: `
                                        await pm.vault.get('var1');
                                    `
                                }
                            }],
                            request: 'https://postman-echo.com/get'
                        }
                    }
                }, function (err, results) {
                    testrun = results;
                    done(err);
                });
            });

            it('should have sent the request successfully', function () {
                expect(testrun).to.be.ok;
                expect(testrun).to.nested.include({
                    'request.calledOnce': true
                });
            });

            it('should have thrown an exception', function () {
                expect(testrun).to.nested.include({
                    'exception.calledOnce': true
                });

                expect(testrun.exception.firstCall.args[1]).to.have.property('message', 'Vault access denied');
            });

            it('should not contain vault secrets', function () {
                var prerequest = testrun.script.firstCall.args[2];

                expect(prerequest.vaultSecrets).to.deep.equal(undefined);
            });
        });

        describe('should handle _allowScriptAccess as a function', function () {
            var testrun;

            before(function (done) {
                this.run({
                    vaultSecrets: {
                        id: 'vault',
                        prefix: 'vault:',
                        _allowScriptAccess: function (itemId) {
                            return itemId === 'item1';
                        },
                        values: [
                            {
                                key: 'vault:var1',
                                value: 'value1'
                            }
                        ]
                    },
                    collection: {
                        item: [{
                            id: 'item1',
                            event: [{
                                listen: 'prerequest',
                                script: {
                                    exec: `
                                        const v = await pm.vault.get('var1');
                                        console.log(v);
                                    `
                                }
                            }],
                            request: 'https://postman-echo.com/get'
                        }, {
                            id: 'item2',
                            event: [{
                                listen: 'prerequest',
                                script: {
                                    exec: `
                                        try {
                                            const v = await pm.vault.get('var1');
                                            console.log(v);
                                        } catch (error) {
                                            console.error(error.message);
                                        }
                                    `
                                }
                            }],
                            request: 'https://postman-echo.com/get'
                        }]
                    }
                }, function (err, results) {
                    testrun = results;
                    done(err);
                });
            });

            it('should allow vault access for item1', function () {
                var prConsoleArgs = testrun.console.getCall(0).args.slice(2);

                expect(prConsoleArgs).to.deep.equal(['value1']);
            });

            it('should deny vault access for item2', function () {
                var prConsoleArgs = testrun.console.getCall(1).args.slice(2);

                expect(prConsoleArgs).to.deep.equal(['Vault access denied']);
            });
        });

        describe('should handle _allowScriptAccess as a boolean for backward compatibility', function () {
            var testrun;

            before(function (done) {
                this.run({
                    vaultSecrets: {
                        id: 'vault',
                        prefix: 'vault:',
                        _allowScriptAccess: true,
                        values: [
                            {
                                key: 'vault:var1',
                                value: 'value1'
                            }
                        ]
                    },
                    collection: {
                        item: {
                            event: [{
                                listen: 'prerequest',
                                script: {
                                    exec: `
                                        const v = await pm.vault.get('var1');
                                        console.log(v);
                                    `
                                }
                            }],
                            request: 'https://postman-echo.com/get'
                        }
                    }
                }, function (err, results) {
                    testrun = results;
                    done(err);
                });
            });

            it('should allow vault access when _allowScriptAccess is true', function () {
                var prConsoleArgs = testrun.console.getCall(0).args.slice(2);

                expect(prConsoleArgs).to.deep.equal(['value1']);
            });
        });

        describe('should handle _allowScriptAccess as undefined for backward compatibility', function () {
            var testrun;

            before(function (done) {
                this.run({
                    vaultSecrets: {
                        id: 'vault',
                        prefix: 'vault:',
                        values: [
                            {
                                key: 'vault:var1',
                                value: 'value1'
                            }
                        ]
                    },
                    collection: {
                        item: {
                            event: [{
                                listen: 'prerequest',
                                script: {
                                    exec: `
                                        try {
                                            const v = await pm.vault.get('var1');
                                            console.log('Vault value:', v);
                                        } catch (error) {
                                            console.error('Vault error:', error.message);
                                        }
                                    `
                                }
                            }],
                            request: 'https://postman-echo.com/get'
                        }
                    }
                }, function (err, results) {
                    testrun = results;
                    done(err);
                });
            });

            it('should deny vault access when _allowScriptAccess is undefined', function () {
                expect(testrun.console.called).to.be.true;

                var consoleArgs = testrun.console.getCall(0).args.slice(2);

                expect(consoleArgs[0]).to.equal('Vault error:');
                expect(consoleArgs[1]).to.equal('Vault access denied');
            });
        });
    });
});
