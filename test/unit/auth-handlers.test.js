var _ = require('lodash'),
    expect = require('expect.js'),
    aws4 = require('aws4'),
    sdk = require('postman-collection'),
    AuthLoader = require('../../lib/authorizer').AuthLoader,

    Request = sdk.Request,
    Url = sdk.Url,
    rawRequests = require('../fixtures/auth-requests');

/* global describe, it */
describe('Auth Handler:', function () {
    describe('noauth', function () {
        it('should work correctly', function () {
            var request = new Request({
                    auth: {
                        noauth: {},
                        type: 'noauth'
                    }
                }),
                auth = request.auth,
                handler = AuthLoader.getHandler(auth.type);

            handler.sign(auth, request, _.noop);

            expect(request).to.eql(request);
            auth.update({
                foo: 'bar'
            });

            handler.sign(auth, request, _.noop);
            expect(request.auth.parameters().toObject()).to.eql({
                foo: 'bar'
            });
        });
    });

    describe('basic', function () {
        it('Auth header must be added', function () {
            var request = new Request(rawRequests.basic),
                auth = request.auth,
                handler = AuthLoader.getHandler(auth.type),
                headers,
                authHeader;

            handler.sign(auth, request, _.noop);
            headers = request.headers.all();

            expect(headers.length).to.eql(1);

            authHeader = headers[0];
            expect(authHeader.toString()).to.eql('Authorization: Basic YWJoaWppdDprYW5l');
            expect(authHeader.system).to.be(true);
        });

        it('should bail out if username is missing', function () {
            var sansUserReq = _.omit(rawRequests.basic, 'auth.basic.username'),
                request = new Request(sansUserReq),
                auth = request.auth,
                handler = AuthLoader.getHandler(auth.type);

            handler.sign(auth, request, _.noop);

            expect(request.headers.all()).to.be.empty();
            expect(request.toJSON()).to.eql({
                auth: {
                    basic: [{
                        'key': 'password',
                        'type': 'any',
                        'value': 'kane'
                    },
                    {
                        'key': 'showPassword',
                        'type': 'any',
                        'value': false
                    }
                    ],
                    type: 'basic'
                },
                body: undefined,
                certificate: undefined,
                description: {
                    content: '',
                    type: 'text/plain'
                },
                header: undefined,
                method: 'GET',
                proxy: undefined,
                url: 'httpbin.org/get'
            });
        });
    });

    describe('digest', function () {
        it('Auth header must be added', function () {
            var request = new Request(rawRequests.digest),
                auth = request.auth,
                handler = AuthLoader.getHandler(auth.type),
                headers,
                expectedHeader,
                authHeader;

            handler.sign(auth, request, _.noop);
            headers = request.headers.all();
            expectedHeader = 'Authorization: Digest username="postman", realm="Users", ' +
                'nonce="bcgEc5RPU1ANglyT2I0ShU0oxqPB5jXp", uri="/digest-auth", ' +
                'response="63db383a0f03744cfd45fe15de8dbe9d", opaque=""';
            authHeader;

            expect(headers.length).to.eql(1);
            authHeader = headers[0];

            expect(authHeader.toString()).to.eql(expectedHeader);
            expect(authHeader.system).to.be(true);
        });

        it('should throw an error if qop is auth-int', function () {
            var request = new Request(rawRequests.digest),
                auth = request.auth,
                handler = AuthLoader.getHandler(auth.type),
                headers,
                expectedHeader,
                authHeader;

            handler.sign(auth, request, _.noop);
            headers = request.headers.all();
            expectedHeader = 'Authorization: Digest username="postman", realm="Users", ' +
                'nonce="bcgEc5RPU1ANglyT2I0ShU0oxqPB5jXp", uri="/digest-auth", ' +
                'response="63db383a0f03744cfd45fe15de8dbe9d", opaque=""';
            authHeader;

            expect(headers.length).to.eql(1);
            authHeader = headers[0];

            expect(authHeader.toString()).to.eql(expectedHeader);
            expect(authHeader.system).to.be(true);

            expect(function () {
                request.auth.digest.sign({
                    algorithm: 'MD5-sess',
                    qop: 'auth-int'
                });
            }).to.throwError('Digest Auth with "qop": "auth-int" is not supported.');
        });

        it('should sign requests correctly', function () {
            var request = new Request(rawRequests.digest),
                auth = request.auth,
                handler = AuthLoader.getHandler(auth.type),
                headers,
                expectedHeader,
                authHeader;

            handler.sign(auth, request, _.noop);
            headers = request.headers.all();
            expectedHeader = 'Authorization: Digest username="postman", realm="Users", ' +
                'nonce="bcgEc5RPU1ANglyT2I0ShU0oxqPB5jXp", uri="/digest-auth", ' +
                'response="63db383a0f03744cfd45fe15de8dbe9d", opaque=""';
            authHeader;

            expect(headers.length).to.eql(1);
            authHeader = headers[0];

            expect(authHeader.toString()).to.eql(expectedHeader);
            expect(authHeader.system).to.be(true);
        });

        it('Auth header must have uri with query params in case of request with the same', function () {
            var request = new Request(rawRequests.digestWithQueryParams),
                auth = request.auth,
                handler = AuthLoader.getHandler(auth.type),
                authHeader,
                expectedHeader;

            handler.sign(auth, request, _.noop);
            authHeader = request.headers.one('Authorization');
            expectedHeader = 'Authorization: Digest username="postman", realm="Users", ' +
                'nonce="bcgEc5RPU1ANglyT2I0ShU0oxqPB5jXp", uri="/digest-auth?key=value", ' +
                'response="24dfb8851ee27e4b00252a13b1fd8ec3", opaque=""';

            expect(authHeader.toString()).to.eql(expectedHeader);
        });

        it('should bail out for invalid requests', function () {
            var request = new Request(_.omit(rawRequests.digest, 'auth.digest.username')),
                auth = request.auth,
                handler = AuthLoader.getHandler(auth.type);

            handler.sign(auth, request, _.noop);

            expect(request.headers.all()).to.be.empty();
            // Since Nonce and Timestamp have to be generated at runtime, cannot assert anything beyond this.
            expect(request.toJSON()).to.eql({
                url: 'https://postman-echo.com/digest-auth',
                method: 'GET',
                header: undefined,
                certificate: undefined,
                proxy: undefined,
                body: undefined,
                description: undefined,
                auth: {
                    type: 'digest',
                    digest: [{
                        'key': 'realm',
                        'type': 'any',
                        'value': 'Users'
                    },
                    {
                        'key': 'password',
                        'type': 'any',
                        'value': 'password'
                    },
                    {
                        'key': 'nonce',
                        'type': 'any',
                        'value': 'bcgEc5RPU1ANglyT2I0ShU0oxqPB5jXp'
                    },
                    {
                        'key': 'nonceCount',
                        'type': 'any',
                        'value': ''
                    },
                    {
                        'key': 'algorithm',
                        'type': 'any',
                        'value': 'MD5'
                    },
                    {
                        'key': 'qop',
                        'type': 'any',
                        'value': ''
                    },
                    {
                        'key': 'clientNonce',
                        'type': 'any',
                        'value': ''
                    },
                    {
                        'key': 'opaque',
                        'type': 'any',
                        'value': ''
                    }]
                }
            });
        });
    });

    describe('oauth1', function () {
        it('Auth header must be added', function () {
            var request = new Request(rawRequests.oauth1),
                auth = request.auth,
                handler = AuthLoader.getHandler(auth.type),
                headers,
                authHeader,
                authHeaderValueKeys;

            handler.sign(auth, request, _.noop);
            headers = request.headers.all();
            authHeader;
            authHeaderValueKeys;

            expect(headers.length).to.eql(1);
            authHeader = headers[0];
            // Since Nonce and Timestamp have to be generated at runtime, cannot assert anything beyond this.
            expect(authHeader.key).to.be('Authorization');
            authHeaderValueKeys = authHeader.value.split(',').map((val) => {
                return val.split('=')[0];
            });
            expect(authHeaderValueKeys).to.eql([
                'OAuth realm',
                'oauth_consumer_key',
                'oauth_signature_method',
                'oauth_timestamp',
                'oauth_nonce',
                'oauth_version',
                'oauth_signature'
            ]);
            expect(authHeader.system).to.be(true);
        });

        it('should support the camelCased timeStamp option as well', function () {
            var request = new Request(_(rawRequests.oauth1).omit('auth.oauth1.timestamp').merge({
                    auth: {
                        type: 'oauth1',
                        oauth1: {
                            timeStamp: 1234
                        }
                    }
                }).value()),
                auth = request.auth,
                handler = AuthLoader.getHandler(auth.type),
                headers,
                authHeader;

            handler.sign(auth, request, _.noop);
            headers = request.headers.all();
            authHeader;

            expect(headers.length).to.eql(1);
            authHeader = headers[0];
            // Since Nonce and Timestamp have to be generated at runtime, cannot assert anything beyond this.
            expect(authHeader.toString()).to.match(/Authorization: OAuth/);
            expect(authHeader.system).to.be(true);
            expect(request.auth.oauth1.toObject().timeStamp).to.be(1234);
        });

        it('should bail out if the auth params are invalid', function () {
            var request = new Request(_.omit(rawRequests.oauth1, ['header', 'auth.oauth1.consumerKey'])),
                auth = request.auth,
                handler = AuthLoader.getHandler(auth.type);

            handler.sign(auth, request, _.noop);

            expect(request.headers.all()).to.have.length(0);
        });

        it('should apply sensible defaults where applicable', function () {
            var rawReq = _(rawRequests.oauth1).omit(['auth.oauth1.nonce', 'auth.oauth1.timestamp']).merge({
                    url: 'https://postman-echo.com/auth/oauth1',
                    auth: {
                        oauth1: {
                            addEmptyParamsToSign: true,
                            addParamsToHeader: false
                        }
                    },
                    body: {
                        mode: 'urlencoded',
                        urlencoded: [{
                            key: 'oauth_token',
                            value: 'secret'
                        }, {
                            key: 'foo',
                            value: 'bar'
                        }]
                    }
                }).value(),
                request = new Request(rawReq),
                auth = request.auth,
                handler = AuthLoader.getHandler(auth.type);

            handler.sign(auth, request, _.noop);

            expect(request.headers.all()).to.be.empty();

            expect(request.auth.parameters().toObject()).to
                .eql({
                    consumerKey: 'RKCGzna7bv9YD57c',
                    consumerSecret: 'D+EdQ-gs$-%@2Nu7',
                    token: '',
                    tokenSecret: '',
                    signatureMethod: 'HMAC-SHA1',
                    version: '1.0',
                    realm: 'oauthrealm',
                    addParamsToHeader: false,
                    autoAddParam: true,
                    addEmptyParamsToSign: true
                });
        });

        it('should correctly handle the GET request method', function () {
            var rawReq = _(rawRequests.oauth1).omit(['auth.oauth1.nonce', 'auth.oauth1.timestamp']).merge({
                    method: 'GET',
                    url: 'https://postman-echo.com/auth/oauth1',
                    auth: {
                        oauth1: {
                            addEmptyParamsToSign: true,
                            addParamsToHeader: false
                        }
                    },
                    body: {
                        mode: 'urlencoded',
                        urlencoded: [{
                            key: 'oauth_token',
                            value: 'secret'
                        }, {
                            key: 'foo',
                            value: 'bar'
                        }]
                    }
                }).value(),
                request = new Request(rawReq),
                auth = request.auth,
                handler = AuthLoader.getHandler(auth.type);

            handler.sign(auth, request, _.noop);

            expect(request.headers.all()).to.be.empty();
            expect(request.url.query.reference).to.have.keys([
                'oauth_consumer_key', 'oauth_token', 'oauth_signature_method', 'oauth_timestamp', 'oauth_nonce',
                'oauth_version', 'oauth_signature'
            ]);
            expect(request.auth.parameters().toObject()).to
                .eql({
                    consumerKey: 'RKCGzna7bv9YD57c',
                    consumerSecret: 'D+EdQ-gs$-%@2Nu7',
                    token: '',
                    tokenSecret: '',
                    signatureMethod: 'HMAC-SHA1',
                    version: '1.0',
                    realm: 'oauthrealm',
                    addParamsToHeader: false,
                    autoAddParam: true,
                    addEmptyParamsToSign: true
                });
        });
    });

    describe('oauth2', function () {
        it('should work correctly', function () {
            var request = new Request(rawRequests.oauth2),
                auth = request.auth,
                handler = AuthLoader.getHandler(auth.type);

            handler.sign(auth, request, _.noop);

            expect(request.headers.all()).to.be.empty();
        });
    });

    // querystring.unescape is not available in browserify's querystring module, so this goes to hell
    // TODO: fix this
    (typeof window === 'undefined' ? describe : describe.skip)('awsv4', function () {
        it('should add the required headers', function () {
            var awsv4Data = rawRequests.awsv4,
                request = new Request(rawRequests.awsv4),
                auth = request.auth,
                authParams = auth.parameters().toObject(),
                handler = AuthLoader.getHandler(auth.type),
                parsedUrl,
                headers,
                expectedSignedReq;

            handler.sign(auth, request, _.noop);
            parsedUrl = new Url(awsv4Data.url);
            headers = request.getHeaders({
                ignoreCase: true
            });
            expectedSignedReq = aws4.sign({
                headers: {
                    'X-Amz-Date': headers['x-amz-date'],
                    'content-type': 'application/json'
                },
                host: parsedUrl.getRemote(),
                path: parsedUrl.getPathWithQuery(),
                service: authParams.serviceName,
                region: authParams.region,
                method: awsv4Data.method,
                body: undefined
            }, {
                accessKeyId: authParams.accessKey,
                secretAccessKey: authParams.secretKey,
                sessionToken: authParams.sessionToken
            });

            // Ensure that the required headers have been added.
            // todo stricter tests?

            expect(headers).to.have.property('authorization', expectedSignedReq.headers.Authorization);
            expect(headers).to.have.property('content-type', request.getHeaders({
                ignoreCase: true
            })['content-type']);
            expect(headers).to.have.property('x-amz-date');
            expect(headers).to.have.property('x-amz-security-token');
        });

        it('should use sensible defaults where applicable', function () {
            var headers,
                rawReq = _.defaults(rawRequests.awsv4, {
                    body: {
                        foo: 'bar'
                    }
                }),
                request = new Request(_.omit(rawReq, ['header.0', 'auth.awsv4.sessionToken', 'region'])),
                auth = request.auth,
                handler = AuthLoader.getHandler(auth.type);

            handler.sign(auth, request, _.noop);

            request.headers.add({
                key: 'postman-token',
                value: 'random-token'
            });
            headers = request.getHeaders({
                ignoreCase: true
            });

            expect(headers).to.have.property('authorization');
            expect(headers).to.have.property('content-type', request.getHeaders({
                ignoreCase: true
            })['content-type']);
            expect(headers).to.have.property('x-amz-date');
            expect(request.auth.parameters().toObject()).to.eql({
                auto: true,
                id: 'awsSigV4',
                region: 'eu-west-1',
                saveHelper: true,
                service: '',
                serviceName: 'execute-api',
                accessKey: 'AKIAI53QRL',
                secretKey: 'cr2RAfsY4IIVweutTBoBzR',
                time: 1452673288848
            });
        });

        it('should handle formdata bodies correctly', function () {
            var rawReq = _.merge({}, rawRequests.awsv4, {
                    body: {
                        mode: 'formdata',
                        formdata: []
                    }
                }),
                request = new Request(_.omit(rawReq, 'header')),
                auth = request.auth,
                handler = AuthLoader.getHandler(auth.type),
                headers;

            handler.sign(auth, request, _.noop);
            headers = request.getHeaders({
                ignoreCase: true
            });

            expect(headers).to.have.property('authorization');
            expect(headers).to.have.property('content-type', request.getHeaders({
                ignoreCase: true
            })['content-type']);
            expect(headers).to.have.property('x-amz-date');
            expect(request.auth.parameters().toObject()).to.eql({
                auto: true,
                id: 'awsSigV4',
                region: 'eu-west-1',
                saveHelper: true,
                service: '',
                serviceName: 'execute-api',
                accessKey: 'AKIAI53QRL',
                sessionToken: '33Dhtnwf0RVHCFttmMPYt3dxx9zi8I07CBwTXaqupHQ=',
                secretKey: 'cr2RAfsY4IIVweutTBoBzR',
                time: 1452673288848
            });
        });
    });

    describe('hawk', function () {
        it('Auth header must be added', function () {
            var request = new Request(rawRequests.hawk),
                auth = request.auth,
                handler = AuthLoader.getHandler(auth.type),
                headers;

            handler.sign(auth, request, _.noop);
            headers = request.getHeaders({
                ignoreCase: true
            });

            // Ensure that the required headers have been added.
            expect(headers).to.have.property('authorization');
        });

        it('Authorized request must contain the generated timestamp and nonce', function () {
            var request = new Request(rawRequests.hawk),
                clonedRequest = new Request(request.toJSON()), // cloning it so we can assert comparing the two
                auth = request.auth,
                handler = AuthLoader.getHandler(auth.type),
                headerBefore,
                headerAfter,
                nonceMatch,
                tsMatch;

            handler.sign(auth, clonedRequest, _.noop);

            headerBefore = request.headers.all()[0].value;
            headerAfter = clonedRequest.headers.all()[0].value;
            nonceMatch = headerAfter.match(/nonce="([^"]*)"/);
            tsMatch = headerAfter.match(/ts="([^"]*)"/);

            // Original request should not have the timestamp and nonce
            expect(headerBefore).to.be.eql('');

            expect(request.auth).to.be.ok();
            expect(_.get(nonceMatch, 1)).to.be.a('string');
            expect(_.parseInt(_.get(tsMatch, 1))).to.be.a('number');
        });

        it('should bail out the original request if auth key is missing', function () {
            var request = new Request(_.omit(rawRequests.hawk, 'auth.hawk.authKey')),
                auth = request.auth,
                handler = AuthLoader.getHandler(auth.type);

            handler.sign(auth, request, _.noop);

            // Original request should not have the timestamp and nonce
            expect(_.get(rawRequests.hawk, 'auth.hawk.nonce')).to.not.be.ok();
            expect(_.get(rawRequests.hawk, 'auth.hawk.timestamp')).to.not.be.ok();

            expect(request.auth).to.be.ok();
            expect(_.get(request, 'auth.hawk.nonce')).to.not.be.ok();
            expect(_.get(request, 'auth.hawk.timestamp')).to.not.be.ok();
        });
    });

    describe('ntlm', function () {
        it('should be able to load all parameters from a request', function () {
            var data = {
                    auth: {
                        type: 'ntlm',
                        ntlm: {
                            username: 'testuser',
                            password: 'testpass',
                            domain: 'testdomain',
                            workstation: 'sample.work'
                        }
                    },
                    url: 'httpbin.org/get'
                },
                request = new Request(data),
                auth = request.auth,
                handler = AuthLoader.getHandler(auth.type);

            handler.sign(auth, request, _.noop);

            expect(request.auth.ntlm.toObject()).to.eql({
                username: 'testuser',
                password: 'testpass',
                domain: 'testdomain',
                workstation: 'sample.work'
            });
        });
    });
});
