var expect = require('chai').expect,
    sinon = require('sinon');

describe('secret resolution', function () {
    describe('basic secret resolution with source', function () {
        var testrun;

        before(function (done) {
            this.run({
                collection: {
                    item: [{
                        request: {
                            // Use base URL - local http server doesn't have /get endpoint
                            url: global.servers.http + '?apiKey={{apiKey}}&normalVar={{normalVar}}'
                        }
                    }]
                },
                environment: {
                    values: [
                        {
                            key: 'apiKey',
                            value: 'placeholder-will-be-replaced',
                            type: 'secret',
                            source: {
                                type: 'mock-secret-manager',
                                secretId: 'my-api-key-secret'
                            }
                        },
                        {
                            key: 'normalVar',
                            value: 'normal-value'
                        }
                    ]
                },
                secretResolvers: {
                    'mock-secret-manager': {
                        id: 'mock-resolver-1',
                        name: 'Mock Secret Manager',
                        resolver: function (secret) {
                            // Return a Promise for async resolution
                            return new Promise(function (resolve) {
                                setTimeout(function () {
                                    if (secret.secretId === 'my-api-key-secret') {
                                        resolve('resolved-secret-value-123');
                                    }
                                    else {
                                        resolve(undefined);
                                    }
                                }, 10);
                            });
                        }
                    }
                }
            }, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        it('should complete the run', function () {
            expect(testrun).to.be.ok;
            sinon.assert.calledOnce(testrun.start);
            sinon.assert.calledOnce(testrun.done);
            sinon.assert.calledWith(testrun.done.getCall(0), null);
        });

        it('should resolve secret variable using secretResolvers', function () {
            var request = testrun.request.getCall(0).args[3];

            expect(request.url.toString()).to.include('apiKey=resolved-secret-value-123');
        });

        it('should also resolve normal variables', function () {
            var request = testrun.request.getCall(0).args[3];

            expect(request.url.toString()).to.include('normalVar=normal-value');
        });
    });

    describe('nested secret resolution is not supported', function () {
        var testrun;

        before(function (done) {
            this.run({
                collection: {
                    item: [{
                        request: {
                            // Use base URL - local http server doesn't have /get endpoint
                            url: global.servers.http + '?apiKey={{{{env}}_apiKey}}&normalVar={{normalVar}}'
                        }
                    }]
                },
                environment: {
                    values: [
                        {
                            key: 'prod_apiKey',
                            value: 'placeholder-will-be-replaced',
                            type: 'secret',
                            source: {
                                type: 'mock-secret-manager',
                                secretId: 'my-api-key-secret'
                            }
                        },
                        {
                            key: 'env',
                            value: 'prod'
                        },
                        {
                            key: 'normalVar',
                            value: 'normal-value'
                        }
                    ]
                },
                secretResolvers: {
                    'mock-secret-manager': {
                        id: 'mock-resolver-1',
                        name: 'Mock Secret Manager',
                        resolver: function (secret) {
                            return new Promise(function (resolve) {
                                setTimeout(function () {
                                    if (secret.secretId === 'my-api-key-secret') {
                                        resolve('resolved-secret-value-123');
                                    }
                                    else {
                                        resolve(undefined);
                                    }
                                }, 10);
                            });
                        }
                    }
                }
            }, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        it('should complete the run', function () {
            expect(testrun).to.be.ok;
            sinon.assert.calledOnce(testrun.start);
            sinon.assert.calledOnce(testrun.done);
            sinon.assert.calledWith(testrun.done.getCall(0), null);
        });

        it('should NOT resolve nested secret variable (placeholder remains)', function () {
            var request = testrun.request.getCall(0).args[3];

            // Nested variables like {{{{env}}_apiKey}} are not supported
            // The placeholder value should remain
            expect(request.url.toString()).to.include('apiKey=placeholder-will-be-replaced');
        });

        it('should still resolve normal variables', function () {
            var request = testrun.request.getCall(0).args[3];

            expect(request.url.toString()).to.include('normalVar=normal-value');
        });
    });

    describe('secret resolution with Promise-based resolver', function () {
        var testrun;

        before(function (done) {
            this.run({
                collection: {
                    item: [{
                        request: {
                            url: global.servers.http + '?secret={{mySecret}}'
                        }
                    }]
                },
                environment: {
                    values: [
                        {
                            key: 'mySecret',
                            value: '',
                            type: 'secret',
                            source: {
                                type: 'vault',
                                path: '/secret/data/myapp'
                            }
                        }
                    ]
                },
                secretResolvers: {
                    vault: {
                        id: 'vault-resolver',
                        name: 'Vault Resolver',
                        resolver: function () {
                            // Return a Promise
                            return new Promise(function (resolve) {
                                setTimeout(function () {
                                    resolve('promise-resolved-secret');
                                }, 10);
                            });
                        }
                    }
                }
            }, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        it('should complete the run', function () {
            expect(testrun).to.be.ok;
            sinon.assert.calledOnce(testrun.done);
        });

        it('should resolve secret using Promise-based resolver', function () {
            var request = testrun.request.getCall(0).args[3];

            expect(request.url.toString()).to.include('secret=promise-resolved-secret');
        });
    });

    describe('secret resolution failure handling', function () {
        var testrun;

        before(function (done) {
            this.run({
                collection: {
                    item: [{
                        request: {
                            url: global.servers.http + '?secret={{failingSecret}}'
                        }
                    }]
                },
                environment: {
                    values: [
                        {
                            key: 'failingSecret',
                            value: 'fallback-value',
                            type: 'secret',
                            source: {
                                type: 'failing-source',
                                secretId: 'will-fail'
                            }
                        }
                    ]
                },
                secretResolvers: {
                    'failing-source': {
                        id: 'failing-resolver',
                        name: 'Failing Resolver',
                        resolver: function () {
                            // Simulate a failed resolution
                            return new Promise(function (resolve, reject) {
                                setTimeout(function () {
                                    reject(new Error('Failed to fetch secret'));
                                }, 10);
                            });
                        }
                    }
                }
            }, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        it('should complete the run (failure is item-level, not run-level)', function () {
            expect(testrun).to.be.ok;
            sinon.assert.calledOnce(testrun.done);
            sinon.assert.calledWith(testrun.done.getCall(0), null);
        });

        it('should emit error via item trigger on resolution failure', function () {
            sinon.assert.calledOnce(testrun.item);

            var err = testrun.item.getCall(0).args[0];

            expect(err).to.be.an('error');
            expect(err.message).to.include('Failed to resolve secret');
            expect(err.code).to.equal('SECRET_RESOLUTION_FAILED');
        });

        it('should include isSecretResolutionFailed flag in item trigger', function () {
            var options = testrun.item.getCall(0).args[4];

            expect(options).to.have.property('isSecretResolutionFailed', true);
        });

        it('should NOT make the HTTP request when secret resolution fails', function () {
            sinon.assert.notCalled(testrun.request);
        });
    });

    describe('multiple secrets resolution', function () {
        var testrun,
            resolverCallCount = 0;

        before(function (done) {
            resolverCallCount = 0;

            this.run({
                collection: {
                    item: [{
                        request: {
                            url: global.servers.http + '?key1={{secret1}}&key2={{secret2}}&key3={{secret3}}'
                        }
                    }]
                },
                environment: {
                    values: [
                        {
                            key: 'secret1',
                            value: '',
                            type: 'secret',
                            source: { type: 'mock', id: '1' }
                        },
                        {
                            key: 'secret2',
                            value: '',
                            type: 'secret',
                            source: { type: 'mock', id: '2' }
                        },
                        {
                            key: 'secret3',
                            value: '',
                            type: 'secret',
                            source: { type: 'mock', id: '3' }
                        }
                    ]
                },
                secretResolvers: {
                    mock: {
                        id: 'mock-resolver',
                        name: 'Mock Resolver',
                        resolver: function (secret) {
                            resolverCallCount++;

                            return new Promise(function (resolve) {
                                setTimeout(function () {
                                    resolve('secret-value-' + secret.id);
                                }, 10);
                            });
                        }
                    }
                }
            }, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        it('should complete the run', function () {
            expect(testrun).to.be.ok;
            sinon.assert.calledOnce(testrun.done);
        });

        it('should resolve all secrets', function () {
            var request = testrun.request.getCall(0).args[3];

            expect(request.url.toString()).to.include('key1=secret-value-1');
            expect(request.url.toString()).to.include('key2=secret-value-2');
            expect(request.url.toString()).to.include('key3=secret-value-3');
        });

        it('should call resolver for each secret', function () {
            expect(resolverCallCount).to.equal(3);
        });
    });

    describe('only resolves secrets used in request', function () {
        var testrun,
            resolverSpy;

        before(function (done) {
            resolverSpy = sinon.spy(function (secret) {
                return new Promise(function (resolve) {
                    setTimeout(function () {
                        resolve('resolved-' + secret.id);
                    }, 10);
                });
            });

            this.run({
                collection: {
                    item: [{
                        request: {
                            // Only uses secret1 - secret2 and secret3 are NOT used
                            url: global.servers.http + '?key1={{secret1}}'
                        }
                    }]
                },
                environment: {
                    values: [
                        {
                            key: 'secret1',
                            value: '',
                            type: 'secret',
                            source: { type: 'mock', id: '1' }
                        },
                        {
                            key: 'secret2',
                            value: '',
                            type: 'secret',
                            source: { type: 'mock', id: '2' }
                        },
                        {
                            key: 'secret3',
                            value: '',
                            type: 'secret',
                            source: { type: 'mock', id: '3' }
                        }
                    ]
                },
                secretResolvers: {
                    mock: {
                        id: 'mock-resolver',
                        name: 'Mock Resolver',
                        resolver: resolverSpy
                    }
                }
            }, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        it('should complete the run', function () {
            expect(testrun).to.be.ok;
            sinon.assert.calledOnce(testrun.done);
        });

        it('should only call resolver for used secrets', function () {
            // Only secret1 is used in the request, so resolver should be called once
            sinon.assert.calledOnce(resolverSpy);
        });

        it('should resolve only the used secret with correct source', function () {
            var secretArg = resolverSpy.getCall(0).args[0];

            expect(secretArg.id).to.equal('1');
        });

        it('should resolve the used secret correctly', function () {
            var request = testrun.request.getCall(0).args[3];

            expect(request.url.toString()).to.include('key1=resolved-1');
        });
    });

    describe('no secretResolvers provided', function () {
        var testrun;

        before(function (done) {
            this.run({
                collection: {
                    item: [{
                        request: {
                            url: global.servers.http + '?secret={{secretVar}}'
                        }
                    }]
                },
                environment: {
                    values: [
                        {
                            key: 'secretVar',
                            value: 'original-value',
                            type: 'secret',
                            source: {
                                type: 'some-source',
                                secretId: 'some-secret'
                            }
                        }
                    ]
                }
                // Note: No secretResolvers provided
            }, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        it('should complete the run', function () {
            expect(testrun).to.be.ok;
            sinon.assert.calledOnce(testrun.done);
        });

        it('should use original value when no resolver is provided', function () {
            var request = testrun.request.getCall(0).args[3];

            expect(request.url.toString()).to.include('secret=original-value');
        });
    });

    describe('secrets in request body and headers', function () {
        var testrun;

        before(function (done) {
            this.run({
                collection: {
                    item: [{
                        request: {
                            url: global.servers.http,
                            method: 'POST',
                            header: [
                                {
                                    key: 'Authorization',
                                    value: 'Bearer {{authToken}}'
                                }
                            ],
                            body: {
                                mode: 'raw',
                                raw: '{"apiKey": "{{apiKey}}"}'
                            }
                        }
                    }]
                },
                environment: {
                    values: [
                        {
                            key: 'authToken',
                            value: '',
                            type: 'secret',
                            source: { type: 'mock', secretType: 'auth-token' }
                        },
                        {
                            key: 'apiKey',
                            value: '',
                            type: 'secret',
                            source: { type: 'mock', secretType: 'api-key' }
                        }
                    ]
                },
                secretResolvers: {
                    mock: {
                        id: 'mock-resolver',
                        name: 'Mock Resolver',
                        resolver: function (secret) {
                            return new Promise(function (resolve) {
                                setTimeout(function () {
                                    if (secret.secretType === 'auth-token') {
                                        resolve('resolved-auth-token-xyz');
                                    }
                                    else if (secret.secretType === 'api-key') {
                                        resolve('resolved-api-key-abc');
                                    }
                                    else {
                                        resolve(undefined);
                                    }
                                }, 10);
                            });
                        }
                    }
                }
            }, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        it('should complete the run', function () {
            expect(testrun).to.be.ok;
            sinon.assert.calledOnce(testrun.done);
        });

        it('should resolve secret in header', function () {
            var request = testrun.request.getCall(0).args[3];

            expect(request.headers.get('Authorization')).to.equal('Bearer resolved-auth-token-xyz');
        });

        it('should resolve secret in body', function () {
            var request = testrun.request.getCall(0).args[3];

            expect(request.body.raw).to.include('resolved-api-key-abc');
        });
    });

    describe('timeout handling', function () {
        var testrun;

        before(function (done) {
            this.run({
                collection: {
                    item: [{
                        request: {
                            url: global.servers.http + '?secret={{slowSecret}}'
                        }
                    }]
                },
                environment: {
                    values: [
                        {
                            key: 'slowSecret',
                            value: 'fallback-value',
                            type: 'secret',
                            source: {
                                type: 'slow-source',
                                secretId: 'slow-secret'
                            }
                        }
                    ]
                },
                secretResolvers: {
                    'slow-source': {
                        id: 'slow-resolver',
                        name: 'Slow Resolver',
                        timeout: 50, // 50ms timeout
                        resolver: function () {
                            // This resolver takes longer than the timeout
                            return new Promise(function (resolve) {
                                setTimeout(function () {
                                    resolve('should-not-resolve');
                                }, 200); // 200ms - longer than timeout
                            });
                        }
                    }
                }
            }, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        it('should complete the run (timeout is item-level failure)', function () {
            expect(testrun).to.be.ok;
            sinon.assert.calledOnce(testrun.done);
            sinon.assert.calledWith(testrun.done.getCall(0), null);
        });

        it('should emit timeout error via item trigger', function () {
            sinon.assert.calledOnce(testrun.item);

            var err = testrun.item.getCall(0).args[0];

            expect(err).to.be.an('error');
            expect(err.message).to.include('timed out');
            expect(err.code).to.equal('SECRET_RESOLUTION_TIMEOUT');
        });

        it('should include isSecretResolutionFailed flag on timeout', function () {
            var options = testrun.item.getCall(0).args[4];

            expect(options).to.have.property('isSecretResolutionFailed', true);
        });

        it('should NOT make the HTTP request when timeout occurs', function () {
            sinon.assert.notCalled(testrun.request);
        });
    });

    describe('retry on failure', function () {
        var testrun,
            attemptCount = 0;

        before(function (done) {
            attemptCount = 0;

            this.run({
                collection: {
                    item: [{
                        request: {
                            url: global.servers.http + '?secret={{retrySecret}}'
                        }
                    }]
                },
                environment: {
                    values: [
                        {
                            key: 'retrySecret',
                            value: '',
                            type: 'secret',
                            source: {
                                type: 'retry-source',
                                secretId: 'retry-secret'
                            }
                        }
                    ]
                },
                secretResolvers: {
                    'retry-source': {
                        id: 'retry-resolver',
                        name: 'Retry Resolver',
                        retryCount: 2, // Retry up to 2 times
                        resolver: function () {
                            attemptCount++;

                            // Fail on first 2 attempts, succeed on 3rd
                            if (attemptCount < 3) {
                                return Promise.reject(new Error('Temporary failure'));
                            }

                            return Promise.resolve('success-after-retry');
                        }
                    }
                }
            }, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        it('should complete the run', function () {
            expect(testrun).to.be.ok;
            sinon.assert.calledOnce(testrun.done);
        });

        it('should retry the specified number of times', function () {
            // Initial attempt + 2 retries = 3 total attempts
            expect(attemptCount).to.equal(3);
        });

        it('should resolve after successful retry', function () {
            var request = testrun.request.getCall(0).args[3];

            expect(request.url.toString()).to.include('secret=success-after-retry');
        });
    });

    describe('no matching resolver for source type', function () {
        var testrun;

        before(function (done) {
            this.run({
                collection: {
                    item: [{
                        request: {
                            url: global.servers.http + '?secret={{unmatchedSecret}}'
                        }
                    }]
                },
                environment: {
                    values: [
                        {
                            key: 'unmatchedSecret',
                            value: 'placeholder-value',
                            type: 'secret',
                            source: {
                                type: 'unknown-source-type',
                                secretId: 'some-secret'
                            }
                        }
                    ]
                },
                secretResolvers: {
                    // Only have resolver for 'mock' type, not 'unknown-source-type'
                    mock: {
                        id: 'mock-resolver',
                        name: 'Mock Resolver',
                        resolver: function () {
                            return Promise.resolve('should-not-be-called');
                        }
                    }
                }
            }, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        it('should complete the run', function () {
            expect(testrun).to.be.ok;
            sinon.assert.calledOnce(testrun.done);
        });

        it('should keep placeholder value when no matching resolver', function () {
            var request = testrun.request.getCall(0).args[3];

            expect(request.url.toString()).to.include('secret=placeholder-value');
        });
    });
});
