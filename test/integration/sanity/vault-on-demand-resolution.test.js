var expect = require('chai').expect;

describe('vault on-demand resolution', function () {
    describe('request resolution', function () {
        describe('should resolve secrets using resolver function', function () {
            var testrun,
                resolverCalls = [];

            before(function (done) {
                resolverCalls = [];

                this.run({
                    vaultSecrets: {
                        prefix: 'vault:',
                        resolver: function (context, callback) {
                            resolverCalls.push(context);

                            // simulate async resolution
                            setTimeout(function () {
                                callback(null, [
                                    { key: 'vault:var1', value: 'https://postman-echo.com' },
                                    { key: 'vault:var2', value: 'postman' },
                                    { key: 'vault:var3', value: 'password' }
                                ]);
                            }, 10);
                        },
                        allowScriptAccess: function () { return true; }
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

            it('should have called the resolver', function () {
                expect(resolverCalls.length).to.be.at.least(1);
                expect(resolverCalls[0]).to.have.property('keys');
                expect(resolverCalls[0]).to.have.property('source', 'request');
                expect(resolverCalls[0].keys).to.include.members(['var1', 'var2', 'var3']);
            });

            it('should resolve vault variables in URL', function () {
                var url = testrun.request.getCall(0).args[3].url.toString();

                expect(url).to.equal('https://postman-echo.com/basic-auth');
            });

            it('should resolve vault variables in auth', function () {
                var request = testrun.response.getCall(0).args[3],
                    auth = request.auth.parameters().toObject();

                expect(auth).to.deep.include({
                    username: 'postman',
                    password: 'password'
                });
            });
        });

        describe('should keep placeholder when resolver fails', function () {
            var testrun;

            before(function (done) {
                this.run({
                    vaultSecrets: {
                        prefix: 'vault:',
                        resolver: function (context, callback) {
                            callback(new Error('Vault service unavailable'));
                        }
                    },
                    collection: {
                        item: {
                            request: {
                                url: 'https://postman-echo.com/get?secret={{vault:secret_key}}',
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
            });

            it('should keep unresolved placeholder in URL', function () {
                var url = testrun.request.getCall(0).args[3].url.toString();

                // URL gets encoded, so check for the encoded version
                expect(url).to.include('%7B%7Bvault:secret_key%7D%7D');
            });
        });

        describe('should cache resolved secrets across requests', function () {
            var testrun,
                resolverCallCount = 0;

            before(function (done) {
                resolverCallCount = 0;

                this.run({
                    vaultSecrets: {
                        prefix: 'vault:',
                        resolver: function (context, callback) {
                            resolverCallCount++;
                            callback(null, [
                                { key: 'vault:base_url', value: 'https://postman-echo.com' }
                            ]);
                        }
                    },
                    collection: {
                        item: [
                            {
                                request: {
                                    url: '{{vault:base_url}}/get',
                                    method: 'GET'
                                }
                            },
                            {
                                request: {
                                    url: '{{vault:base_url}}/post',
                                    method: 'POST'
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
            });

            it('should resolve URLs for both requests', function () {
                var url1 = testrun.request.getCall(0).args[3].url.toString(),
                    url2 = testrun.request.getCall(1).args[3].url.toString();

                expect(url1).to.equal('https://postman-echo.com/get');
                expect(url2).to.equal('https://postman-echo.com/post');
            });

            it('should use cache for second request', function () {
                // resolver should only be called once, second request uses cache
                expect(resolverCallCount).to.equal(1);
            });
        });
    });

    describe('script resolution', function () {
        describe('should resolve secrets via pm.vault.get using resolver', function () {
            var testrun,
                resolverCalls = [];

            before(function (done) {
                resolverCalls = [];

                this.run({
                    vaultSecrets: {
                        prefix: 'vault:',
                        resolver: function (context, callback) {
                            resolverCalls.push(context);
                            callback(null, [
                                { key: 'vault:secret_value', value: 'resolved-from-vault' }
                            ]);
                        },
                        allowScriptAccess: function () { return true; }
                    },
                    collection: {
                        item: {
                            event: [{
                                listen: 'prerequest',
                                script: {
                                    exec: `
                                        const v = await pm.vault.get('secret_value');
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
            });

            it('should call resolver with script source', function () {
                var scriptCalls = resolverCalls.filter(function (c) { return c.source === 'script'; });

                expect(scriptCalls.length).to.be.at.least(1);
                expect(scriptCalls[0].keys).to.deep.equal(['secret_value']);
            });

            it('should get vault secret value correctly', function () {
                var consoleArgs = testrun.console.getCall(0).args.slice(2);

                expect(consoleArgs).to.deep.equal(['resolved-from-vault']);
            });
        });

        describe('should deny access when allowScriptAccess returns false', function () {
            var testrun;

            before(function (done) {
                this.run({
                    vaultSecrets: {
                        prefix: 'vault:',
                        resolver: function (context, callback) {
                            callback(null, [
                                { key: 'vault:secret', value: 'secret-value' }
                            ]);
                        },
                        allowScriptAccess: function () { return false; }
                    },
                    collection: {
                        item: {
                            event: [{
                                listen: 'prerequest',
                                script: {
                                    exec: `
                                        try {
                                            await pm.vault.get('secret');
                                        } catch (e) {
                                            console.error(e.message);
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

            it('should have completed the run', function () {
                expect(testrun).to.be.ok;
                expect(testrun.done.getCall(0).args[0]).to.be.null;
            });

            it('should log vault access denied error', function () {
                var consoleArgs = testrun.console.getCall(0).args.slice(2);

                expect(consoleArgs[0]).to.equal('Vault access denied');
            });
        });

        describe('should allow pm.vault.set and pm.vault.get together', function () {
            var testrun;

            before(function (done) {
                this.run({
                    vaultSecrets: {
                        prefix: 'vault:',
                        resolver: function (context, callback) {
                            callback(null, []);
                        },
                        allowScriptAccess: function () { return true; }
                    },
                    collection: {
                        item: {
                            event: [{
                                listen: 'prerequest',
                                script: {
                                    exec: `
                                        await pm.vault.set('dynamic_key', 'dynamic_value');
                                        const v = await pm.vault.get('dynamic_key');
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

            it('should have completed the run', function () {
                expect(testrun).to.be.ok;
                expect(testrun.done.getCall(0).args[0]).to.be.null;
            });

            it('should get the value that was set', function () {
                var consoleArgs = testrun.console.getCall(0).args.slice(2);

                expect(consoleArgs).to.deep.equal(['dynamic_value']);
            });
        });

        describe('should allow pm.vault.unset', function () {
            var testrun,
                resolverCallCount = 0;

            before(function (done) {
                resolverCallCount = 0;

                this.run({
                    vaultSecrets: {
                        prefix: 'vault:',
                        resolver: function (context, callback) {
                            resolverCallCount++;

                            // only return value on first call
                            if (resolverCallCount === 1) {
                                return callback(null, [
                                    { key: 'vault:to_remove', value: 'initial_value' }
                                ]);
                            }

                            return callback(null, []);
                        },
                        allowScriptAccess: function () { return true; }
                    },
                    collection: {
                        item: {
                            event: [{
                                listen: 'prerequest',
                                script: {
                                    exec: `
                                        const before = await pm.vault.get('to_remove');
                                        console.log('before:', before);
                                        await pm.vault.unset('to_remove');
                                        const after = await pm.vault.get('to_remove');
                                        console.log('after:', after);
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

            it('should have completed the run', function () {
                expect(testrun).to.be.ok;
                expect(testrun.done.getCall(0).args[0]).to.be.null;
            });

            it('should have value before unset', function () {
                var consoleArgs = testrun.console.getCall(0).args.slice(2);

                expect(consoleArgs).to.deep.equal(['before:', 'initial_value']);
            });

            it('should not have value after unset', function () {
                var consoleArgs = testrun.console.getCall(1).args.slice(2);

                // resolver returns empty array, so value is undefined/null
                expect(consoleArgs[0]).to.equal('after:');
                expect(consoleArgs[1]).to.be.oneOf([undefined, null]);
            });
        });
    });

    describe('resolver context', function () {
        describe('should provide URL context to resolver', function () {
            var testrun,
                resolverContext;

            before(function (done) {
                resolverContext = null;

                this.run({
                    environment: {
                        values: [
                            { key: 'host', value: 'postman-echo.com' }
                        ]
                    },
                    vaultSecrets: {
                        prefix: 'vault:',
                        resolver: function (context, callback) {
                            resolverContext = context;
                            callback(null, [
                                { key: 'vault:api_key', value: 'test-api-key' }
                            ]);
                        }
                    },
                    collection: {
                        item: {
                            request: {
                                url: 'https://{{host}}/get?key={{vault:api_key}}',
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
            });

            it('should provide resolved URL in context', function () {
                // URL should have environment variables resolved but not vault variables
                expect(resolverContext.url).to.equal('https://postman-echo.com/get?key={{vault:api_key}}');
            });

            it('should provide keys array', function () {
                expect(resolverContext.keys).to.deep.equal(['api_key']);
            });

            it('should provide source as request', function () {
                expect(resolverContext.source).to.equal('request');
            });
        });
    });

    describe('without resolver', function () {
        describe('should work without resolver and not resolve vault variables', function () {
            var testrun;

            before(function (done) {
                this.run({
                    vaultSecrets: {
                        prefix: 'vault:'
                    },
                    collection: {
                        item: {
                            request: {
                                url: 'https://postman-echo.com/get?secret={{vault:missing}}',
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
            });

            it('should keep vault placeholder unresolved', function () {
                var url = testrun.request.getCall(0).args[3].url.toString();

                // URL gets encoded, so check for the encoded version
                expect(url).to.include('%7B%7Bvault:missing%7D%7D');
            });
        });
    });
});

