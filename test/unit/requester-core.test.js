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
                }),
                requestOptions = requesterCore.getRequestOptions(request, {});

            expect(requestOptions).to.deep.include({
                headers: {
                    alpha: 'foo',
                    'User-Agent': 'PostmanRuntime/' + runtimeVersion,
                    'Content-Type': 'text/plain',
                    Accept: '*/*',
                    'Accept-Encoding': 'gzip, deflate, br',
                    Connection: 'keep-alive',
                    Host: 'postman-echo.com'
                },
                body: '{"alpha": "foo"}',
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
                extraCA: undefined,
                agentOptions: { keepAlive: undefined },
                time: undefined,
                verbose: undefined,
                disableUrlEncoding: true
            });

            expect(requestOptions).to.have.ownProperty('url');
            expect(requestOptions.url).to.nested.include({
                protocol: 'http:',
                slashes: true,
                auth: null,
                host: 'postman-echo.com',
                port: null,
                hostname: 'postman-echo.com',
                hash: null,
                search: null,
                query: null,
                pathname: '/post',
                path: '/post',
                href: 'http://postman-echo.com/post'
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
                }),
                requestOptions = requesterCore.getRequestOptions(request, {});

            expect(requestOptions).to.deep.include({
                headers: {
                    alpha: 'foo',
                    'User-Agent': 'PostmanRuntime/' + runtimeVersion,
                    Accept: '*/*',
                    'Accept-Encoding': 'gzip, deflate, br',
                    Connection: 'keep-alive',
                    Host: 'postman-echo.com'
                },
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
                extraCA: undefined,
                agentOptions: { keepAlive: undefined },
                time: undefined,
                verbose: undefined,
                disableUrlEncoding: true
            });

            expect(requestOptions).to.have.ownProperty('url');
            expect(requestOptions.url).to.nested.include({
                protocol: 'https:',
                slashes: true,
                auth: null,
                host: 'postman-echo.com',
                port: null,
                hostname: 'postman-echo.com',
                hash: null,
                search: null,
                query: null,
                pathname: '/',
                path: '/',
                href: 'https://postman-echo.com/'
            });
        });

        it('should accept custom requesting agents', function () {
            var request = new sdk.Request({
                    url: 'https://postman-echo.com',
                    method: 'GET'
                }),
                agents = {
                    http: 'http.Agent',
                    https: {
                        agentClass: 'https.Agent'
                    }
                },
                requestOptions = requesterCore.getRequestOptions(request, { agents });

            expect(requestOptions).to.have.ownProperty('agents', agents);
            expect(requestOptions).to.have.property('agentOptions');
        });

        describe('Should accept URL irrespective of the case', function () {
            it('should accept URL in uppercase', function () {
                var request = new sdk.Request({
                    url: 'HTTP://POSTMAN-ECHO.COM/POST',
                    method: 'POST'
                });

                expect(requesterCore.getRequestOptions(request, {})).to.have.nested.property('url.href',
                    'http://postman-echo.com/POST');
            });

            it('should accept URL in lowercase', function () {
                var request = new sdk.Request({
                    url: 'http://postman-echo.com/post',
                    method: 'POST'
                });

                expect(requesterCore.getRequestOptions(request, {})).to.have.nested.property('url.href',
                    'http://postman-echo.com/post');
            });

            it('should accept URL in mixed case : Http:// ..', function () {
                var request = new sdk.Request({
                    url: 'Http://postman-echo.com/post',
                    method: 'POST'
                });

                expect(requesterCore.getRequestOptions(request, {})).to.have.nested.property('url.href',
                    'http://postman-echo.com/post');
            });

            it('should accept URL in mixed case : HtTp:// ..', function () {
                var request = new sdk.Request({
                    url: 'HtTp://postman-echo.com/post',
                    method: 'POST'
                });

                expect(requesterCore.getRequestOptions(request, {})).to.have.nested.property('url.href',
                    'http://postman-echo.com/post');
            });

            it('should accept secure http url in mixed case : HttPs:// ..', function () {
                var request = new sdk.Request({
                    url: 'HttPs://postman-echo.com',
                    method: 'GET'
                });

                expect(requesterCore.getRequestOptions(request, {})).to.have.nested.property('url.href',
                    'https://postman-echo.com/');
            });
        });

        it('should use custom URL parser when useWhatWGUrlParser is enabled', function () {
            var request = new sdk.Request({
                    url: 'http://postman-echo.com/get'
                }),
                requestOptions = requesterCore.getRequestOptions(request, {
                    useWhatWGUrlParser: true
                });

            expect(requestOptions.urlParser).to.be.an('object');
            expect(requestOptions.urlParser.parse).to.be.a('function');
            expect(requestOptions.urlParser.resolve).to.be.a('function');
        });

        it('should not use custom URL parser when useWhatWGUrlParser is disabled', function () {
            var request = new sdk.Request({
                    url: 'http://postman-echo.com/get'
                }),
                requestOptions = requesterCore.getRequestOptions(request, {
                    useWhatWGUrlParser: false
                });

            expect(requestOptions.urlParser).to.not.be.ok;
        });

        it('should override lookup function for localhost', function () {
            var request = new sdk.Request({
                url: 'http://localhost:8080/random/path'
            });

            expect(requesterCore.getRequestOptions(request, {}).lookup).to.be.a('function');
        });

        it('should override lookup function for *.localhost', function () {
            var request = new sdk.Request({
                url: 'http://subdomain.localhost:8080/random/path'
            });

            expect(requesterCore.getRequestOptions(request, {}).lookup).to.be.a('function');
        });

        it('should not override lookup function for *.localhost.com', function () {
            var request = new sdk.Request({
                url: 'http://subdomain.localhost.com:8080/random/path'
            });

            expect(requesterCore.getRequestOptions(request, {}).lookup).to.not.be.a('function');
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
                    removeRefererHeaderOnRedirect: false,
                    useWhatWGUrlParser: true
                },
                protocolProfileBehavior = {
                    strictSSL: false,
                    followRedirects: true,
                    followOriginalHttpMethod: true,
                    maxRedirects: 15,
                    removeRefererHeaderOnRedirect: true
                },
                requestOptions = requesterCore.getRequestOptions(request, defaultOptions, protocolProfileBehavior);

            expect(requestOptions).to.deep.include({
                headers: {
                    'User-Agent': 'PostmanRuntime/' + runtimeVersion,
                    Accept: '*/*',
                    'Accept-Encoding': 'gzip, deflate, br',
                    Connection: 'keep-alive',
                    Host: ''
                },
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
                extraCA: undefined,
                agentOptions: { keepAlive: undefined },
                time: undefined,
                verbose: undefined,
                disableUrlEncoding: true
            });

            expect(requestOptions).to.have.ownProperty('url');
            expect(requestOptions.url).to.nested.include({
                protocol: 'http:',
                slashes: true,
                auth: null,
                host: '',
                port: null,
                hostname: '',
                hash: null,
                search: null,
                query: null,
                pathname: '/',
                path: '/',
                href: 'http:///'
            });
        });

        describe('disableCookies option', function () {
            it('should set jar when disableCookies is not set (default behavior)', function () {
                var request = new sdk.Request({ url: 'https://postman-echo.com' }),
                    requestOptions = requesterCore.getRequestOptions(request, {});

                expect(requestOptions).to.have.property('jar', true);
            });

            it('should set jar when requester disableCookies is false', function () {
                var request = new sdk.Request({ url: 'https://postman-echo.com' }),
                    defaultOptions = { disableCookies: false },
                    requestOptions = requesterCore.getRequestOptions(request, defaultOptions);

                expect(requestOptions).to.have.property('jar', true);
            });

            it('should not set jar when requester disableCookies is true', function () {
                var request = new sdk.Request({ url: 'https://postman-echo.com' }),
                    defaultOptions = { disableCookies: true },
                    requestOptions = requesterCore.getRequestOptions(request, defaultOptions);

                expect(requestOptions).to.not.have.property('jar');
            });

            it('should not set jar when protocolProfileBehavior disableCookies is true', function () {
                var request = new sdk.Request({ url: 'https://postman-echo.com' }),
                    defaultOptions = { disableCookies: false },
                    protocolProfileBehavior = { disableCookies: true },
                    requestOptions = requesterCore.getRequestOptions(request, defaultOptions, protocolProfileBehavior);

                expect(requestOptions).to.not.have.property('jar');
            });

            it('should set jar when protocolProfileBehavior disableCookies is false', function () {
                var request = new sdk.Request({ url: 'https://postman-echo.com' }),
                    defaultOptions = { disableCookies: true },
                    protocolProfileBehavior = { disableCookies: false },
                    requestOptions = requesterCore.getRequestOptions(request, defaultOptions, protocolProfileBehavior);

                expect(requestOptions).to.have.property('jar', true);
            });

            it('should prioritize protocolProfileBehavior over requester default (override to enable)', function () {
                var request = new sdk.Request({ url: 'https://postman-echo.com' }),
                    defaultOptions = { disableCookies: true },
                    protocolProfileBehavior = { disableCookies: false },
                    requestOptions = requesterCore.getRequestOptions(request, defaultOptions, protocolProfileBehavior);

                expect(requestOptions).to.have.property('jar', true);
            });

            it('should prioritize protocolProfileBehavior over requester default (override to disable)', function () {
                var request = new sdk.Request({ url: 'https://postman-echo.com' }),
                    defaultOptions = { disableCookies: false },
                    protocolProfileBehavior = { disableCookies: true },
                    requestOptions = requesterCore.getRequestOptions(request, defaultOptions, protocolProfileBehavior);

                expect(requestOptions).to.not.have.property('jar');
            });

            it('should use requester disableCookies when protocolProfileBehavior is undefined', function () {
                var request = new sdk.Request({ url: 'https://postman-echo.com' }),
                    defaultOptions = { disableCookies: true },
                    protocolProfileBehavior = {},
                    requestOptions = requesterCore.getRequestOptions(request, defaultOptions, protocolProfileBehavior);

                expect(requestOptions).to.not.have.property('jar');
            });

            it('should use cookieJar from defaultOptions when cookies are enabled', function () {
                var request = new sdk.Request({ url: 'https://postman-echo.com' }),
                    cookieJar = { fake: 'jar' },
                    defaultOptions = { disableCookies: false, cookieJar: cookieJar },
                    requestOptions = requesterCore.getRequestOptions(request, defaultOptions);

                expect(requestOptions).to.have.property('jar', cookieJar);
            });
        });
    });

    describe('.getRequestBody', function () {
        it('should correctly handle empty bodies', function () {
            var request = new sdk.Request({
                url: 'postman-echo.com/post',
                method: 'POST',
                body: { mode: 'formdata' }
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
                formData: [{ key: 'foo', value: 'bar' }]
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
                        { key: 'alpha', value: 'foo', type: 'text' },
                        { key: 'beta', value: 'bar', type: 'text' },
                        { key: 'gamma', value: 'baz', type: 'text', disabled: true },
                        { key: 'alpha', value: 'other', type: 'text' },
                        { key: 'alpha', value: 'next', type: 'text' }
                    ]
                }
            });

            expect(requesterCore.getRequestBody(request)).to.eql({
                form: { alpha: ['foo', 'other', 'next'], beta: 'bar' }
            });
        });

        it('should handle form data request bodies correctly', function () {
            var request = new sdk.Request({
                url: 'postman-echo.com/post',
                method: 'POST',
                body: {
                    mode: 'formdata',
                    formdata: [
                        { key: 'alpha', value: 'foo', type: 'text' },
                        { key: 'beta', value: 'bar', type: 'text' },
                        { key: 'gamma', value: 'baz', type: 'text', disabled: true },
                        { key: 'alpha', value: 'other', type: 'text' },
                        { key: 'alpha', value: 'next', type: 'text' }
                    ]
                }
            });

            expect(requesterCore.getRequestBody(request)).to.eql({
                formData: [
                    { key: 'alpha', value: 'foo' },
                    { key: 'beta', value: 'bar' },
                    { key: 'alpha', value: 'other' },
                    { key: 'alpha', value: 'next' }
                ]
            });
        });

        it('should handle file based request bodies correctly', function () {
            var request = new sdk.Request({
                url: 'postman-echo.com/post',
                method: 'POST',
                body: {
                    mode: 'file',
                    file: { src: 'random.txt' }
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

        describe('with raw mode body options', function () {
            it('should not set Content-Type if data is not present', function () {
                var request = new sdk.Request({
                    url: 'postman-echo.com/post',
                    method: 'POST',
                    body: {
                        mode: 'raw',
                        options: {
                            raw: {
                                language: 'text'
                            }
                        }
                    }
                });

                // calling `getRequestBody` will set headers if needed.
                expect(requesterCore.getRequestBody(request)).to.be.undefined;
                expect(request.headers.has('Content-Type')).to.be.false;
            });

            it('should set Content-Type if data is present', function () {
                var request = new sdk.Request({
                    url: 'postman-echo.com/post',
                    method: 'POST',
                    body: {
                        mode: 'raw',
                        raw: '{"beta":"bar"}',
                        options: {
                            raw: {
                                language: 'json'
                            }
                        }
                    }
                });

                expect(request.headers.has('Content-Type')).to.be.false;
                expect(requesterCore.getRequestBody(request)).to.eql({ body: '{"beta":"bar"}' });
                expect(request.headers.has('Content-Type')).to.be.true;
                expect(request.headers.toJSON()).to.deep.include({
                    key: 'Content-Type',
                    value: 'application/json',
                    system: true
                });
            });

            it('should set `text/plain` by default', function () {
                var request = new sdk.Request({
                    url: 'postman-echo.com/post',
                    method: 'POST',
                    body: {
                        mode: 'raw',
                        raw: '{"beta":"bar"}'
                    }
                });

                expect(request.headers.has('Content-Type')).to.be.false;
                expect(requesterCore.getRequestBody(request)).to.eql({ body: '{"beta":"bar"}' });
                expect(request.headers.toJSON()).to.deep.include({
                    key: 'Content-Type',
                    value: 'text/plain',
                    system: true
                });
            });

            it('should handle invalid `language` type', function () {
                var request = new sdk.Request({
                    url: 'postman-echo.com/post',
                    method: 'POST',
                    body: {
                        mode: 'raw',
                        raw: '{"beta":"bar"}',
                        options: {
                            raw: {
                                language: 'something'
                            }
                        }
                    }
                });

                expect(request.headers.has('Content-Type')).to.be.false;
                expect(requesterCore.getRequestBody(request)).to.eql({ body: '{"beta":"bar"}' });
                expect(request.headers.toJSON()).to.deep.include({
                    key: 'Content-Type',
                    value: 'text/plain',
                    system: true
                });

                request = new sdk.Request({
                    url: 'postman-echo.com/post',
                    method: 'POST',
                    body: {
                        mode: 'raw',
                        raw: '{"beta":"foo"}',
                        options: {
                            raw: {
                                language: undefined
                            }
                        }
                    }
                });

                expect(request.headers.has('Content-Type')).to.be.false;
                expect(requesterCore.getRequestBody(request)).to.eql({ body: '{"beta":"foo"}' });
                expect(request.headers.toJSON()).to.deep.include({
                    key: 'Content-Type',
                    value: 'text/plain',
                    system: true
                });
            });

            it('should not override Content-Type if present already', function () {
                var request = new sdk.Request({
                    url: 'postman-echo.com/post',
                    header: [{
                        key: 'Content-Type',
                        value: 'application/xml'
                    }],
                    method: 'POST',
                    body: {
                        mode: 'raw',
                        raw: '{"beta":"bar"}',
                        options: {
                            raw: {
                                language: 'json'
                            }
                        }
                    }
                });

                expect(requesterCore.getRequestBody(request)).to.eql({ body: '{"beta":"bar"}' });
                expect(request.headers.toJSON()).to.deep.include({ key: 'Content-Type', value: 'application/xml' });
            });
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
                    formData: [{ key: 'foo', value: 'bar' }]
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
                    formData: [{ key: 'foo', value: 'bar' }]
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
                    formData: [{ key: 'foo', value: 'bar' }]
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
                                { key: 'constructor', value: 'builds away!' },
                                { key: 'foo', value: 'bar' }
                            ]
                        }
                    });

                    expect(requesterCore.getRequestBody(request)).to.eql({
                        formData: [
                            { key: 'constructor', value: 'builds away!' },
                            { key: 'foo', value: 'bar' }
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
                                { key: 'constructor', value: 'I\'ll be back' },
                                { key: 'constructor', value: 'Come with me if you want to live!' },
                                { key: 'foo', value: 'bar' }
                            ]
                        }
                    });

                    expect(requesterCore.getRequestBody(request)).to.eql({
                        formData: [
                            { key: 'constructor', value: 'I\'ll be back' },
                            { key: 'constructor', value: 'Come with me if you want to live!' },
                            { key: 'foo', value: 'bar' }
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
                                { key: 'constructor', value: 'builds away!' },
                                { key: 'foo', value: 'bar' }
                            ]
                        }
                    });

                    expect(requesterCore.getRequestBody(request)).to.eql({
                        form: { constructor: 'builds away!', foo: 'bar' }
                    });
                });

                it('should handle request bodies with multiple whitelisted special keywords correctly', function () {
                    var request = new sdk.Request({
                        url: 'postman-echo.com/post',
                        method: 'POST',
                        body: {
                            mode: 'urlencoded',
                            urlencoded: [
                                { key: 'constructor', value: 'I\'ll be back' },
                                { key: 'constructor', value: 'Come with me if you want to live!' },
                                { key: 'foo', value: 'bar' }
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
                        options: { contentType: 'application/json' }
                    }, {
                        key: 'userFile',
                        value: '',
                        options: { contentType: 'application/json', filename: '' }
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

                    expect(requestBody.formData).to.eql([{ key: 'foo', value: 'bar' }]);
                });

                it('should support custom fileName', function () {
                    var request = new sdk.Request({
                            url: 'postman-echo.com/post',
                            method: 'POST',
                            body: {
                                mode: 'formdata',
                                formdata: [{
                                    key: 'foo',
                                    value: 'bar',
                                    fileName: 'file.json',
                                    type: 'text'
                                }]
                            }
                        }),
                        requestBody = requesterCore.getRequestBody(request);

                    expect(requestBody.formData).to.eql([{
                        key: 'foo',
                        value: 'bar',
                        options: { filename: 'file.json' }
                    }]);
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

            expect(obj).to.eql({ a: 'b', c: 'd' });
        });

        it('should correctly handle multi valued keys', function () {
            var obj = requesterCore.arrayPairsToObject(['a', 'b', 'c', 'd', 'a', 'e']);

            expect(obj).to.eql({ a: ['b', 'e'], c: 'd' });
        });
    });

    describe('.getRequestOptions - redirect listener', function () {
        it('should attach a bindOn.redirect listener when restrictedAddresses is set', function () {
            var request = new sdk.Request({ url: 'http://postman-echo.com/get' }),
                options = {
                    network: {
                        restrictedAddresses: { '127.0.0.1': true }
                    }
                },
                reqOptions = requesterCore.getRequestOptions(request, options);

            expect(reqOptions.bindOn).to.be.an('object');
            expect(reqOptions.bindOn.redirect).to.be.an('array').with.lengthOf(1);
            expect(reqOptions.bindOn.redirect[0]).to.be.a('function');
        });

        it('should not attach bindOn when restrictedAddresses is absent', function () {
            var request = new sdk.Request({ url: 'http://postman-echo.com/get' }),
                reqOptions = requesterCore.getRequestOptions(request, {});

            expect(reqOptions).to.not.have.nested.property('bindOn.redirect');
        });

        it('bindOn.redirect should abort and emit error for a restricted raw IP', function () {
            var request = new sdk.Request({ url: 'http://postman-echo.com/get' }),
                networkOpts = {
                    restrictedAddresses: { '127.0.0.2': true },
                    restrictedCidrs: []
                },
                reqOptions = requesterCore.getRequestOptions(request, { network: networkOpts }),
                aborted = false,
                emittedError = null,
                fakeRequest = {
                    uri: { hostname: '127.0.0.2' },
                    abort: function () { aborted = true; },
                    emit: function (evt, err) { if (evt === 'error') { emittedError = err; } }
                };

            reqOptions.bindOn.redirect[0].call(fakeRequest);

            expect(aborted).to.be.true;
            expect(emittedError).to.be.an('error');
            expect(emittedError.message).to.include('NETERR:');
            expect(emittedError.message).to.include('127.0.0.2');
        });

        it('bindOn.redirect should not abort for a non-restricted raw IP', function () {
            var request = new sdk.Request({ url: 'http://postman-echo.com/get' }),
                networkOpts = {
                    restrictedAddresses: { '127.0.0.2': true },
                    restrictedCidrs: []
                },
                reqOptions = requesterCore.getRequestOptions(request, { network: networkOpts }),
                aborted = false,
                fakeRequest = {
                    uri: { hostname: '8.8.8.8' },
                    abort: function () { aborted = true; },
                    emit: function () { /* noop */ }
                };

            reqOptions.bindOn.redirect[0].call(fakeRequest);

            expect(aborted).to.be.false;
        });

        it('bindOn.redirect should not abort for a hostname not in restrictedAddresses', function () {
            var request = new sdk.Request({ url: 'http://postman-echo.com/get' }),
                networkOpts = {
                    restrictedAddresses: { '127.0.0.1': true }
                },
                reqOptions = requesterCore.getRequestOptions(request, { network: networkOpts }),
                aborted = false,
                fakeRequest = {
                    uri: { hostname: 'postman-echo.com' },
                    abort: function () { aborted = true; },
                    emit: function () { /* noop */ }
                };

            reqOptions.bindOn.redirect[0].call(fakeRequest);

            // postman-echo.com is not in restrictedAddresses — DNS hook handles resolution
            expect(aborted).to.be.false;
        });

        it('bindOn.redirect should block a redirect to a hostname listed in restrictedAddresses', function () {
            var request = new sdk.Request({ url: 'http://postman-echo.com/get' }),
                networkOpts = {
                    restrictedAddresses: { 'internal.corp': true }
                },
                reqOptions = requesterCore.getRequestOptions(request, { network: networkOpts }),
                aborted = false,
                emittedError = null,
                fakeRequest = {
                    uri: { hostname: 'internal.corp' },
                    abort: function () { aborted = true; },
                    emit: function (evt, err) { if (evt === 'error') { emittedError = err; } }
                };

            reqOptions.bindOn.redirect[0].call(fakeRequest);

            expect(aborted).to.be.true;
            expect(emittedError).to.be.an('error');
            expect(emittedError.message).to.include('internal.corp');
        });

        it('bindOn.redirect should block a bracketed IPv6 redirect target', function () {
            var request = new sdk.Request({ url: 'http://postman-echo.com/get' }),
                networkOpts = {
                    restrictedAddresses: { '::1': true }
                },
                reqOptions = requesterCore.getRequestOptions(request, { network: networkOpts }),
                aborted = false,
                emittedError = null,
                fakeRequest = {
                    uri: { hostname: '[::1]' },
                    abort: function () { aborted = true; },
                    emit: function (evt, err) { if (evt === 'error') { emittedError = err; } }
                };

            reqOptions.bindOn.redirect[0].call(fakeRequest);

            expect(aborted).to.be.true;
            expect(emittedError).to.be.an('error');
            expect(emittedError.message).to.include('[::1]');
        });

        it('bindOn.redirect should block an IP within a restricted CIDR range', function () {
            var ipaddr = require('ipaddr.js'),
                request = new sdk.Request({ url: 'http://postman-echo.com/get' }),
                networkOpts = {
                    restrictedAddresses: { '10.0.0.0/8': true },
                    restrictedCidrs: [ipaddr.parseCIDR('10.0.0.0/8')]
                },
                reqOptions = requesterCore.getRequestOptions(request, { network: networkOpts }),
                aborted = false,
                emittedError = null,
                fakeRequest = {
                    uri: { hostname: '10.10.10.10' },
                    abort: function () { aborted = true; },
                    emit: function (evt, err) { if (evt === 'error') { emittedError = err; } }
                };

            reqOptions.bindOn.redirect[0].call(fakeRequest);

            expect(aborted).to.be.true;
            expect(emittedError).to.be.an('error');
            expect(emittedError.message).to.include('10.10.10.10');
        });

        it('bindOn.redirect should not emit error again once the request is already aborted', function () {
            // postman-request re-binds bindOn listeners on every redirect hop, so a
            // restricted target reached after a prior hop can fire the listener twice;
            // the second invocation must be a no-op to avoid a duplicate `error` event
            var request = new sdk.Request({ url: 'http://postman-echo.com/get' }),
                networkOpts = {
                    restrictedAddresses: { '127.0.0.2': true },
                    restrictedCidrs: []
                },
                reqOptions = requesterCore.getRequestOptions(request, { network: networkOpts }),
                errorEmitCount = 0,
                fakeRequest = {
                    uri: { hostname: '127.0.0.2' },
                    _aborted: false,
                    abort: function () { this._aborted = true; },
                    emit: function (evt) { if (evt === 'error') { errorEmitCount += 1; } }
                };

            reqOptions.bindOn.redirect[0].call(fakeRequest);
            // simulate a second (duplicate) listener firing on the same hop
            reqOptions.bindOn.redirect[0].call(fakeRequest);

            expect(fakeRequest._aborted).to.be.true;
            expect(errorEmitCount).to.equal(1);
        });
    });

    describe('.isAddressRestricted', function () {
        describe('exact match (existing behaviour)', function () {
            it('should return true for an exactly listed IPv4 address', function () {
                expect(requesterCore.isAddressRestricted('169.254.169.254', {
                    restrictedAddresses: { '169.254.169.254': true }
                })).to.be.true;
            });

            it('should return false for an IP not in the list', function () {
                expect(requesterCore.isAddressRestricted('1.2.3.4', {
                    restrictedAddresses: { '169.254.169.254': true }
                })).to.be.false;
            });

            it('should return false when restrictedAddresses is empty', function () {
                expect(requesterCore.isAddressRestricted('127.0.0.1', {
                    restrictedAddresses: {}
                })).to.be.false;
            });

            it('should return false when host is falsy', function () {
                expect(requesterCore.isAddressRestricted(null, {
                    restrictedAddresses: { '127.0.0.1': true }
                })).to.be.false;
            });
        });

        describe('CIDR range matching', function () {
            var ipv4CidrOpts;

            before(function () {
                var ipaddr = require('ipaddr.js');

                ipv4CidrOpts = {
                    restrictedAddresses: { '127.0.0.0/8': true },
                    restrictedCidrs: [ipaddr.parseCIDR('127.0.0.0/8')]
                };
            });

            it('should block the first IP in an IPv4 CIDR range', function () {
                expect(requesterCore.isAddressRestricted('127.0.0.0', ipv4CidrOpts)).to.be.true;
            });

            it('should block an IP in the middle of an IPv4 CIDR range', function () {
                expect(requesterCore.isAddressRestricted('127.1.2.3', ipv4CidrOpts)).to.be.true;
            });

            it('should block the last IP in an IPv4 CIDR range', function () {
                expect(requesterCore.isAddressRestricted('127.255.255.255', ipv4CidrOpts)).to.be.true;
            });

            it('should not block an IP just outside an IPv4 CIDR range', function () {
                expect(requesterCore.isAddressRestricted('128.0.0.0', ipv4CidrOpts)).to.be.false;
            });

            it('should block an IPv6 address matching an exact /128 CIDR', function () {
                var ipaddr = require('ipaddr.js'),
                    opts = {
                        restrictedAddresses: { '::1/128': true },
                        restrictedCidrs: [ipaddr.parseCIDR('::1/128')]
                    };

                expect(requesterCore.isAddressRestricted('::1', opts)).to.be.true;
            });

            it('should block an IPv6 address within a /7 CIDR range', function () {
                var ipaddr = require('ipaddr.js'),
                    opts = {
                        restrictedAddresses: { 'fc00::/7': true },
                        restrictedCidrs: [ipaddr.parseCIDR('fc00::/7')]
                    };

                expect(requesterCore.isAddressRestricted('fc00::1', opts)).to.be.true;
            });

            it('should not block an IPv6 address outside a CIDR range', function () {
                var ipaddr = require('ipaddr.js'),
                    opts = {
                        restrictedAddresses: { '::1/128': true },
                        restrictedCidrs: [ipaddr.parseCIDR('::1/128')]
                    };

                expect(requesterCore.isAddressRestricted('::2', opts)).to.be.false;
            });

            it('should not throw for a hostname string passed through the CIDR path', function () {
                var ipaddr = require('ipaddr.js'),
                    opts = {
                        restrictedAddresses: {},
                        restrictedCidrs: [ipaddr.parseCIDR('127.0.0.0/8')]
                    };

                expect(requesterCore.isAddressRestricted('postman-echo.com', opts)).to.be.false;
            });

            it('should honour exact-match entries alongside CIDR entries', function () {
                var ipaddr = require('ipaddr.js'),
                    opts = {
                        restrictedAddresses: { '169.254.169.254': true, '10.0.0.0/8': true },
                        restrictedCidrs: [ipaddr.parseCIDR('10.0.0.0/8')]
                    };

                expect(requesterCore.isAddressRestricted('169.254.169.254', opts)).to.be.true;
                expect(requesterCore.isAddressRestricted('10.10.10.10', opts)).to.be.true;
                expect(requesterCore.isAddressRestricted('192.168.1.1', opts)).to.be.false;
            });

            it('should block an IPv4-mapped IPv6 address that falls within a blocked IPv4 CIDR', function () {
                var ipaddr = require('ipaddr.js'),
                    opts = {
                        restrictedAddresses: { '127.0.0.0/8': true },
                        restrictedCidrs: [ipaddr.parseCIDR('127.0.0.0/8')]
                    };

                // ::ffff:127.0.0.1 is the IPv4-mapped IPv6 form of 127.0.0.1
                expect(requesterCore.isAddressRestricted('::ffff:127.0.0.1', opts)).to.be.true;
                expect(requesterCore.isAddressRestricted('::ffff:169.254.169.254', {
                    restrictedAddresses: { '169.254.0.0/16': true },
                    restrictedCidrs: [ipaddr.parseCIDR('169.254.0.0/16')]
                })).to.be.true;
            });

            it('should evaluate all CIDRs in a mixed IPv4+IPv6 list without aborting on family mismatch', function () {
                var ipaddr = require('ipaddr.js'),
                    opts = {
                        restrictedAddresses: { '127.0.0.0/8': true, '::1/128': true },
                        restrictedCidrs: [ipaddr.parseCIDR('127.0.0.0/8'), ipaddr.parseCIDR('::1/128')]
                    };

                // IPv6 address must be matched even though an IPv4 CIDR comes first in the list
                expect(requesterCore.isAddressRestricted('::1', opts)).to.be.true;
                // IPv4 address must be matched even though an IPv6 CIDR follows
                expect(requesterCore.isAddressRestricted('127.0.0.1', opts)).to.be.true;
            });
        });

        describe('bracketed IPv6 literals (B2/B3a)', function () {
            it('should block [::1] when ::1 is in restrictedAddresses', function () {
                expect(requesterCore.isAddressRestricted('[::1]', {
                    restrictedAddresses: { '::1': true }
                })).to.be.true;
            });

            it('should block ::1 when [::1] is in restrictedAddresses', function () {
                expect(requesterCore.isAddressRestricted('::1', {
                    restrictedAddresses: { '[::1]': true }
                })).to.be.true;
            });

            it('should block [::1] when [::1] is in restrictedAddresses', function () {
                expect(requesterCore.isAddressRestricted('[::1]', {
                    restrictedAddresses: { '[::1]': true }
                })).to.be.true;
            });

            it('should block [::ffff:127.0.0.1] via a 127.0.0.0/8 CIDR', function () {
                expect(requesterCore.isAddressRestricted('[::ffff:127.0.0.1]', {
                    restrictedAddresses: { '127.0.0.0/8': true }
                })).to.be.true;
            });
        });

        describe('IPv4-compatible IPv6 (::a.b.c.d)', function () {
            it('should block ::127.0.0.1 via a 127.0.0.0/8 CIDR', function () {
                expect(requesterCore.isAddressRestricted('::127.0.0.1', {
                    restrictedAddresses: { '127.0.0.0/8': true }
                })).to.be.true;
            });

            it('should block ::169.254.169.254 via a 169.254.0.0/16 CIDR', function () {
                expect(requesterCore.isAddressRestricted('::169.254.169.254', {
                    restrictedAddresses: { '169.254.0.0/16': true }
                })).to.be.true;
            });

            it('should not match ::1 against an unrelated IPv4 CIDR (no dotted quad)', function () {
                // ::1 has no dotted quad, so it is treated as the IPv6 loopback, not 0.0.0.1
                expect(requesterCore.isAddressRestricted('::1', {
                    restrictedAddresses: { '127.0.0.0/8': true }
                })).to.be.false;
            });

            it('should block ::0.x.x.x (leading-zero embedded IPv4) via a 0.0.0.0/8 CIDR', function () {
                // regression: a leading-zero octet must not be skipped, else 0.0.0.0/8 is bypassable
                expect(requesterCore.isAddressRestricted('::0.127.0.1', {
                    restrictedAddresses: { '0.0.0.0/8': true }
                })).to.be.true;
            });

            it('should block ::0.0.0.1 via a 0.0.0.0/8 CIDR', function () {
                expect(requesterCore.isAddressRestricted('::0.0.0.1', {
                    restrictedAddresses: { '0.0.0.0/8': true }
                })).to.be.true;
            });
        });

        describe('NAT64-embedded IPv4 (64:ff9b::/96, RFC 6052)', function () {
            it('should block a NAT64 address whose embedded IPv4 falls within a blocked IPv4 CIDR', function () {
                // 64:ff9b::7f00:1 embeds 127.0.0.1
                expect(requesterCore.isAddressRestricted('64:ff9b::7f00:1', {
                    restrictedAddresses: { '127.0.0.0/8': true }
                })).to.be.true;
            });

            it('should block a NAT64 address for a link-local IPv4 (169.254.x.x)', function () {
                // 64:ff9b::a9fe:a9fe embeds 169.254.169.254
                expect(requesterCore.isAddressRestricted('64:ff9b::a9fe:a9fe', {
                    restrictedAddresses: { '169.254.0.0/16': true }
                })).to.be.true;
            });

            it('should not block a NAT64 address whose embedded IPv4 is outside all denied CIDRs', function () {
                // 64:ff9b::808:808 embeds 8.8.8.8 — not in 127.0.0.0/8
                expect(requesterCore.isAddressRestricted('64:ff9b::808:808', {
                    restrictedAddresses: { '127.0.0.0/8': true }
                })).to.be.false;
            });

            it('should block a bracketed NAT64 address', function () {
                expect(requesterCore.isAddressRestricted('[64:ff9b::7f00:1]', {
                    restrictedAddresses: { '127.0.0.0/8': true }
                })).to.be.true;
            });
        });

        describe('IPv4-translated (::ffff:0:x.x.x.x, RFC 6145)', function () {
            it('should block an IPv4-translated address within a blocked IPv4 CIDR', function () {
                // ::ffff:0:7f00:1 embeds 127.0.0.1
                expect(requesterCore.isAddressRestricted('::ffff:0:7f00:1', {
                    restrictedAddresses: { '127.0.0.0/8': true }
                })).to.be.true;
            });

            it('should block an IPv4-translated address for a link-local IPv4', function () {
                // ::ffff:0:a9fe:a9fe embeds 169.254.169.254
                expect(requesterCore.isAddressRestricted('::ffff:0:a9fe:a9fe', {
                    restrictedAddresses: { '169.254.0.0/16': true }
                })).to.be.true;
            });

            it('should not block an IPv4-translated address outside all denied CIDRs', function () {
                expect(requesterCore.isAddressRestricted('::ffff:0:808:808', {
                    restrictedAddresses: { '127.0.0.0/8': true }
                })).to.be.false;
            });
        });

        describe('6to4 (2002::/16, RFC 3056)', function () {
            it('should block a 6to4 address whose embedded IPv4 falls within a blocked IPv4 CIDR', function () {
                // 2002:7f00:0001:: embeds 127.0.0.1
                expect(requesterCore.isAddressRestricted('2002:7f00:1::', {
                    restrictedAddresses: { '127.0.0.0/8': true }
                })).to.be.true;
            });

            it('should block a 6to4 address for a link-local IPv4', function () {
                // 2002:a9fe:a9fe:: embeds 169.254.169.254
                expect(requesterCore.isAddressRestricted('2002:a9fe:a9fe::', {
                    restrictedAddresses: { '169.254.0.0/16': true }
                })).to.be.true;
            });

            it('should not block a 6to4 address whose embedded IPv4 is outside all denied CIDRs', function () {
                // 2002:0808:0808:: embeds 8.8.8.8 — not in 127.0.0.0/8
                expect(requesterCore.isAddressRestricted('2002:808:808::', {
                    restrictedAddresses: { '127.0.0.0/8': true }
                })).to.be.false;
            });

            it('should block a bracketed 6to4 address', function () {
                expect(requesterCore.isAddressRestricted('[2002:7f00:1::]', {
                    restrictedAddresses: { '127.0.0.0/8': true }
                })).to.be.true;
            });
        });

        describe('lazy CIDR init (N2)', function () {
            it('should parse CIDR entries from restrictedAddresses without a pre-set restrictedCidrs', function () {
                var opts = {
                    restrictedAddresses: { '10.0.0.0/8': true }
                };

                expect(requesterCore.isAddressRestricted('10.10.10.10', opts)).to.be.true;
                expect(requesterCore.isAddressRestricted('11.0.0.0', opts)).to.be.false;
            });

            it('should cache parsed CIDRs on networkOptions after first call', function () {
                var opts = {
                    restrictedAddresses: { '10.0.0.0/8': true }
                };

                requesterCore.isAddressRestricted('10.0.0.1', opts);
                expect(opts.restrictedCidrs).to.be.an('array').with.lengthOf(1);
            });

            it('should handle an invalid CIDR entry without throwing', function () {
                var opts = {
                    restrictedAddresses: { 'not-a-cidr/99': true }
                };

                expect(function () {
                    requesterCore.isAddressRestricted('1.2.3.4', opts);
                }).to.not.throw();
                expect(opts.restrictedCidrs).to.be.an('array').with.lengthOf(0);
            });
        });

        describe('hostname pre-check and verdict cache', function () {
            var ipaddr = require('ipaddr.js'),
                sinon = require('sinon'),
                POLICY = {
                    localhost: true,
                    127.1: true,
                    '::1': true,
                    '[::1]': true,
                    '127.0.0.0/8': true,
                    '0.0.0.0/8': true,
                    '::1/128': true,
                    'fe80::/10': true,
                    '169.254.0.0/16': true,
                    '10.0.0.0/8': true,
                    '172.16.0.0/12': true,
                    '192.168.0.0/16': true,
                    'fc00::/7': true
                },
                // verdicts recorded from the implementation before the pre-check and cache were added
                BLOCKED = [
                    'localhost', 'LOCALHOST', '127.0.0.1', '127.1', '0x7f.0.0.1', '0177.0.0.1', '2130706433',
                    '0x7f000001', '10.1.2.3', '192.168.1.5', '169.254.169.254', '::1', '[::1]',
                    '::ffff:127.0.0.1', '[::ffff:10.0.0.1]', '::10.0.0.1', '64:ff9b::a9fe:a9fe',
                    '2002:a9fe:a9fe::', 'fe80::1', 'fe80::1%eth0', 'fc00::1'
                ],
                ALLOWED = [
                    'example.com', 'EXAMPLE.COM', 'example.com.', 'localhost.example.com', 'postman-echo.com',
                    'k8s-gotunabl-4726ea8024.elb.us-east-1.amazonaws.com', '93.184.216.34', '8.8.8.8',
                    '2001:4860:4860::8888', 'cafe.babe', 'deadbeef', 'abc', 'a.b.c.d', '127.0.0.1.', 'x'
                ],
                // hostnames that contain characters no IP literal can have ('x', 'cafe.babe' and
                // 'deadbeef' only use IP-literal characters, so they stay on the full path)
                NAMES = ['example.com', 'EXAMPLE.COM', 'example.com.', 'localhost.example.com', 'postman-echo.com',
                    'k8s-gotunabl-4726ea8024.elb.us-east-1.amazonaws.com'],
                processSpy;

            function freshOpts () {
                return { restrictedAddresses: { ...POLICY } };
            }

            beforeEach(function () {
                processSpy = sinon.spy(ipaddr, 'process');
            });

            afterEach(function () {
                processSpy.restore();
            });

            it('should keep every blocked verdict unchanged', function () {
                BLOCKED.forEach(function (host) {
                    expect(requesterCore.isAddressRestricted(host, freshOpts()), host).to.be.true;
                });
            });

            it('should keep every allowed verdict unchanged', function () {
                ALLOWED.forEach(function (host) {
                    expect(requesterCore.isAddressRestricted(host, freshOpts()), host).to.be.false;
                });
            });

            it('should give the same verdicts on a repeat call with the same networkOptions', function () {
                var opts = freshOpts();

                BLOCKED.concat(ALLOWED).forEach(function (host) {
                    var first = requesterCore.isAddressRestricted(host, opts);

                    expect(requesterCore.isAddressRestricted(host, opts), host).to.equal(first);
                });
            });

            it('should not try to parse a hostname as an IP address', function () {
                NAMES.forEach(function (host) {
                    expect(requesterCore.isAddressRestricted(host, freshOpts()), host).to.be.false;
                });
                expect(processSpy.callCount).to.equal(0);
            });

            it('should still check a listed name before the pre-check', function () {
                expect(requesterCore.isAddressRestricted('localhost', freshOpts())).to.be.true;
                expect(requesterCore.isAddressRestricted('LocalHost', freshOpts())).to.be.true;
            });

            it('should still parse anything shaped like an IP address', function () {
                // none of these are exact entries in POLICY, so each must reach the parser
                ['127.0.0.1', '0x7f.0.0.1', '0177.0.0.1', '2130706433', '10.1', '::2', 'fe80::1%eth0',
                    '93.184.216.34', 'cafe.babe', 'deadbeef', '127.0.0.1.'].forEach(function (host) {
                    processSpy.resetHistory();
                    requesterCore.isAddressRestricted(host, freshOpts());
                    expect(processSpy.callCount, host).to.be.at.least(1);
                });
            });

            // the pre-check is only safe while every colon-free string ipaddr.js accepts stays inside
            // [0-9a-fx.]; this fails if an ipaddr.js upgrade widens that set (e.g. '0o' octal parts)
            it('should send every colon-free string ipaddr.js accepts to the parser', function () {
                var seed = 1571,
                    PART_PREFIXES = ['', '', '0', '0x', '0o', '0b', '0d', '+', '-', '00x', '0x0'],
                    PART_CHARS = '0123456789abcdefxobdghnz_%-+ ',
                    JUNK = ['', '', '', '.', '%eth0', '%0', '/8', ' ', '..', 'e1', 'n'],
                    checked = 0,
                    host,
                    i;

                // seeded so a failure reproduces
                function rand (n) {
                    seed = (Math.imul(seed, 1103515245) + 12345) >>> 0;

                    return (seed >>> 16) % n;
                }

                function randomHost () {
                    var parts = [],
                        count = 1 + rand(4),
                        part,
                        j,
                        k;

                    for (j = 0; j < count; j++) {
                        part = PART_PREFIXES[rand(PART_PREFIXES.length)];
                        for (k = 1 + rand(4); k > 0; k--) {
                            part += rand(3) ? String(rand(10)) : PART_CHARS[rand(PART_CHARS.length)];
                        }
                        parts.push(part);
                    }

                    return parts.join('.') + JUNK[rand(JUNK.length)];
                }

                for (i = 0; i < 50000; i++) {
                    host = randomHost().toLowerCase();

                    if (ipaddr.isValid(host) && !host.includes(':')) {
                        checked++;
                        processSpy.resetHistory();
                        requesterCore.isAddressRestricted(host, { restrictedAddresses: { '169.254.0.0/16': true } });
                        expect(processSpy.callCount, host).to.be.at.least(1);
                    }
                }

                // guard against a generator that stops producing valid addresses
                expect(checked).to.be.above(1000);
            });

            it('should not parse the same address twice for the same networkOptions', function () {
                var opts = freshOpts();

                expect(requesterCore.isAddressRestricted('93.184.216.34', opts)).to.be.false;
                expect(requesterCore.isAddressRestricted('169.254.169.254', opts)).to.be.true;
                processSpy.resetHistory();

                expect(requesterCore.isAddressRestricted('93.184.216.34', opts)).to.be.false;
                expect(requesterCore.isAddressRestricted('169.254.169.254', opts)).to.be.true;
                expect(processSpy.callCount).to.equal(0);
            });

            it('should treat different spellings as separate entries', function () {
                var opts = freshOpts();

                expect(requesterCore.isAddressRestricted('example.com', opts)).to.be.false;
                expect(requesterCore.isAddressRestricted('[::1]', opts)).to.be.true;
                expect(requesterCore.isAddressRestricted('::1', opts)).to.be.true;
                expect(requesterCore.isAddressRestricted('0x7f.0.0.1', opts)).to.be.true;
            });

            it('should still block an address a name later resolves to (DNS rebinding)', function () {
                var opts = freshOpts();

                // Check A on the name, Check B on the first resolved address
                expect(requesterCore.isAddressRestricted('example.com', opts)).to.be.false;
                expect(requesterCore.isAddressRestricted('93.184.216.34', opts)).to.be.false;

                // DNS now answers with the metadata address: Check A on the name, Check B on the new address
                expect(requesterCore.isAddressRestricted('example.com', opts)).to.be.false;
                expect(requesterCore.isAddressRestricted('169.254.169.254', opts)).to.be.true;
            });

            it('should keep the cache bounded and correct after many distinct addresses', function () {
                var opts = freshOpts(),
                    i;

                for (i = 0; i < 1500; i++) {
                    expect(requesterCore.isAddressRestricted('8.8.' + Math.floor(i / 256) + '.' + (i % 256), opts))
                        .to.be.false;
                }

                expect(opts.restrictedVerdicts.size).to.be.at.most(1000);
                expect(requesterCore.isAddressRestricted('10.1.2.3', opts)).to.be.true;
                expect(requesterCore.isAddressRestricted('93.184.216.34', opts)).to.be.false;
            });

            it('should evict the least recently used entry, keeping recently used ones', function () {
                var opts = freshOpts(),
                    i;

                requesterCore.isAddressRestricted('93.184.216.34', opts);
                requesterCore.isAddressRestricted('10.1.2.3', opts);

                for (i = 0; i < 998; i++) {
                    requesterCore.isAddressRestricted('8.8.' + Math.floor(i / 256) + '.' + (i % 256), opts);
                }

                // cache is full; touch the oldest entry, then overflow by one
                expect(opts.restrictedVerdicts.size).to.equal(1000);
                requesterCore.isAddressRestricted('93.184.216.34', opts);
                requesterCore.isAddressRestricted('9.9.9.9', opts);

                expect(opts.restrictedVerdicts.size).to.equal(1000);
                expect(opts.restrictedVerdicts.has('93.184.216.34')).to.be.true;
                expect(opts.restrictedVerdicts.has('10.1.2.3')).to.be.false;
            });
        });
    });
});
