var expect = require('chai').expect,
    sinon = require('sinon');

describe('secret resolution', function () {
    describe('basic secret resolution with ref', function () {
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
                            ref: {
                                source: 'mock-secret-manager',
                                secretId: 'my-api-key-secret'
                            }
                        },
                        {
                            key: 'normalVar',
                            value: 'normal-value'
                        }
                    ]
                },
                secretResolver: function (ref, callback) {
                    // Simulate async secret resolution
                    setTimeout(function () {
                        if (ref.source === 'mock-secret-manager' && ref.secretId === 'my-api-key-secret') {
                            return callback(null, 'resolved-secret-value-123');
                        }

                        return callback(new Error('Unknown secret: ' + JSON.stringify(ref)));
                    }, 10);
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

    describe('nested secret resolution with ref', function () {
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
                            ref: {
                                source: 'mock-secret-manager',
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
                secretResolver: function (ref, callback) {
                    // Simulate async secret resolution
                    setTimeout(function () {
                        if (ref.source === 'mock-secret-manager' && ref.secretId === 'my-api-key-secret') {
                            return callback(null, 'resolved-secret-value-123');
                        }

                        return callback(new Error('Unknown secret: ' + JSON.stringify(ref)));
                    }, 10);
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
                            ref: {
                                source: 'vault',
                                path: '/secret/data/myapp'
                            }
                        }
                    ]
                },
                secretResolver: function () {
                    // Return a Promise instead of using callback
                    return new Promise(function (resolve) {
                        setTimeout(function () {
                            resolve('promise-resolved-secret');
                        }, 10);
                    });
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
                            ref: {
                                source: 'failing-source',
                                secretId: 'will-fail'
                            }
                        }
                    ]
                },
                secretResolver: function (ref, callback) {
                    // Simulate a failed resolution
                    setTimeout(function () {
                        callback(new Error('Failed to fetch secret'));
                    }, 10);
                }
            }, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        it('should complete the run even when secret resolution fails', function () {
            expect(testrun).to.be.ok;
            sinon.assert.calledOnce(testrun.done);
            sinon.assert.calledWith(testrun.done.getCall(0), null);
        });

        it('should keep original value when secret resolution fails', function () {
            var request = testrun.request.getCall(0).args[3];

            // The original value should remain since resolution failed
            expect(request.url.toString()).to.include('secret=fallback-value');
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
                            ref: { source: 'mock', id: '1' }
                        },
                        {
                            key: 'secret2',
                            value: '',
                            type: 'secret',
                            ref: { source: 'mock', id: '2' }
                        },
                        {
                            key: 'secret3',
                            value: '',
                            type: 'secret',
                            ref: { source: 'mock', id: '3' }
                        }
                    ]
                },
                secretResolver: function (ref, callback) {
                    resolverCallCount++;
                    setTimeout(function () {
                        callback(null, 'secret-value-' + ref.id);
                    }, 10);
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
                            type: 'secret',
                            ref: {
                                source: 'some-source',
                                secretId: 'some-secret'
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
                            type: 'secret',
                            ref: { source: 'mock', type: 'auth-token' }
                        },
                        {
                            key: 'apiKey',
                            value: '',
                            type: 'secret',
                            ref: { source: 'mock', type: 'api-key' }
                        }
                    ]
                },
                secretResolver: function (ref, callback) {
                    setTimeout(function () {
                        if (ref.type === 'auth-token') {
                            return callback(null, 'resolved-auth-token-xyz');
                        }
                        else if (ref.type === 'api-key') {
                            return callback(null, 'resolved-api-key-abc');
                        }

                        return callback(new Error('Unknown ref type'));
                    }, 10);
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
});
