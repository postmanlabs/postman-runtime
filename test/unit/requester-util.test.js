/* global describe, it */

var expect = require('expect.js'),
    sdk = require('postman-collection'),
    runtimeVersion = require('../../package').version,
    requesterUtil = require('../../lib/requester/util');

describe('requester util', function () {
    describe('.getRequestOptions', function () {
        it('should use http as the default protocol', function () {
            var request = new sdk.Request({
                url: 'postman-echo.com/post',
                method: 'POST',
                header: [{
                    key: 'alpha',
                    value: 'foo'
                }],
                body: {
                    mode: 'raw',
                    raw: '{"alpha": "foo"}'
                }
            });

            expect(requesterUtil.getRequestOptions(request, {})).to.eql({
                headers: {
                    alpha: 'foo',
                    'User-Agent': 'PostmanRuntime/' + runtimeVersion,
                    'Content-Type': 'text/plain',
                    Accept: '*/*',
                    Host: 'postman-echo.com'
                },
                body: '{"alpha": "foo"}',
                url: 'http://postman-echo.com/post',
                method: 'POST',
                jar: true,
                timeout: undefined,
                gzip: true,
                useQuerystring: true,
                strictSSL: undefined,
                followRedirect: undefined,
                followAllRedirects: undefined,
                encoding: null,
                agentOptions: {keepAlive: undefined}
            });
        });

        it('should use https where applicable', function () {
            var request = new sdk.Request({
                url: 'https://postman-echo.com',
                method: 'GET',
                header: [{
                    key: 'alpha',
                    value: 'foo'
                }]
            });

            expect(requesterUtil.getRequestOptions(request, {})).to.eql({
                headers: {
                    alpha: 'foo',
                    'User-Agent': 'PostmanRuntime/' + runtimeVersion,
                    Accept: '*/*',
                    Host: 'postman-echo.com'
                },
                url: 'https://postman-echo.com',
                method: 'GET',
                jar: true,
                timeout: undefined,
                gzip: true,
                useQuerystring: true,
                strictSSL: undefined,
                followRedirect: undefined,
                followAllRedirects: undefined,
                encoding: null,
                agentOptions: {keepAlive: undefined}
            });
        });

        it('should override lookup function for localhost', function () {
            var request = new sdk.Request({
                url: 'http://localhost:8080/random/path'
            });

            expect(requesterUtil.getRequestOptions(request, {}).lookup).to.be.a('function');
        });

        it('should override lookup function for restricted addresses', function () {
            var request = new sdk.Request({
                    url: 'http://postman-echo.com/get'
                }),
                options = {
                    network: {
                        restrictedAddresses: {
                            '127.0.0.1': true
                        }
                    }
                };

            expect(requesterUtil.getRequestOptions(request, options).lookup).to.be.a('function');
        });

        it('should override lookup function for hosts', function () {
            var request = new sdk.Request({
                    url: 'http://postman-echo.com/get'
                }),
                options = {
                    network: {
                        hostLookup: {
                            type: 'hostIpMap'
                        }
                    }
                };

            expect(requesterUtil.getRequestOptions(request, options).lookup).to.be.a('function');
        });
    });

    describe('.ensureHeaderExists', function () {
        it('should not mutate the header if it already exists', function () {
            var headers = {alpha: 'foo', beta: 'bar'};

            requesterUtil.ensureHeaderExists(headers, 'alpha');
            expect(headers).to.eql({alpha: 'foo', beta: 'bar'});
        });

        it('should correctly set a missing header', function () {
            var headers = {alpha: 'foo', beta: 'bar'};

            requesterUtil.ensureHeaderExists(headers, 'gamma', 'baz');
            expect(headers).to.eql({alpha: 'foo', beta: 'bar', gamma: 'baz'});
        });
    });

    describe('.getRequestHeaders', function () {
        it('should handle invalid input correctly', function () {
            var result = requesterUtil.getRequestHeaders({});
            expect(result).to.be(undefined);
        });

        it('should correctly fetch request headers from a sdk Request instance', function () {
            var request = new sdk.Request({
                    url: 'postman-echo.com',
                    method: 'GET',
                    header: [
                        {key: 'alpha', value: 'foo'},
                        {key: 'beta', value: 'bar', disabled: true},
                        {key: 'gamma', value: 'baz'},
                        {key: 'alpha', value: 'next'},
                        {key: 'alpha', value: 'other'},
                        {key: '', value: 'random'}
                    ]
                }),
                headers = requesterUtil.getRequestHeaders(request);

            expect(headers).to.eql({
                alpha: ['foo', 'next', 'other'],
                gamma: 'baz'
            });
        });
    });

    describe('.getRequestBody', function () {
        it('should correctly handle empty bodies', function () {
            var request = new sdk.Request({
                url: 'postman-echo.com/post',
                method: 'POST',
                body: {mode: 'formdata'}
            });

            expect(requesterUtil.getRequestBody(request)).to.be(undefined);
        });

        it('should correctly handle missing bodies', function () {
            var request = new sdk.Request({
                url: 'postman-echo.com/post',
                method: 'POST'
            });

            expect(requesterUtil.getRequestBody(request)).to.be(undefined);
        });

        it('should correctly handle missing request methods', function () {
            var request = new sdk.Request({
                url: 'postman-echo.com/post',
                header: [{
                    key: 'alpha',
                    value: 'foo'
                }],
                body: {
                    mode: 'formdata',
                    formdata: [{
                        key: 'foo',
                        value: 'bar'
                    }]
                }
            });

            delete request.method;
            expect(requesterUtil.getRequestBody(request, {})).to.eql({
                formData: {foo: 'bar'}
            });
        });

        it('should not bail out on GET requests for sendBodyWithGetRequests', function () {
            var request = new sdk.Request({
                url: 'postman-echo.com/get',
                body: {
                    mode: 'formdata',
                    formdata: [{
                        key: 'foo',
                        value: 'bar'
                    }]
                }
            });

            expect(requesterUtil.getRequestBody(request, {sendBodyWithGetRequests: true})).to.eql({
                formData: {foo: 'bar'}
            });
        });

        it('should handle raw request bodies correctly ', function () {
            var request = new sdk.Request({
                url: 'postman-echo.com/post',
                method: 'POST',
                body: {
                    mode: 'raw',
                    raw: '{"beta":"bar"}'
                }
            });

            expect(requesterUtil.getRequestBody(request)).to.eql({
                body: '{"beta":"bar"}'
            });
        });

        it('should handle urlencoded request bodies correctly', function () {
            var request = new sdk.Request({
                url: 'postman-echo.com/post',
                method: 'POST',
                body: {
                    mode: 'urlencoded',
                    urlencoded: [
                        {key: 'alpha', value: 'foo', type: 'text'},
                        {key: 'beta', value: 'bar', type: 'text'},
                        {key: 'gamma', value: 'baz', type: 'text', disabled: true},
                        {key: 'alpha', value: 'other', type: 'text'},
                        {key: 'alpha', value: 'next', type: 'text'}
                    ]
                }
            });

            expect(requesterUtil.getRequestBody(request)).to.eql({
                form: {alpha: ['foo', 'other', 'next'], beta: 'bar'}
            });
        });

        it('should handle form data request bodies correctly', function () {
            var request = new sdk.Request({
                url: 'postman-echo.com/post',
                method: 'POST',
                body: {
                    mode: 'formdata',
                    formdata: [
                        {key: 'alpha', value: 'foo', type: 'text'},
                        {key: 'beta', value: 'bar', type: 'text'},
                        {key: 'gamma', value: 'baz', type: 'text', disabled: true},
                        {key: 'alpha', value: 'other', type: 'text'},
                        {key: 'alpha', value: 'next', type: 'text'}
                    ]
                }
            });

            expect(requesterUtil.getRequestBody(request)).to.eql({
                formData: {alpha: ['foo', 'other', 'next'], beta: 'bar'}
            });
        });

        it('should handle file based request bodies correctly', function () {
            var request = new sdk.Request({
                url: 'postman-echo.com/post',
                method: 'POST',
                body: {
                    mode: 'file',
                    file: {src: 'random.txt'}
                }
            });

            expect(requesterUtil.getRequestBody(request)).to.have.property('body');
        });

        it('should handle arbitrary request bodies correctly', function () {
            var request = new sdk.Request({
                url: 'postman-echo.com/post',
                method: 'POST',
                body: {
                    mode: 'random',
                    random: 'An arbitrary request body format'
                }
            });

            expect(requesterUtil.getRequestBody(request)).to.be(undefined);
        });
    });

    describe('.jsonifyResponse', function () {
        it('should handle falsy input correctly', function () {
            expect(requesterUtil.jsonifyResponse()).to.be(undefined);
        });
    });

    describe('.arrayPairsToObject', function () {
        it('should bail out for non-arrays', function () {
            var result = requesterUtil.arrayPairsToObject('random');
            expect(result).to.be(undefined);
        });

        it('should correctly convert an array of pairs to an object', function () {
            var obj = requesterUtil.arrayPairsToObject(['a', 'b', 'c', 'd']);
            expect(obj).to.eql({a: 'b', c: 'd'});
        });

        it('should correctly handle multi valued keys', function () {
            var obj = requesterUtil.arrayPairsToObject(['a', 'b', 'c', 'd', 'a', 'e']);
            expect(obj).to.eql({a: ['b', 'e'], c: 'd'});
        });
    });
});
