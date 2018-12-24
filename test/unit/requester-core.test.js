var expect = require('chai').expect,
    sdk = require('postman-collection'),
    runtimeVersion = require('../../package').version,
    requesterCore = require('../../lib/requester/core');

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

            expect(requesterCore.getRequestOptions(request, {})).to.eql({
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
                followOriginalHttpMethod: undefined,
                maxRedirects: undefined,
                removeRefererHeader: undefined,
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

            expect(requesterCore.getRequestOptions(request, {})).to.eql({
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
                followOriginalHttpMethod: undefined,
                maxRedirects: undefined,
                removeRefererHeader: undefined,
                encoding: null,
                agentOptions: {keepAlive: undefined}
            });
        });

        describe('Should accept URL irrespective of the case', function() {
            it('should accept URL in uppercase', function () {
                var request = new sdk.Request({
                    url: 'HTTP://POSTMAN-ECHO.COM/POST',
                    method: 'POST'
                });

                expect(requesterCore.getRequestOptions(request, {})).to.have.property('url',
                    'HTTP://POSTMAN-ECHO.COM/POST');
            });

            it('should accept URL in lowercase', function () {
                var request = new sdk.Request({
                    url: 'http://postman-echo.com/post',
                    method: 'POST'
                });

                expect(requesterCore.getRequestOptions(request, {})).to.have.property('url',
                    'http://postman-echo.com/post');
            });

            it('should accept URL in mixed case : Http:// ..', function () {
                var request = new sdk.Request({
                    url: 'Http://postman-echo.com/post',
                    method: 'POST'
                });

                expect(requesterCore.getRequestOptions(request, {})).to.have.property('url',
                    'Http://postman-echo.com/post');
            });

            it('should accept URL in mixed case : HtTp:// ..', function () {
                var request = new sdk.Request({
                    url: 'HtTp://postman-echo.com/post',
                    method: 'POST'
                });

                expect(requesterCore.getRequestOptions(request, {})).to.have.property('url',
                    'HtTp://postman-echo.com/post');
            });

            it('should accept secure http url in mixed case : HttPs:// ..', function () {
                var request = new sdk.Request({
                    url: 'HttPs://postman-echo.com',
                    method: 'GET'
                });

                expect(requesterCore.getRequestOptions(request, {})).to.have.property('url',
                    'HttPs://postman-echo.com');
            });
        });

        it('should override lookup function for localhost', function () {
            var request = new sdk.Request({
                url: 'http://localhost:8080/random/path'
            });

            expect(requesterCore.getRequestOptions(request, {}).lookup).to.be.a('function');
        });

        it('should override lookup function for restricted addresses', function () {
            var request = new sdk.Request({
                    url: 'https://postman-echo.com/get'
                }),
                options = {
                    network: {
                        restrictedAddresses: {
                            '127.0.0.1': true
                        }
                    }
                };

            expect(requesterCore.getRequestOptions(request, options).lookup).to.be.a('function');
        });

        it('should override lookup function for hosts', function () {
            var request = new sdk.Request({
                    url: 'https://postman-echo.com/get'
                }),
                options = {
                    network: {
                        hostLookup: {
                            type: 'hostIpMap'
                        }
                    }
                };

            expect(requesterCore.getRequestOptions(request, options).lookup).to.be.a('function');
        });

        it('should override default options with protocolProfileBehavior', function () {
            var request = new sdk.Request(),
                defaultOptions = {
                    strictSSL: true,
                    followRedirects: false,
                    followOriginalHttpMethod: false,
                    maxRedirects: 10,
                    removeRefererHeaderOnRedirect: false
                },
                protocolProfileBehavior = {
                    strictSSL: false,
                    followRedirects: true,
                    followOriginalHttpMethod: true,
                    maxRedirects: 15,
                    removeRefererHeaderOnRedirect: true
                };

            expect(requesterCore.getRequestOptions(request, defaultOptions, protocolProfileBehavior)).to.eql({
                headers: {
                    'User-Agent': 'PostmanRuntime/' + runtimeVersion,
                    Accept: '*/*',
                    Host: ''
                },
                url: 'http://',
                method: 'GET',
                jar: true,
                timeout: undefined,
                gzip: true,
                useQuerystring: true,
                strictSSL: false,
                followRedirect: true,
                followAllRedirects: true,
                followOriginalHttpMethod: true,
                maxRedirects: 15,
                removeRefererHeader: true,
                encoding: null,
                agentOptions: {keepAlive: undefined}
            });
        });
    });

    describe('.ensureHeaderExists', function () {
        it('should not mutate the header if it already exists', function () {
            var headers = {alpha: 'foo', beta: 'bar'};

            requesterCore.ensureHeaderExists(headers, 'alpha');
            expect(headers).to.eql({alpha: 'foo', beta: 'bar'});
        });

        it('should correctly set a missing header', function () {
            var headers = {alpha: 'foo', beta: 'bar'};

            requesterCore.ensureHeaderExists(headers, 'gamma', 'baz');
            expect(headers).to.eql({alpha: 'foo', beta: 'bar', gamma: 'baz'});
        });
    });

    describe('.getRequestHeaders', function () {
        it('should handle invalid input correctly', function () {
            var result = requesterCore.getRequestHeaders({});
            expect(result).to.be.undefined;
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
                headers = requesterCore.getRequestHeaders(request);

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

            expect(requesterCore.getRequestBody(request)).to.be.undefined;
        });

        it('should correctly handle missing bodies', function () {
            var request = new sdk.Request({
                url: 'postman-echo.com/post',
                method: 'POST'
            });

            expect(requesterCore.getRequestBody(request)).to.be.undefined;
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
            expect(requesterCore.getRequestBody(request, {})).to.eql({
                formData: [{key: 'foo', value: 'bar'}]
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

            expect(requesterCore.getRequestBody(request)).to.eql({
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

            expect(requesterCore.getRequestBody(request)).to.eql({
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

            expect(requesterCore.getRequestBody(request)).to.eql({
                formData: [
                    {key: 'alpha', value: 'foo'},
                    {key: 'beta', value: 'bar'},
                    {key: 'alpha', value: 'other'},
                    {key: 'alpha', value: 'next'}
                ]
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

            expect(requesterCore.getRequestBody(request)).to.have.property('body');
        });

        it('should handle disabled request bodies correctly ', function () {
            var request = new sdk.Request({
                url: 'postman-echo.com/post',
                method: 'POST',
                body: {
                    disabled: true,
                    mode: 'raw',
                    raw: '{"beta":"bar"}'
                }
            });

            expect(requesterCore.getRequestBody(request)).to.be.undefined;
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

            expect(requesterCore.getRequestBody(request)).to.be.undefined;
        });

        describe('with protocolProfileBehavior', function () {
            it('should bail out on GET requests with disableBodyPruning: false', function () {
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

                expect(requesterCore.getRequestBody(request, {
                    disableBodyPruning: false
                })).to.be.undefined;
            });

            it('should not bail out on GET requests with disableBodyPruning: true', function () {
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

                expect(requesterCore.getRequestBody(request, {
                    disableBodyPruning: true
                })).to.eql({
                    formData: [{key: 'foo', value: 'bar'}]
                });
            });

            it('should not bail out on POST requests with disableBodyPruning: true', function () {
                var request = new sdk.Request({
                    url: 'postman-echo.com/post',
                    method: 'POST',
                    body: {
                        mode: 'formdata',
                        formdata: [{
                            key: 'foo',
                            value: 'bar'
                        }]
                    }
                });

                expect(requesterCore.getRequestBody(request, {
                    disableBodyPruning: true
                })).to.eql({
                    formData: [{key: 'foo', value: 'bar'}]
                });
            });

            it('should not bail out on POST requests with disableBodyPruning: false', function () {
                var request = new sdk.Request({
                    url: 'postman-echo.com/post',
                    method: 'POST',
                    body: {
                        mode: 'formdata',
                        formdata: [{
                            key: 'foo',
                            value: 'bar'
                        }]
                    }
                });

                expect(requesterCore.getRequestBody(request, {
                    disableBodyPruning: false
                })).to.eql({
                    formData: [{key: 'foo', value: 'bar'}]
                });
            });
        });

        describe('request bodies with special keywords', function () {
            describe('formdata', function () {
                it('should handle request bodies with whitelisted special keywords correctly', function () {
                    var request = new sdk.Request({
                        url: 'postman-echo.com/post',
                        method: 'POST',
                        body: {
                            mode: 'formdata',
                            formdata: [
                                {key: 'constructor', value: 'builds away!'},
                                {key: 'foo', value: 'bar'}
                            ]
                        }
                    });

                    expect(requesterCore.getRequestBody(request)).to.eql({
                        formData: [
                            {key: 'constructor', value: 'builds away!'},
                            {key: 'foo', value: 'bar'}
                        ]
                    });
                });

                it('should handle request bodies with multiple whitelisted special keywords correctly', function () {
                    var request = new sdk.Request({
                        url: 'postman-echo.com/post',
                        method: 'POST',
                        body: {
                            mode: 'formdata',
                            formdata: [
                                {key: 'constructor', value: 'I\'ll be back'},
                                {key: 'constructor', value: 'Come with me if you want to live!'},
                                {key: 'foo', value: 'bar'}
                            ]
                        }
                    });

                    expect(requesterCore.getRequestBody(request)).to.eql({
                        formData: [
                            {key: 'constructor', value: 'I\'ll be back'},
                            {key: 'constructor', value: 'Come with me if you want to live!'},
                            {key: 'foo', value: 'bar'}
                        ]
                    });
                });
            });

            describe('url encoded', function () {
                it('should handle request bodies with whitelisted special keywords correctly', function () {
                    var request = new sdk.Request({
                        url: 'postman-echo.com/post',
                        method: 'POST',
                        body: {
                            mode: 'urlencoded',
                            urlencoded: [
                                {key: 'constructor', value: 'builds away!'},
                                {key: 'foo', value: 'bar'}
                            ]
                        }
                    });

                    expect(requesterCore.getRequestBody(request)).to.eql({
                        form: {constructor: 'builds away!', foo: 'bar'}
                    });
                });

                it('should handle request bodies with multiple whitelisted special keywords correctly', function () {
                    var request = new sdk.Request({
                        url: 'postman-echo.com/post',
                        method: 'POST',
                        body: {
                            mode: 'urlencoded',
                            urlencoded: [
                                {key: 'constructor', value: 'I\'ll be back'},
                                {key: 'constructor', value: 'Come with me if you want to live!'},
                                {key: 'foo', value: 'bar'}
                            ]
                        }
                    });

                    expect(requesterCore.getRequestBody(request)).to.eql({
                        form: {
                            constructor: ['I\'ll be back', 'Come with me if you want to live!'],
                            foo: 'bar'
                        }
                    });
                });
            });
        });

        describe('request bodies with additional options', function () {
            describe('formdata', function () {
                it('should accept contentType ', function () {
                    var request = new sdk.Request({
                            url: 'postman-echo.com/post',
                            method: 'POST',
                            body: {
                                mode: 'formdata',
                                formdata: [{
                                    key: 'userData',
                                    value: '{"name": "userName"}',
                                    contentType: 'application/json',
                                    type: 'text'
                                }, {
                                    key: 'userFile',
                                    src: 'path/to/userFile',
                                    contentType: 'application/json',
                                    type: 'file'
                                }]
                            }
                        }),
                        requestBody = requesterCore.getRequestBody(request);

                    expect(requestBody.formData).to.eql([{
                        key: 'userData',
                        value: '{"name": "userName"}',
                        options: {contentType: 'application/json'}
                    }, {
                        key: 'userFile',
                        value: '',
                        options: {contentType: 'application/json'}
                    }]);
                });

                it('should avoid contentType as blank string', function () {
                    var request = new sdk.Request({
                            url: 'postman-echo.com/post',
                            method: 'POST',
                            body: {
                                mode: 'formdata',
                                formdata: [{
                                    key: 'foo',
                                    value: 'bar',
                                    contentType: ''
                                }]
                            }
                        }),
                        requestBody = requesterCore.getRequestBody(request);

                    expect(requestBody.formData).to.eql([{key: 'foo', value: 'bar'}]);
                });

                it('should not support fileName & fileLength', function () {
                    // @todo this test is added to make sure to add tests for `fileName` & `fileLength`
                    //       option when these options are added in Schema and SDK.
                    var request = new sdk.Request({
                            url: 'postman-echo.com/post',
                            method: 'POST',
                            body: {
                                mode: 'formdata',
                                formdata: [{
                                    key: 'foo',
                                    value: 'bar',
                                    fileName: 'file.json',
                                    fileLength: 3,
                                    type: 'text'
                                }]
                            }
                        }),
                        requestBody = requesterCore.getRequestBody(request);

                    expect(requestBody.formData).to.eql([{key: 'foo', value: 'bar'}]);
                });
            });
        });
    });

    describe('.jsonifyResponse', function () {
        it('should handle falsy input correctly', function () {
            expect(requesterCore.jsonifyResponse()).to.be.undefined;
        });
    });

    describe('.arrayPairsToObject', function () {
        it('should bail out for non-arrays', function () {
            var result = requesterCore.arrayPairsToObject('random');
            expect(result).to.be.undefined;
        });

        it('should correctly convert an array of pairs to an object', function () {
            var obj = requesterCore.arrayPairsToObject(['a', 'b', 'c', 'd']);
            expect(obj).to.eql({a: 'b', c: 'd'});
        });

        it('should correctly handle multi valued keys', function () {
            var obj = requesterCore.arrayPairsToObject(['a', 'b', 'c', 'd', 'a', 'e']);
            expect(obj).to.eql({a: ['b', 'e'], c: 'd'});
        });
    });
});
