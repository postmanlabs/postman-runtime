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
                            secret: true,
                            source: {
                                provider: 'postman',
                                postman: { type: 'local', secretId: 'my-api-key-secret' }
                            }
                        },
                        {
                            key: 'normalVar',
                            value: 'normal-value'
                        }
                    ]
                },
                secretResolver: function ({ secrets }, callback) {
                    var result = secrets.map(function (s) {
                        return {
                            resolvedValue: s.variable.key === 'apiKey' ? 'resolved-secret-value-123' : undefined
                        };
                    });

                    callback(null, result);
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

        it('should resolve secret variable using secretResolver', function () {
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
                            secret: true,
                            source: {
                                provider: 'postman',
                                postman: { type: 'local', secretId: 'my-api-key-secret' }
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
                secretResolver: function ({ secrets }, callback) {
                    // Nested vars not in secrets or keep placeholder
                    var result = secrets.map(function () { return { resolvedValue: undefined }; });

                    callback(null, result);
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
                            secret: true,
                            source: {
                                provider: 'hashicorp',
                                hashicorp: {
                                    engine: 'secret',
                                    path: '/secret/data/myapp',
                                    key: 'value'
                                }
                            }
                        }
                    ]
                },
                secretResolver: function ({ secrets }, callback) {
                    if (secrets.length === 0) {
                        return callback(null, []);
                    }

                    Promise.resolve('promise-resolved-secret')
                        .then(function (v) {
                            callback(null, [{ resolvedValue: v }]);
                        })
                        .catch(callback);
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
                            secret: true,
                            source: {
                                provider: 'postman',
                                postman: { type: 'local', secretId: 'will-fail' }
                            }
                        }
                    ]
                },
                secretResolver: function (input, callback) {
                    callback(new Error('Failed to fetch secret'));
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
            expect(err.message).to.include('Failed to fetch secret');
        });

        it('should include hasSecretResolutionFailed flag in item trigger', function () {
            var options = testrun.item.getCall(0).args[4];

            expect(options).to.have.property('hasSecretResolutionFailed', true);
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
                            secret: true,
                            source: { provider: 'postman', postman: { type: 'local', secretId: '1' } }
                        },
                        {
                            key: 'secret2',
                            value: '',
                            secret: true,
                            source: { provider: 'postman', postman: { type: 'local', secretId: '2' } }
                        },
                        {
                            key: 'secret3',
                            value: '',
                            secret: true,
                            source: { provider: 'postman', postman: { type: 'local', secretId: '3' } }
                        }
                    ]
                },
                secretResolver: function ({ secrets }, callback) {
                    var result = secrets.map(function (item) {
                        resolverCallCount++;

                        return {
                            resolvedValue: 'secret-value-' + item.variable.source.postman.secretId
                        };
                    });

                    callback(null, result);
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

    describe('resolves all secrets including those only referenced in scripts', function () {
        var testrun,
            resolverSpy;

        before(function (done) {
            resolverSpy = sinon.spy(function (secret) {
                return new Promise(function (resolve) {
                    setTimeout(function () {
                        resolve('resolved-' + secret.secretId);
                    }, 10);
                });
            });

            this.run({
                collection: {
                    item: [{
                        request: {
                            url: global.servers.http + '?key1={{secret1}}'
                        }
                    }]
                },
                environment: {
                    values: [
                        {
                            key: 'secret1',
                            value: '',
                            secret: true,
                            source: { provider: 'postman', postman: { type: 'local', secretId: '1' } }
                        },
                        {
                            key: 'secret2',
                            value: '',
                            secret: true,
                            source: { provider: 'postman', postman: { type: 'local', secretId: '2' } }
                        },
                        {
                            key: 'secret3',
                            value: '',
                            secret: true,
                            source: { provider: 'postman', postman: { type: 'local', secretId: '3' } }
                        }
                    ]
                },
                secretResolver: function ({ secrets }, callback) {
                    if (secrets.length === 0) {
                        return callback(null, []);
                    }

                    Promise.all(secrets.map(function (s) {
                        return resolverSpy(s.variable.source.postman);
                    }))
                        .then(function (values) {
                            callback(null, values.map(function (v) { return { resolvedValue: v }; }));
                        })
                        .catch(callback);
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

        it('should call resolver for all secrets', function () {
            // All secrets are resolved (including those only referenced in scripts)
            sinon.assert.calledThrice(resolverSpy);
        });

        it('should resolve all secrets with correct sources', function () {
            expect(resolverSpy.getCall(0).args[0].secretId).to.equal('1');
            expect(resolverSpy.getCall(1).args[0].secretId).to.equal('2');
            expect(resolverSpy.getCall(2).args[0].secretId).to.equal('3');
        });

        it('should resolve the used secret correctly', function () {
            var request = testrun.request.getCall(0).args[3];

            expect(request.url.toString()).to.include('key1=resolved-1');
        });
    });

    describe('no secretResolver provided', function () {
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
                            secret: true,
                            source: {
                                provider: 'postman',
                                postman: { type: 'local', secretId: 'some-secret' }
                            }
                        }
                    ]
                }
                // Note: No secretResolver provided
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
                            secret: true,
                            source: { provider: 'postman', postman: { type: 'local', secretId: 'auth-token-secret' } }
                        },
                        {
                            key: 'apiKey',
                            value: '',
                            secret: true,
                            source: { provider: 'postman', postman: { type: 'local', secretId: 'api-key-secret' } }
                        }
                    ]
                },
                secretResolver: function ({ secrets }, callback) {
                    var result = secrets.map(function (item) {
                        var secretId = item.variable.source.postman.secretId;

                        return {
                            resolvedValue: secretId === 'auth-token-secret' ? 'resolved-auth-token-xyz' :
                                secretId === 'api-key-secret' ? 'resolved-api-key-abc' : undefined
                        };
                    });

                    callback(null, result);
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
                            secret: true,
                            source: {
                                provider: 'postman',
                                postman: { type: 'local', secretId: 'slow-secret' }
                            }
                        }
                    ]
                },
                secretResolver: function (input, callback) {
                    var timeout = 50,
                        slowResolve = new Promise(function (resolve) {
                            setTimeout(function () {
                                resolve('should-not-resolve');
                            }, 200);
                        }),
                        timeoutReject = new Promise(function (_, reject) {
                            setTimeout(function () {
                                var err = new Error('Secret resolution timed out after ' + timeout + 'ms');

                                err.code = 'SECRET_RESOLUTION_TIMEOUT';
                                reject(err);
                            }, timeout);
                        });

                    Promise.race([slowResolve, timeoutReject])
                        .then(function () {
                            callback(null, []);
                        })
                        .catch(callback);
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

        it('should include hasSecretResolutionFailed flag on timeout', function () {
            var options = testrun.item.getCall(0).args[4];

            expect(options).to.have.property('hasSecretResolutionFailed', true);
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
                            secret: true,
                            source: {
                                provider: 'postman',
                                postman: { type: 'local', secretId: 'retry-secret' }
                            }
                        }
                    ]
                },
                secretResolver: function (input, callback) {
                    var maxAttempts = 3;

                    function attempt () {
                        attemptCount++;

                        if (attemptCount < maxAttempts) {
                            return Promise.reject(new Error('Temporary failure'));
                        }

                        return Promise.resolve('success-after-retry');
                    }

                    function retry (attemptsLeft) {
                        return attempt()
                            .then(function (value) {
                                callback(null, [{ resolvedValue: value }]);
                            })
                            .catch(function (err) {
                                if (attemptsLeft > 1) {
                                    return retry(attemptsLeft - 1);
                                }
                                callback(err);
                            });
                    }

                    retry(maxAttempts);
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
                            secret: true,
                            source: {
                                provider: 'azure',
                                azure: { secretId: 'some-secret' }
                            }
                        }
                    ]
                },
                secretResolver: function ({ secrets }, callback) {
                    // No resolver for azure; do not mutate
                    var result = secrets.map(function () { return { resolvedValue: undefined }; });

                    callback(null, result);
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

    describe('secretResolver receives resolved URL string', function () {
        var testrun,
            receivedUrlString;

        before(function (done) {
            this.run({
                collection: {
                    item: [{
                        request: {
                            url: global.servers.http +
                                '?tag={{tagName}}&apiKey={{apiKey}}'
                        }
                    }]
                },
                environment: {
                    values: [
                        {
                            key: 'tagName',
                            value: 'resolved-tag'
                        },
                        {
                            key: 'apiKey',
                            value: '',
                            secret: true,
                            source: {
                                provider: 'postman',
                                postman: {
                                    type: 'local',
                                    secretId: 'key-1'
                                }
                            }
                        }
                    ]
                },
                secretResolver: function ({ secrets, urlString }, callback) {
                    receivedUrlString = urlString;
                    callback(null, secrets.map(function () {
                        return { resolvedValue: 'resolved-key' };
                    }));
                }
            }, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        it('should complete the run', function () {
            expect(testrun).to.be.ok;
            sinon.assert.calledOnce(testrun.done);
            sinon.assert.calledWith(testrun.done.getCall(0), null);
        });

        it('should pass resolved URL (not template) to secretResolver', function () {
            expect(receivedUrlString).to.be.a('string');
            expect(receivedUrlString).to.not.include('{{tagName}}');
            expect(receivedUrlString).to.include('resolved-tag');
        });
    });

    describe('2nd secretResolver call after prerequest script changes URL', function () {
        var testrun,
            resolverCalls = [];

        before(function (done) {
            resolverCalls = [];

            this.run({
                collection: {
                    event: [{
                        listen: 'prerequest',
                        script: {
                            exec: [
                                'var url = pm.request.url.toString();',
                                'url = url.replace("original-host.com",' +
                                    ' "changed-host.com");',
                                'pm.request.url = url;'
                            ]
                        }
                    }],
                    item: [{
                        request: {
                            url: 'https://original-host.com/api' +
                                '?key={{apiKey}}'
                        }
                    }]
                },
                environment: {
                    values: [{
                        key: 'apiKey',
                        value: '',
                        secret: true,
                        source: {
                            provider: 'postman',
                            postman: {
                                type: 'local',
                                secretId: 'key-1'
                            }
                        }
                    }]
                },
                secretResolver: function ({ secrets, urlString }, callback) {
                    resolverCalls.push({ urlString });
                    callback(null, secrets.map(function () {
                        return { resolvedValue: 'resolved-key' };
                    }));
                }
            }, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        it('should complete the run', function () {
            expect(testrun).to.be.ok;
            sinon.assert.calledOnce(testrun.done);
            sinon.assert.calledWith(testrun.done.getCall(0), null);
        });

        it('should call secretResolver twice when URL changes', function () {
            expect(resolverCalls).to.have.lengthOf(2);
        });

        it('should pass original URL in 1st call', function () {
            expect(resolverCalls[0].urlString)
                .to.include('original-host.com');
        });

        it('should pass changed URL in 2nd call', function () {
            expect(resolverCalls[1].urlString)
                .to.include('changed-host.com');
        });
    });

    describe('2nd secretResolver call is skipped when URL does not change', function () {
        var testrun,
            resolverCallCount = 0;

        before(function (done) {
            resolverCallCount = 0;

            this.run({
                collection: {
                    event: [{
                        listen: 'prerequest',
                        script: {
                            exec: [
                                'pm.environment.set("marker", "done");'
                            ]
                        }
                    }],
                    item: [{
                        request: {
                            url: global.servers.http +
                                '?key={{apiKey}}'
                        }
                    }]
                },
                environment: {
                    values: [{
                        key: 'apiKey',
                        value: '',
                        secret: true,
                        source: {
                            provider: 'postman',
                            postman: {
                                type: 'local',
                                secretId: 'key-1'
                            }
                        }
                    }]
                },
                secretResolver: function ({ secrets }, callback) {
                    resolverCallCount++;
                    callback(null, secrets.map(function () {
                        return { resolvedValue: 'resolved-key' };
                    }));
                }
            }, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        it('should complete the run', function () {
            expect(testrun).to.be.ok;
            sinon.assert.calledOnce(testrun.done);
            sinon.assert.calledWith(testrun.done.getCall(0), null);
        });

        it('should call secretResolver only once when URL unchanged', function () {
            expect(resolverCallCount).to.equal(1);
        });

        it('should still resolve the secret correctly', function () {
            var request = testrun.request.getCall(0).args[3];

            expect(request.url.toString()).to.include('key=resolved-key');
        });
    });
});
