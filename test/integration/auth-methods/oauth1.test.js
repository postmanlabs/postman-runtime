var fs = require('fs'),
    path = require('path'),
    expect = require('chai').expect,
    IS_BROWSER = typeof window !== 'undefined';

describe('oauth 1', function () {
    var testrun;

    describe('correct credentials', function () {
        before(function (done) {
            // perform the collection run
            this.run({
                collection: {
                    item: {
                        request: {
                            auth: {
                                type: 'oauth1',
                                oauth1: {
                                    consumerKey: 'RKCGzna7bv9YD57c',
                                    consumerSecret: 'D+EdQ-gs$-%@2Nu7',
                                    token: '',
                                    tokenSecret: '',
                                    signatureMethod: 'HMAC-SHA1',
                                    timestamp: 1461319769,
                                    nonce: 'ik3oT5',
                                    version: '1.0',
                                    realm: '',
                                    addParamsToHeader: true,
                                    addEmptyParamsToSign: false
                                }
                            },
                            url: 'https://postman-echo.com/oauth1',
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
            expect(testrun.done.calledOnce).to.be.ok;
            testrun.done.getCall(0).args[0] && console.error(testrun.done.getCall(0).args[0].stack);
            expect(testrun.done.getCall(0).args[0]).to.be.null;
            expect(testrun.start.calledOnce).to.be.ok;
        });

        it('should have sent the request once', function () {
            expect(testrun.request.calledOnce).to.be.ok;

            var request = testrun.request.getCall(0).args[3],
                response = testrun.request.getCall(0).args[2];

            expect(request.url.toString()).to.eql('https://postman-echo.com/oauth1');
            expect(response).to.have.property('code', 200);
        });

        it('should have sent one request internally', function () {
            expect(testrun.io.calledOnce).to.be.ok;

            var firstError = testrun.io.firstCall.args[0],
                firstRequest = testrun.io.firstCall.args[4],
                firstResponse = testrun.io.firstCall.args[3];

            expect(firstError).to.be.null;
            expect(firstRequest.url.toString()).to.eql('https://postman-echo.com/oauth1');
            expect(firstResponse).to.have.property('code', 200);
        });

        it('should have passed OAuth 1 authorization', function () {
            expect(testrun.request.calledOnce).to.be.ok;

            var request = testrun.request.getCall(0).args[3],
                response = testrun.request.getCall(0).args[2];

            expect(request.url.toString()).to.eql('https://postman-echo.com/oauth1');
            expect(response).to.have.property('code', 200);
        });
    });

    (IS_BROWSER ? describe.skip : describe)('with urlencoded body having disabled params', function () {
        before(function (done) {
            // perform the collection run
            this.run({
                collection: {
                    item: {
                        request: {
                            auth: {
                                type: 'oauth1',
                                oauth1: {
                                    consumerKey: 'RKCGzna7bv9YD57c',
                                    consumerSecret: 'D+EdQ-gs$-%@2Nu7',
                                    signatureMethod: 'HMAC-SHA1',
                                    version: '1.0',
                                    addParamsToHeader: true,
                                    addEmptyParamsToSign: false
                                }
                            },
                            url: 'https://postman-echo.com/oauth1',
                            method: 'GET',
                            body: {
                                mode: 'urlencoded',
                                urlencoded: [
                                    {key: 'param_1', value: 'value_1'},
                                    {key: 'param_2', value: 'value_2', disabled: true}
                                ]
                            }
                        }
                    },
                    protocolProfileBehavior: {
                        disableBodyPruning: true
                    }
                }
            }, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        it('should have completed the run', function () {
            expect(testrun).to.be.ok;
            expect(testrun).to.nested.include({
                'done.calledOnce': true,
                'start.calledOnce': true
            });
            expect(testrun.done.getCall(0).args[0]).to.be.null;
        });

        it('should have passed OAuth 1 authorization', function () {
            expect(testrun.request.calledOnce).to.be.ok;

            var response = testrun.request.getCall(0).args[2];

            expect(response).to.have.property('code', 200);
        });
    });

    describe('with disabled URL params', function () {
        before(function (done) {
            // perform the collection run
            this.run({
                collection: {
                    item: {
                        request: {
                            auth: {
                                type: 'oauth1',
                                oauth1: {
                                    consumerKey: 'RKCGzna7bv9YD57c',
                                    consumerSecret: 'D+EdQ-gs$-%@2Nu7',
                                    signatureMethod: 'HMAC-SHA1',
                                    version: '1.0',
                                    addParamsToHeader: true,
                                    addEmptyParamsToSign: false
                                }
                            },
                            url: {
                                host: ['postman-echo', 'com'],
                                path: ['oauth1'],
                                protocol: 'https',
                                query: [
                                    {key: 'param_1', value: 'value_1'},
                                    {key: 'param_2', value: 'value_2', disabled: true}
                                ],
                                variable: []
                            },
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
            expect(testrun).to.nested.include({
                'done.calledOnce': true,
                'start.calledOnce': true
            });
            expect(testrun.done.getCall(0).args[0]).to.be.null;
        });

        it('should have passed OAuth 1 authorization', function () {
            expect(testrun.request.calledOnce).to.be.ok;

            var response = testrun.request.getCall(0).args[2];

            expect(response).to.have.property('code', 200);
        });
    });

    describe('empty urlencoded body and addParamsToHeader: false', function () {
        before(function (done) {
            // perform the collection run
            this.run({
                collection: {
                    item: {
                        request: {
                            auth: {
                                type: 'oauth1',
                                oauth1: {
                                    consumerKey: 'RKCGzna7bv9YD57c',
                                    consumerSecret: 'D+EdQ-gs$-%@2Nu7',
                                    signatureMethod: 'HMAC-SHA1',
                                    version: '1.0',
                                    addParamsToHeader: false,
                                    addEmptyParamsToSign: false
                                }
                            },
                            url: {
                                host: ['postman-echo', 'com'],
                                path: ['post'],
                                protocol: 'https'
                            },
                            method: 'POST',
                            body: {
                                mode: 'urlencoded',
                                urlencoded: [] // empty body
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
            expect(testrun).to.nested.include({
                'done.calledOnce': true,
                'start.calledOnce': true
            });
            expect(testrun.done.getCall(0).args[0]).to.be.null;
        });

        it('should send auth params in request body', function () {
            expect(testrun.request.calledOnce).to.be.ok;

            var response = testrun.request.getCall(0).args[2].json();

            expect(response.form).to.include.keys([
                'oauth_consumer_key',
                'oauth_signature_method',
                'oauth_timestamp',
                'oauth_nonce',
                'oauth_version',
                'oauth_signature'
            ]);
        });
    });

    describe('disableHeaderEncoding: true', function () {
        before(function (done) {
            // perform the collection run
            this.run({
                collection: {
                    item: {
                        request: {
                            auth: {
                                type: 'oauth1',
                                oauth1: {
                                    consumerKey: 'foo!bar',
                                    consumerSecret: 'secret',
                                    signatureMethod: 'HMAC-SHA1',
                                    addParamsToHeader: true,
                                    disableHeaderEncoding: true
                                }
                            },
                            url: 'https://postman-echo.com/get',
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
            expect(testrun).to.nested.include({
                'done.calledOnce': true,
                'start.calledOnce': true
            });
            expect(testrun.done.getCall(0).args[0]).to.be.null;
        });

        it('should not encode params in Authorization header', function () {
            var response = testrun.response.getCall(0).args[2];

            expect(response).to.have.property('code', 200);
            expect(response.json().headers.authorization).to.contain('oauth_consumer_key="foo!bar"');
        });
    });

    describe('disableHeaderEncoding: false', function () {
        before(function (done) {
            // perform the collection run
            this.run({
                collection: {
                    item: {
                        request: {
                            auth: {
                                type: 'oauth1',
                                oauth1: {
                                    consumerKey: 'foo!bar',
                                    consumerSecret: 'secret',
                                    signatureMethod: 'HMAC-SHA1',
                                    addParamsToHeader: true,
                                    disableHeaderEncoding: false
                                }
                            },
                            url: 'https://postman-echo.com/get',
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
            expect(testrun).to.nested.include({
                'done.calledOnce': true,
                'start.calledOnce': true
            });
            expect(testrun.done.getCall(0).args[0]).to.be.null;
        });

        it('should encode params in Authorization header', function () {
            var response = testrun.response.getCall(0).args[2];

            expect(response).to.have.property('code', 200);
            expect(response.json().headers.authorization).to.contain('oauth_consumer_key="foo%21bar"');
        });
    });

    describe('without disableHeaderEncoding option', function () {
        before(function (done) {
            // perform the collection run
            this.run({
                collection: {
                    item: {
                        request: {
                            auth: {
                                type: 'oauth1',
                                oauth1: {
                                    consumerKey: 'foo!bar',
                                    consumerSecret: 'secret',
                                    signatureMethod: 'HMAC-SHA1',
                                    addParamsToHeader: true
                                }
                            },
                            url: 'https://postman-echo.com/get',
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
            expect(testrun).to.nested.include({
                'done.calledOnce': true,
                'start.calledOnce': true
            });
            expect(testrun.done.getCall(0).args[0]).to.be.null;
        });

        it('should encode params in Authorization header by default', function () {
            var response = testrun.response.getCall(0).args[2];

            expect(response).to.have.property('code', 200);
            expect(response.json().headers.authorization).to.contain('oauth_consumer_key="foo%21bar"');
        });
    });

    describe('includeBodyHash: false', function () {
        before(function (done) {
            // perform the collection run
            this.run({
                collection: {
                    item: {
                        request: {
                            auth: {
                                type: 'oauth1',
                                oauth1: {
                                    consumerKey: 'foo!bar',
                                    consumerSecret: 'secret',
                                    signatureMethod: 'HMAC-SHA1',
                                    addParamsToHeader: false,
                                    includeBodyHash: false
                                }
                            },
                            url: 'https://postman-echo.com/get',
                            method: 'GET',
                            body: {
                                mode: 'file',
                                file: {
                                    src: path.resolve(__dirname, '../../fixtures/upload-file.json')
                                }
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
            expect(testrun).to.nested.include({
                'done.calledOnce': true,
                'start.calledOnce': true
            });
            expect(testrun.done.getCall(0).args[0]).to.be.null;
        });

        it('should not include body hash in parameters', function () {
            var response = testrun.response.getCall(0).args[2];

            expect(response).to.have.property('code', 200);
            expect(response.json().args).to.not.have.property('oauth_body_hash');
        });
    });

    (IS_BROWSER ? describe.skip : describe)('includeBodyHash: true', function () {
        // eslint-disable-next-line mocha/no-sibling-hooks
        before(function (done) {
            // perform the collection run
            this.run({
                collection: {
                    item: {
                        request: {
                            auth: {
                                type: 'oauth1',
                                oauth1: {
                                    consumerKey: 'foo!bar',
                                    consumerSecret: 'secret',
                                    signatureMethod: 'HMAC-SHA1',
                                    addParamsToHeader: false,
                                    includeBodyHash: true
                                }
                            },
                            url: 'https://postman-echo.com/get',
                            method: 'GET',
                            body: {
                                mode: 'file',
                                file: {
                                    src: path.resolve(__dirname, '../../fixtures/upload-file.json')
                                }
                            }
                        }
                    }
                },
                fileResolver: fs
            }, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        // eslint-disable-next-line mocha/no-identical-title
        it('should have completed the run', function () {
            expect(testrun).to.be.ok;
            expect(testrun).to.nested.include({
                'done.calledOnce': true,
                'start.calledOnce': true
            });
            expect(testrun.done.getCall(0).args[0]).to.be.null;
        });

        it('should include correct body hash in parameters', function () {
            var response = testrun.response.getCall(0).args[2];

            expect(response).to.have.property('code', 200);
            expect(response.json().args).to.have.property('oauth_body_hash', 'He8B58UeskyhaMwMIldmdODrVpM=');
        });
    });

    describe('query parameter encoding', function () {
        before(function (done) {
            // perform the collection run
            this.run({
                collection: {
                    item: {
                        request: {
                            auth: {
                                type: 'oauth1',
                                oauth1: {
                                    consumerKey: 'RKCGzna7bv9YD57c',
                                    consumerSecret: 'D+EdQ-gs$-%@2Nu7',
                                    signatureMethod: 'HMAC-SHA1',
                                    version: '1.0',
                                    addParamsToHeader: false,
                                    addEmptyParamsToSign: false
                                }
                            },
                            url: {
                                host: ['postman-echo', 'com'],
                                path: ['oauth1'],
                                protocol: 'https',
                                query: [
                                    {key: 'param_1', value: 'value_1,value_2,value_3'},
                                    {key: 'param_2', value: 'value_4&value_5'},
                                    {key: 'param_3', value: 'value_1%2Cvalue_2%2Cvalue_3'}
                                ],
                                variable: []
                            },
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
            expect(testrun.done.calledOnce).to.be.ok;
            testrun.done.getCall(0).args[0] && console.error(testrun.done.getCall(0).args[0].stack);
            expect(testrun.done.getCall(0).args[0]).to.be.null;
            expect(testrun.start.calledOnce).to.be.ok;
        });

        it('should have passed OAuth 1 authorization', function () {
            expect(testrun.request.calledOnce).to.be.ok;

            var response = testrun.request.getCall(0).args[2];

            expect(response).to.have.property('code', 200);
        });

        it('should send query parameters encoded with RFC-3986 standards', function () {
            var request = testrun.request.getCall(0).args[3];

            expect(request.url.query.get('param_1')).to.eql('value_1%2Cvalue_2%2Cvalue_3');
            expect(request.url.query.get('param_2')).to.eql('value_4%26value_5');
            expect(request.url.query.get('param_3')).to.eql('value_1%2Cvalue_2%2Cvalue_3');
        });
    });

    // Authorization is failing when query parameters have duplicate keys
    // e.g. {key: 'param_1', value: 'value_1'}, {key: 'param_1', value: 'value_2'},
    describe.skip('with duplicate query params', function () {
        before(function (done) {
            // perform the collection run
            this.run({
                collection: {
                    item: {
                        request: {
                            auth: {
                                type: 'oauth1',
                                oauth1: {
                                    consumerKey: 'RKCGzna7bv9YD57c',
                                    consumerSecret: 'D+EdQ-gs$-%@2Nu7',
                                    signatureMethod: 'HMAC-SHA1',
                                    version: '1.0',
                                    addParamsToHeader: false,
                                    addEmptyParamsToSign: false
                                }
                            },
                            url: {
                                host: ['postman-echo', 'com'],
                                path: ['oauth1'],
                                protocol: 'https',
                                query: [
                                    {key: 'param_1', value: 'value_1'},
                                    {key: 'param_1', value: 'value_2'}
                                ],
                                variable: []
                            },
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
            expect(testrun.done.calledOnce).to.be.ok;
            testrun.done.getCall(0).args[0] && console.error(testrun.done.getCall(0).args[0].stack);
            expect(testrun.done.getCall(0).args[0]).to.be.null;
            expect(testrun.start.calledOnce).to.be.ok;
        });

        it('should have passed OAuth 1 authorization', function () {
            expect(testrun.request.calledOnce).to.be.ok;

            var response = testrun.request.getCall(0).args[2];

            expect(response).to.have.property('code', 200);
        });
    });

    // Authorization is failing when query parameters have an empty key
    // e.g. {key: '', value: 'value_1'}, request: www.xyz.com/a?=value_1
    describe.skip('with query params having empty keys', function () {
        before(function (done) {
            // perform the collection run
            this.run({
                collection: {
                    item: {
                        request: {
                            auth: {
                                type: 'oauth1',
                                oauth1: {
                                    consumerKey: 'RKCGzna7bv9YD57c',
                                    consumerSecret: 'D+EdQ-gs$-%@2Nu7',
                                    signatureMethod: 'HMAC-SHA1',
                                    version: '1.0',
                                    addParamsToHeader: false,
                                    addEmptyParamsToSign: false
                                }
                            },
                            url: {
                                host: ['postman-echo', 'com'],
                                path: ['oauth1'],
                                protocol: 'https',
                                query: [
                                    {key: '', value: 'value_1'}
                                ],
                                variable: []
                            },
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
            expect(testrun.done.calledOnce).to.be.ok;
            testrun.done.getCall(0).args[0] && console.error(testrun.done.getCall(0).args[0].stack);
            expect(testrun.done.getCall(0).args[0]).to.be.null;
            expect(testrun.start.calledOnce).to.be.ok;
        });

        it('should have passed OAuth 1 authorization', function () {
            expect(testrun.request.calledOnce).to.be.ok;

            var response = testrun.request.getCall(0).args[2];

            expect(response).to.have.property('code', 200);
        });
    });
});
