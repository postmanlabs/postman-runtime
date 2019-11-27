var _ = require('lodash'),
    expect = require('chai').expect,
    aws4 = require('aws4'),
    sdk = require('postman-collection'),
    AuthLoader = require('../../lib/authorizer').AuthLoader,
    createAuthInterface = require('../../lib/authorizer/auth-interface'),

    Request = sdk.Request,
    Url = sdk.Url,
    rawRequests = require('../fixtures/auth-requests');

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
                authInterface = createAuthInterface(auth),
                handler = AuthLoader.getHandler(auth.type);

            handler.sign(authInterface, request, _.noop);

            expect(request).to.eql(request);
            authInterface.set({foo: 'bar'});

            handler.sign(authInterface, request, _.noop);
            expect(request.auth.parameters().toObject()).to.eql({
                foo: 'bar'
            });
        });
    });

    describe('bearer token', function () {
        var requestObj = {
            auth: {
                type: 'bearer',
                bearer: {
                    token: '123456789abcdefghi'
                }
            },
            method: 'GET'
        };

        it('should add the auth header', function () {
            var request = new Request(requestObj),
                authInterface = createAuthInterface(request.auth),
                expectedAuthHeader = 'Authorization: Bearer ' + requestObj.auth.bearer.token,
                handler = AuthLoader.getHandler(request.auth.type),
                headers,
                authHeader;

            handler.sign(authInterface, request, _.noop);
            headers = request.headers.all();

            expect(headers).to.have.lengthOf(1);

            authHeader = headers[0];
            expect(authHeader.toString()).to.eql(expectedAuthHeader);
            expect(authHeader.system).to.be.true;
        });

        it('should return without signing the request when token is missing', function () {
            var clonedRequestObj = _.clone(requestObj),
                request,
                authInterface,
                handler,
                valuesToCheck = [null, undefined, NaN];

            _.forEach(valuesToCheck, function (value) {
                clonedRequestObj.auth.bearer.token = value;
                request = new Request(clonedRequestObj);
                authInterface = createAuthInterface(request.auth);
                handler = AuthLoader.getHandler(request.auth.type);

                handler.sign(authInterface, request, _.noop);

                expect(request.headers.all()).to.be.an('array').that.is.empty;
            });
        });
    });

    describe('basic', function () {
        it('should add the Auth header', function () {
            var request = new Request(rawRequests.basic),
                auth = request.auth,
                authInterface = createAuthInterface(auth),
                username = rawRequests.basic.auth.basic.username,
                password = rawRequests.basic.auth.basic.password,
                expectedAuthHeader = 'Authorization: Basic ' +
                                     Buffer.from(`${username}:${password}`, 'utf8').toString('base64'),
                handler = AuthLoader.getHandler(auth.type),
                headers,
                authHeader;

            handler.sign(authInterface, request, _.noop);
            headers = request.headers.all();

            expect(headers).to.have.lengthOf(1);

            authHeader = headers[0];
            expect(authHeader.toString()).to.eql(expectedAuthHeader);
            expect(authHeader.system).to.be.true;
        });

        it('should generate correct header for parameters with unicode characters', function () {
            var rawBasicReq = _.cloneDeep(rawRequests.basic),
                request,
                authInterface,
                handler;

            rawBasicReq.auth.basic = {username: '中文', password: '文中'};
            request = new Request(rawBasicReq);
            authInterface = createAuthInterface(request.auth);
            handler = AuthLoader.getHandler(request.auth.type);
            handler.sign(authInterface, request, _.noop);

            expect(request.headers.toJSON()).to.eql([
                {
                    key: 'Authorization',
                    value: 'Basic ' + Buffer.from('中文:文中', 'utf8').toString('base64'),
                    system: true
                }
            ]);
        });

        it('should use default values for the missing parameters', function () {
            var rawBasicReq = _.cloneDeep(rawRequests.basic),
                request,
                authInterface,
                handler;

            rawBasicReq.auth.basic = {username: 'foo'}; // no password present
            request = new Request(rawBasicReq);
            authInterface = createAuthInterface(request.auth);
            handler = AuthLoader.getHandler(request.auth.type);
            handler.sign(authInterface, request, _.noop);

            expect(request.headers.toJSON()).to.eql([
                {
                    key: 'Authorization',
                    value: 'Basic ' + Buffer.from('foo:', 'utf8').toString('base64'),
                    system: true
                }
            ]);

            rawBasicReq.auth.basic = {password: 'foo'}; // no username present
            request = new Request(rawBasicReq);
            authInterface = createAuthInterface(request.auth);
            handler = AuthLoader.getHandler(request.auth.type);
            handler.sign(authInterface, request, _.noop);

            expect(request.headers.toJSON()).to.eql([
                {
                    key: 'Authorization',
                    value: 'Basic ' + Buffer.from(':foo', 'utf8').toString('base64'),
                    system: true
                }
            ]);

            rawBasicReq.auth.basic = {}; // no username and no password present
            request = new Request(rawBasicReq);
            authInterface = createAuthInterface(request.auth);
            handler = AuthLoader.getHandler(request.auth.type);
            handler.sign(authInterface, request, _.noop);

            expect(request.headers.toJSON()).to.eql([
                {
                    key: 'Authorization',
                    value: 'Basic ' + Buffer.from(':', 'utf8').toString('base64'),
                    system: true
                }
            ]);
        });
    });

    describe('digest', function () {
        it('should add the Auth header for (algorithm="MD5", qop=""', function () {
            var request = new Request(rawRequests.digest),
                auth = request.auth,
                authInterface = createAuthInterface(auth),
                handler = AuthLoader.getHandler(auth.type),
                headers,
                expectedHeader,
                authHeader;

            handler.sign(authInterface, request, _.noop);
            headers = request.headers.all();
            expectedHeader = 'Authorization: Digest username="postman", realm="Users", ' +
                'nonce="bcgEc5RPU1ANglyT2I0ShU0oxqPB5jXp", uri="/digest-auth", ' +
                'algorithm="MD5", response="63db383a0f03744cfd45fe15de8dbe9d", opaque="5ccc069c403ebaf9f0171e9517f40e"';
            authHeader;

            expect(headers).to.have.lengthOf(1);
            authHeader = headers[0];

            expect(authHeader.toString()).to.eql(expectedHeader);
            expect(authHeader.system).to.be.true;
        });

        it('should add the Auth header for (algorithm="MD5", qop="auth")', function () {
            var clonedReqObj = _.merge({}, rawRequests.digest, {
                    auth: {
                        digest: {
                            qop: 'auth'
                        }
                    }
                }),
                request = new Request(clonedReqObj),
                auth = request.auth,
                authInterface = createAuthInterface(auth),
                handler = AuthLoader.getHandler(auth.type),
                headers,
                expectedHeader,
                authHeader;

            handler.sign(authInterface, request, _.noop);
            headers = request.headers.all();
            expectedHeader = 'Authorization: Digest username="postman", realm="Users", ' +
                'nonce="bcgEc5RPU1ANglyT2I0ShU0oxqPB5jXp", uri="/digest-auth", ' +
                'algorithm="MD5", qop=auth, nc=00000001, cnonce="0a4f113b", ' +
                'response="f83809617b00766c6f9840256eb1199e", opaque="5ccc069c403ebaf9f0171e9517f40e"';
            authHeader;

            expect(headers).to.have.lengthOf(1);
            authHeader = headers[0];

            expect(authHeader.toString()).to.eql(expectedHeader);
            expect(authHeader.system).to.be.true;
        });

        it('should add the Auth header for (algorithm="MD5", qop="auth-int")', function () {
            var clonedReqObj = _.merge({}, rawRequests.digest, {
                    auth: {
                        digest: {
                            qop: 'auth-int'
                        }
                    }
                }),
                request = new Request(clonedReqObj),
                auth = request.auth,
                authInterface = createAuthInterface(auth),
                handler = AuthLoader.getHandler(auth.type),
                headers,
                expectedHeader,
                authHeader;

            handler.sign(authInterface, request, _.noop);
            headers = request.headers.all();
            expectedHeader = 'Authorization: Digest username="postman", realm="Users", ' +
                'nonce="bcgEc5RPU1ANglyT2I0ShU0oxqPB5jXp", uri="/digest-auth", ' +
                'algorithm="MD5", qop=auth-int, nc=00000001, cnonce="0a4f113b", ' +
                'response="65d355634828a04d3a73717dc810a4bf", opaque="5ccc069c403ebaf9f0171e9517f40e"';
            authHeader;

            expect(headers).to.have.lengthOf(1);
            authHeader = headers[0];

            expect(authHeader.toString()).to.eql(expectedHeader);
            expect(authHeader.system).to.be.true;
        });

        it('should add the Auth header for (algorithm="MD5-sess", qop="")', function () {
            var clonedReqObj = _.merge({}, rawRequests.digest, {
                    auth: {
                        digest: {
                            algorithm: 'MD5-sess'
                        }
                    }
                }),
                request = new Request(clonedReqObj),
                auth = request.auth,
                authInterface = createAuthInterface(auth),
                handler = AuthLoader.getHandler(auth.type),
                headers,
                expectedHeader,
                authHeader;

            handler.sign(authInterface, request, _.noop);
            headers = request.headers.all();
            expectedHeader = 'Authorization: Digest username="postman", realm="Users", ' +
                'nonce="bcgEc5RPU1ANglyT2I0ShU0oxqPB5jXp", uri="/digest-auth", ' +
                'algorithm="MD5-sess", nc=00000001, cnonce="0a4f113b", ' +
                'response="3bf3901b3461fe15de194fa866154c21", opaque="5ccc069c403ebaf9f0171e9517f40e"';
            authHeader;

            expect(headers).to.have.lengthOf(1);
            authHeader = headers[0];

            expect(authHeader.toString()).to.eql(expectedHeader);
            expect(authHeader.system).to.be.true;
        });

        it('should add the Auth header for (algorithm="MD5-sess", qop="auth")', function () {
            var clonedReqObj = _.merge({}, rawRequests.digest, {
                    auth: {
                        digest: {
                            qop: 'auth',
                            algorithm: 'MD5-sess'
                        }
                    }
                }),
                request = new Request(clonedReqObj),
                auth = request.auth,
                authInterface = createAuthInterface(auth),
                handler = AuthLoader.getHandler(auth.type),
                headers,
                expectedHeader,
                authHeader;

            handler.sign(authInterface, request, _.noop);
            headers = request.headers.all();
            expectedHeader = 'Authorization: Digest username="postman", realm="Users", ' +
                'nonce="bcgEc5RPU1ANglyT2I0ShU0oxqPB5jXp", uri="/digest-auth", ' +
                'algorithm="MD5-sess", qop=auth, nc=00000001, cnonce="0a4f113b", ' +
                'response="52aa69a8b63d81b51e2d02ecebaa705e", opaque="5ccc069c403ebaf9f0171e9517f40e"';
            authHeader;

            expect(headers).to.have.lengthOf(1);
            authHeader = headers[0];

            expect(authHeader.toString()).to.eql(expectedHeader);
            expect(authHeader.system).to.be.true;
        });

        it('should add the Auth header for (algorithm="MD5-sess", qop="auth-int")', function () {
            var clonedReqObj = _.merge({}, rawRequests.digest, {
                    auth: {
                        digest: {
                            qop: 'auth-int',
                            algorithm: 'MD5-sess'
                        }
                    }
                }),
                request = new Request(clonedReqObj),
                auth = request.auth,
                authInterface = createAuthInterface(auth),
                handler = AuthLoader.getHandler(auth.type),
                headers,
                expectedHeader,
                authHeader;

            handler.sign(authInterface, request, _.noop);
            headers = request.headers.all();
            expectedHeader = 'Authorization: Digest username="postman", realm="Users", ' +
                'nonce="bcgEc5RPU1ANglyT2I0ShU0oxqPB5jXp", uri="/digest-auth", ' +
                'algorithm="MD5-sess", qop=auth-int, nc=00000001, cnonce="0a4f113b", ' +
                'response="eb2ec4193a936809d035976f5f20cc65", opaque="5ccc069c403ebaf9f0171e9517f40e"';
            authHeader;

            expect(headers).to.have.lengthOf(1);
            authHeader = headers[0];

            expect(authHeader.toString()).to.eql(expectedHeader);
            expect(authHeader.system).to.be.true;
        });

        it('should add the Auth header with query params in case of request with the same', function () {
            var request = new Request(rawRequests.digestWithQueryParams),
                auth = request.auth,
                authInterface = createAuthInterface(auth),
                handler = AuthLoader.getHandler(auth.type),
                authHeader,
                expectedHeader;

            handler.sign(authInterface, request, _.noop);
            authHeader = request.headers.one('Authorization');
            expectedHeader = 'Authorization: Digest username="postman", realm="Users", ' +
                'nonce="bcgEc5RPU1ANglyT2I0ShU0oxqPB5jXp", uri="/digest-auth?key=value", ' +
                'algorithm="MD5", response="24dfb8851ee27e4b00252a13b1fd8ec3", opaque="5ccc069c403ebaf9f0171e9517f40e"';

            expect(authHeader.toString()).to.eql(expectedHeader);
        });

        it('should bail out for invalid requests', function () {
            var request = new Request(_.omit(rawRequests.digest, 'auth.digest.username')),
                auth = request.auth,
                authInterface = createAuthInterface(auth),
                handler = AuthLoader.getHandler(auth.type);

            handler.sign(authInterface, request, _.noop);

            expect(request.headers.all()).to.be.an('array').that.is.empty;
            // Since Nonce and Timestamp have to be generated at runtime, cannot assert anything beyond this.
            expect(request.toJSON()).to.eql({
                url: {
                    host: ['postman-echo', 'com'],
                    path: ['digest-auth'],
                    protocol: 'https',
                    query: [],
                    variable: []
                },
                method: 'GET',
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
                        'value': '00000001'
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
                        'value': '0a4f113b'
                    },
                    {
                        'key': 'opaque',
                        'type': 'any',
                        'value': '5ccc069c403ebaf9f0171e9517f40e'
                    }]
                }
            });
        });
    });

    describe('oauth1', function () {
        it('should add the Auth header', function () {
            var request = new Request(rawRequests.oauth1),
                auth = request.auth,
                authInterface = createAuthInterface(auth),
                handler = AuthLoader.getHandler(auth.type),
                headers,
                authHeader,
                authHeaderValueKeys;

            handler.sign(authInterface, request, _.noop);
            headers = request.headers.all();
            authHeader;
            authHeaderValueKeys;

            expect(headers).to.have.lengthOf(1);
            authHeader = headers[0];
            // Since Nonce and Timestamp have to be generated at runtime, cannot assert anything beyond this.
            expect(authHeader.key).to.equal('Authorization');
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
            expect(authHeader.system).to.be.true;
        });

        it('should bail out if the auth params are invalid', function () {
            var request = new Request(_.omit(rawRequests.oauth1, ['header', 'auth.oauth1.consumerKey'])),
                auth = request.auth,
                authInterface = createAuthInterface(auth),
                handler = AuthLoader.getHandler(auth.type);

            handler.sign(authInterface, request, _.noop);

            expect(request.headers.all()).to.be.an('array').that.is.empty;
        });

        it('should apply sensible defaults where applicable', function () {
            var rawReq = _(rawRequests.oauth1).omit(['auth.oauth1.nonce', 'auth.oauth1.timestamp']).merge({
                    url: {
                        host: ['postman-echo', 'com'],
                        path: ['auth', 'oauth1'],
                        protocol: 'https',
                        query: [],
                        variable: []
                    },
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
                authInterface = createAuthInterface(auth),
                handler = AuthLoader.getHandler(auth.type);

            handler.sign(authInterface, request, _.noop);

            expect(request.headers.all()).to.be.an('array').that.is.empty;

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
                authInterface = createAuthInterface(auth),
                handler = AuthLoader.getHandler(auth.type);

            handler.sign(authInterface, request, _.noop);

            expect(request.headers.all()).to.be.an('array').that.is.empty;
            expect(request.url.query.reference).to.deep.include.keys([
                'oauth_consumer_key', 'oauth_token', 'oauth_signature_method', 'oauth_timestamp', 'oauth_nonce',
                'oauth_version', 'oauth_signature'
            ]);
            // All the query paramters added by runtime must have `system: true` property
            _.forEach(request.url.query.members, function (param) {
                expect(param.system).to.be.true;
            });
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
        var requestObj = {
            auth: {
                type: 'oauth2',
                oauth2: {
                    accessToken: '123456789abcdefghi',
                    addTokenTo: 'header',
                    tokenType: 'bearer'
                }
            },
            url: 'https://api.github.com/user/orgs',
            method: 'GET'
        };

        it('should sign the request by adding the token to the header', function () {
            var request = new Request(requestObj),
                authInterface = createAuthInterface(request.auth),
                handler = AuthLoader.getHandler(request.auth.type);

            handler.sign(authInterface, request, _.noop);

            expect(request.headers.all()).to.be.an('array').that.has.lengthOf(1);
            expect(request.headers.toJSON()[0]).to.eql({
                key: 'Authorization',
                value: 'Bearer ' + requestObj.auth.oauth2.accessToken,
                system: true
            });
        });

        it('should sign the request by adding the token to the query params', function () {
            var clonedRequestObj,
                request,
                auth,
                authInterface,
                handler;

            clonedRequestObj = _.cloneDeep(requestObj);
            clonedRequestObj.auth.oauth2.addTokenTo = 'queryParams';

            request = new Request(clonedRequestObj);
            auth = request.auth;
            authInterface = createAuthInterface(auth);
            handler = AuthLoader.getHandler(auth.type);

            handler.sign(authInterface, request, _.noop);

            expect(request.headers.all()).to.be.an('array').that.is.empty;
            expect(request.url.query.all()).to.be.an('array').that.has.lengthOf(1);
            expect(request.url.query.toJSON()[0]).to.eql({
                key: 'access_token',
                value: requestObj.auth.oauth2.accessToken,
                system: true
            });
        });

        it('should return when token is not present', function () {
            var clonedRequestObj,
                request,
                auth,
                authInterface,
                handler;

            clonedRequestObj = _.cloneDeep(requestObj);
            delete clonedRequestObj.auth.oauth2.accessToken;

            request = new Request(clonedRequestObj);
            auth = request.auth;
            authInterface = createAuthInterface(auth);
            handler = AuthLoader.getHandler(auth.type);

            handler.sign(authInterface, request, _.noop);

            expect(request.headers.all()).to.be.an('array').that.is.empty;
            expect(request.url.query.all()).to.be.an('array').that.is.empty;
        });

        it('should default the token type to "Bearer"', function () {
            var clonedRequestObj,
                request,
                auth,
                authInterface,
                handler;

            clonedRequestObj = _.cloneDeep(requestObj);
            clonedRequestObj.auth.oauth2.tokenType = '';

            request = new Request(clonedRequestObj);
            auth = request.auth;
            authInterface = createAuthInterface(auth);
            handler = AuthLoader.getHandler(auth.type);

            handler.sign(authInterface, request, _.noop);

            expect(request.headers.all()).to.be.an('array').that.has.lengthOf(1);
            expect(request.headers.toJSON()[0]).to.eql({
                key: 'Authorization',
                value: 'Bearer ' + requestObj.auth.oauth2.accessToken,
                system: true
            });
        });

        it('should do a case insensitive check for token type', function () {
            var clonedRequestObj,
                request,
                auth,
                authInterface,
                handler;

            clonedRequestObj = _.cloneDeep(requestObj);
            clonedRequestObj.auth.oauth2.tokenType = 'Bearer';

            request = new Request(clonedRequestObj);
            auth = request.auth;
            authInterface = createAuthInterface(auth);
            handler = AuthLoader.getHandler(auth.type);

            handler.sign(authInterface, request, _.noop);

            expect(request.headers.all()).to.be.an('array').that.has.lengthOf(1);
            expect(request.headers.toJSON()[0]).to.eql({
                key: 'Authorization',
                value: 'Bearer ' + requestObj.auth.oauth2.accessToken,
                system: true
            });

            clonedRequestObj.auth.oauth2.tokenType = 'bearer';

            request = new Request(clonedRequestObj);
            auth = request.auth;
            authInterface = createAuthInterface(auth);
            handler = AuthLoader.getHandler(auth.type);

            handler.sign(authInterface, request, _.noop);

            expect(request.headers.all()).to.be.an('array').that.has.lengthOf(1);
            expect(request.headers.toJSON()[0]).to.eql({
                key: 'Authorization',
                value: 'Bearer ' + requestObj.auth.oauth2.accessToken,
                system: true
            });
        });

        it('should treat unknown token type as "Bearer"', function () {
            var clonedRequestObj,
                request,
                auth,
                authInterface,
                handler;

            clonedRequestObj = _.cloneDeep(requestObj);
            clonedRequestObj.auth.oauth2.tokenType = 'unknown type';

            request = new Request(clonedRequestObj);
            auth = request.auth;
            authInterface = createAuthInterface(auth);
            handler = AuthLoader.getHandler(auth.type);

            handler.sign(authInterface, request, _.noop);

            expect(request.headers.all()).to.be.an('array').that.has.lengthOf(1);
            expect(request.headers.toJSON()[0]).to.eql({
                key: 'Authorization',
                value: 'Bearer ' + requestObj.auth.oauth2.accessToken,
                system: true
            });
        });

        it('should return when token type is MAC', function () {
            var clonedRequestObj,
                request,
                auth,
                authInterface,
                handler;

            clonedRequestObj = _.cloneDeep(requestObj);
            clonedRequestObj.auth.oauth2.tokenType = 'mac';

            request = new Request(clonedRequestObj);
            auth = request.auth;
            authInterface = createAuthInterface(auth);
            handler = AuthLoader.getHandler(auth.type);

            handler.sign(authInterface, request, _.noop);

            expect(request.headers.all()).to.be.an('array').that.is.empty;
            expect(request.url.query.all()).to.be.an('array').that.is.empty;
        });

        it('should remove user defined Authorization header and query param for addTokenTo: header', function () {
            var requestWithAuthHeader,
                request,
                auth,
                authInterface,
                handler;

            requestWithAuthHeader = _.defaults({
                header: [{key: 'Authorization', value: 'This should be removed'}],
                url: 'https://postman-echo.com/get?access_token=not-anymore'
            }, requestObj);

            request = new Request(requestWithAuthHeader);
            auth = request.auth;
            authInterface = createAuthInterface(auth);
            handler = AuthLoader.getHandler(auth.type);

            handler.sign(authInterface, request, _.noop);

            expect(request.headers.toJSON()).to.eql([{
                key: 'Authorization',
                value: 'Bearer ' + requestObj.auth.oauth2.accessToken,
                system: true
            }]);

            expect(request.url.toJSON()).to.eql({
                protocol: 'https',
                path: ['get'],
                host: ['postman-echo', 'com'],
                query: [],
                variable: []
            });
        });

        it('should remove user defined Authorization header and query param for addTokenTo: queryParams', function () {
            var requestWithAuthHeader,
                request,
                auth,
                authInterface,
                handler;

            requestWithAuthHeader = _.defaults({
                auth: {
                    type: 'oauth2',
                    oauth2: {
                        accessToken: '123456789abcdefghi',
                        addTokenTo: 'queryParams',
                        tokenType: 'bearer'
                    }
                },
                header: [{key: 'Authorization', value: 'This should be removed'}],
                url: 'https://postman-echo.com/get?access_token=not-anymore'
            }, requestObj);

            request = new Request(requestWithAuthHeader);
            auth = request.auth;
            authInterface = createAuthInterface(auth);
            handler = AuthLoader.getHandler(auth.type);

            handler.sign(authInterface, request, _.noop);

            expect(request.headers.toJSON()).to.eql([]);

            expect(request.url.toJSON()).to.eql({
                protocol: 'https',
                path: ['get'],
                host: ['postman-echo', 'com'],
                query: [{key: 'access_token', value: '123456789abcdefghi', system: true}],
                variable: []
            });
        });

        it('should not remove user config for bail out case', function () {
            var requestWithAuthHeader,
                request,
                auth,
                authInterface,
                handler;

            // no access token
            requestWithAuthHeader = _.defaults({
                auth: {
                    type: 'oauth2',
                    oauth2: {
                        addTokenTo: 'queryParams',
                        tokenType: 'bearer'
                    }
                },
                header: [{key: 'Authorization', value: 'Old-Header'}],
                url: 'https://postman-echo.com/get?access_token=old-token'
            }, requestObj);

            request = new Request(requestWithAuthHeader);
            auth = request.auth;
            authInterface = createAuthInterface(auth);
            handler = AuthLoader.getHandler(auth.type);

            handler.sign(authInterface, request, _.noop);

            expect(request.headers.toJSON()).to.eql([{key: 'Authorization', value: 'Old-Header'}]);

            expect(request.url.toJSON()).to.eql({
                protocol: 'https',
                path: ['get'],
                host: ['postman-echo', 'com'],
                query: [{key: 'access_token', value: 'old-token'}],
                variable: []
            });
        });
    });

    // querystring.unescape is not available in browserify's querystring module, so this goes to hell
    // TODO: fix this
    (typeof window === 'undefined' ? describe : describe.skip)('awsv4', function () {
        it('should add the required headers', function () {
            var awsv4Data = rawRequests.awsv4,
                request = new Request(rawRequests.awsv4),
                auth = request.auth,
                authInterface = createAuthInterface(auth),
                authParams = auth.parameters().toObject(),
                handler = AuthLoader.getHandler(auth.type),
                parsedUrl,
                headers,
                expectedSignedReq;

            handler.sign(authInterface, request, _.noop);
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
                method: awsv4Data.method
            }, {
                accessKeyId: authParams.accessKey,
                secretAccessKey: authParams.secretKey,
                sessionToken: authParams.sessionToken
            });

            // Ensure that the required headers have been added.
            // todo stricter tests?

            expect(headers).to.deep.include({
                authorization: expectedSignedReq.headers.Authorization,
                'content-type': request.getHeaders({
                    ignoreCase: true
                })['content-type']
            });
            expect(headers).to.include.keys(['x-amz-date', 'x-amz-security-token']);
        });

        it('should use sensible defaults where applicable', function () {
            var headers,
                rawReq = _.defaults(rawRequests.awsv4, {
                    body: {
                        mode: 'raw',
                        raw: '\'foo\': \'bar\''
                    }
                }),
                request = new Request(_.omit(rawReq, ['header.0', 'auth.awsv4.sessionToken', 'region'])),
                auth = request.auth,
                authInterface = createAuthInterface(auth),
                handler = AuthLoader.getHandler(auth.type);

            handler.sign(authInterface, request, _.noop);

            request.headers.add({
                key: 'postman-token',
                value: 'random-token'
            });
            headers = request.getHeaders({
                ignoreCase: true
            });

            expect(headers).to.include.keys(['authorization', 'x-amz-date']);
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
                authInterface = createAuthInterface(auth),
                handler = AuthLoader.getHandler(auth.type),
                headers;

            handler.sign(authInterface, request, _.noop);
            headers = request.getHeaders({
                ignoreCase: true
            });

            expect(headers).to.include.keys(['authorization', 'x-amz-date']);
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

        it('should handle graphql bodies correctly', function (done) {
            var rawReq = _.merge({}, rawRequests.awsv4, {
                    body: {
                        mode: 'graphql',
                        graphql: {
                            query: 'query Test { hello }',
                            operationName: 'Test',
                            variables: '{"foo":"bar"}'
                        }
                    }
                }),
                request = new Request(_.omit(rawReq, 'header')),
                auth = request.auth,
                authInterface = createAuthInterface(auth),
                handler = AuthLoader.getHandler(auth.type),
                headers;

            handler.sign(authInterface, request, function () {
                headers = request.getHeaders({
                    ignoreCase: true
                });

                expect(headers).to.include.keys(['authorization', 'x-amz-date']);
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
                done();
            });
        });
    });

    describe('hawk', function () {
        it('should add the Auth header', function () {
            var request = new Request(rawRequests.hawk),
                auth = request.auth,
                authInterface = createAuthInterface(auth),
                handler = AuthLoader.getHandler(auth.type),
                headers;

            handler.sign(authInterface, request, _.noop);
            headers = request.getHeaders({
                ignoreCase: true
            });

            // Ensure that the required headers have been added.
            expect(headers).to.have.property('authorization');
        });

        it('should add the timestamp and nonce to the Authorized request', function () {
            var request = new Request(rawRequests.hawk),
                clonedRequest = new Request(request.toJSON()), // cloning it so we can assert comparing the two
                auth = request.auth,
                authInterface = createAuthInterface(auth),
                handler = AuthLoader.getHandler(auth.type),
                headerBefore,
                headerAfter,
                nonceMatch,
                tsMatch;

            handler.sign(authInterface, clonedRequest, _.noop);

            headerBefore = request.headers.all()[0].value;
            headerAfter = clonedRequest.headers.all()[0].value;
            nonceMatch = headerAfter.match(/nonce="([^"]*)"/);
            tsMatch = headerAfter.match(/ts="([^"]*)"/);

            // Original request should not have the timestamp and nonce
            expect(headerBefore).to.be.eql('');

            expect(request.auth).to.be.ok;
            expect(_.get(nonceMatch, 1)).to.be.a('string');
            expect(_.parseInt(_.get(tsMatch, 1))).to.be.a('number');
        });

        it('should add the hash to the Authorized request if request contains body and includePayloadHash=true',
            function () {
                var request = new Request(rawRequests.hawkWithBody),
                    auth = request.auth,
                    authInterface = createAuthInterface(auth),
                    handler = AuthLoader.getHandler(auth.type),
                    headers;

                handler.sign(authInterface, request, _.noop);
                headers = request.getHeaders({
                    ignoreCase: true
                });

                // Ensure that the required headers have been added.
                expect(headers).to.have.property('authorization');

                // Ensure that the body hash is included in Authorization header
                expect(headers.authorization).to.include('hash');
            });

        it('should not add the hash to the Authorized request if request contains body but includePayloadHash=false',
            function () {
                var request = new Request(rawRequests.hawkWithBodyWithoutHash),
                    auth = request.auth,
                    authInterface = createAuthInterface(auth),
                    handler = AuthLoader.getHandler(auth.type),
                    headers;

                handler.sign(authInterface, request, _.noop);
                headers = request.getHeaders({
                    ignoreCase: true
                });

                // Ensure that the required headers have been added.
                expect(headers).to.have.property('authorization');

                // Ensure that the body hash is included in Authorization header
                expect(headers.authorization).to.not.include('hash');
            });

        it('should bail out the original request if auth key is missing', function () {
            var request = new Request(_.omit(rawRequests.hawk, 'auth.hawk.authKey')),
                auth = request.auth,
                authInterface = createAuthInterface(auth),
                handler = AuthLoader.getHandler(auth.type);

            handler.sign(authInterface, request, _.noop);

            // Original request should not have the timestamp and nonce
            expect(_.get(rawRequests.hawk, 'auth.hawk.nonce')).to.not.be.ok;
            expect(_.get(rawRequests.hawk, 'auth.hawk.timestamp')).to.not.be.ok;

            expect(request.auth).to.be.ok;
            expect(_.get(request, 'auth.hawk.nonce')).to.not.be.ok;
            expect(_.get(request, 'auth.hawk.timestamp')).to.not.be.ok;
        });

        it('should handle formdata bodies correctly when includePayloadHash=true',
            function (done) {
                var rawReq = _.merge({}, rawRequests.hawkWithBody, {
                        body: {
                            mode: 'formdata',
                            formdata: []
                        }
                    }),
                    request = new Request(rawReq),
                    auth = request.auth,
                    authInterface = createAuthInterface(auth),
                    handler = AuthLoader.getHandler(auth.type),
                    headers;

                handler.sign(authInterface, request, function () {
                    headers = request.getHeaders({
                        ignoreCase: true
                    });

                    // Ensure that the required headers have been added.
                    expect(headers).to.have.property('authorization');

                    // Ensure that the body hash is not included in Authorization header.
                    // Update this once we figure out a way to calculate hash for formdata body type.
                    expect(headers.authorization).to.not.include('hash');

                    done();
                });
            });

        it('should handle graphql bodies correctly when includePayloadHash=true',
            function (done) {
                var rawReq = _.merge({}, rawRequests.hawkWithBody, {
                        body: {
                            mode: 'graphql',
                            graphql: {
                                query: 'query Test { hello }',
                                operationName: 'Test',
                                variables: '{"foo":"bar"}'
                            }
                        }
                    }),
                    request = new Request(rawReq),
                    auth = request.auth,
                    authInterface = createAuthInterface(auth),
                    handler = AuthLoader.getHandler(auth.type),
                    headers;

                handler.sign(authInterface, request, function () {
                    headers = request.getHeaders({
                        ignoreCase: true
                    });

                    // Ensure that the required headers have been added.
                    expect(headers).to.have.property('authorization');

                    // Ensure that the body hash is included in Authorization header
                    expect(headers.authorization).to.include('hash');

                    done();
                });
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
                authInterface = createAuthInterface(auth),
                handler = AuthLoader.getHandler(auth.type);

            handler.sign(authInterface, request, _.noop);

            expect(request.auth.ntlm.toObject()).to.eql({
                username: 'testuser',
                password: 'testpass',
                domain: 'testdomain',
                workstation: 'sample.work'
            });
        });
    });

    describe('EdgeGrid', function () {
        var requestWithAllParams = {
                auth: {
                    type: 'edgegrid',
                    edgegrid: {
                        accessToken: 'postman_access_token',
                        clientToken: 'postman_client_token',
                        clientSecret: 'postman_client_secret',
                        baseURL: 'https://postman-echo.com',
                        nonce: 'foo',
                        timestamp: '20191009T06:38:34+0000',
                        headersToSign: ''
                    }
                },
                url: 'https://postman-echo.com/get',
                method: 'GET',
                header: [
                    {
                        key: 'Authorization',
                        value: '',
                        description: ''
                    }
                ]
            },

            requestWithoutOptionalParams = {
                auth: {
                    type: 'edgegrid',
                    edgegrid: {
                        accessToken: 'postman_access_token',
                        clientToken: 'postman_client_token',
                        clientSecret: 'postman_client_secret'
                    }
                },
                url: 'https://postman-echo.com/get',
                method: 'GET',
                header: [
                    {
                        key: 'Authorization',
                        value: '',
                        description: ''
                    }
                ]
            };

        it('should be able to load all parameters from a request', function (done) {
            var rawReq = _.merge({}, requestWithAllParams, {
                    method: 'POST',
                    body: {
                        mode: 'raw',
                        raw: 'Hello World!!'
                    }
                }),
                request = new Request(rawReq),
                auth = request.auth,
                authInterface = createAuthInterface(auth),
                handler = AuthLoader.getHandler(auth.type);

            handler.sign(authInterface, request, function () {
                expect(request.auth.edgegrid.toObject()).to.include({
                    accessToken: 'postman_access_token',
                    clientToken: 'postman_client_token',
                    clientSecret: 'postman_client_secret',
                    baseURL: 'https://postman-echo.com',
                    nonce: 'foo',
                    timestamp: '20191009T06:38:34+0000',
                    headersToSign: ''
                });
                done();
            });
        });

        it('should add Authorization header with required values', function (done) {
            var rawReq = _.merge({}, requestWithAllParams, {
                    method: 'POST',
                    body: {
                        mode: 'raw',
                        raw: 'Hello World!!'
                    }
                }),
                request = new Request(rawReq),
                auth = request.auth,
                authInterface = createAuthInterface(auth),
                handler = AuthLoader.getHandler(auth.type);

            handler.sign(authInterface, request, function () {
                var headers = request.headers.all(),
                    authHeader;

                expect(headers).to.have.lengthOf(1);

                authHeader = headers[0];

                expect(authHeader.system).to.be.true;

                authHeader = authHeader.toString();
                expect(authHeader).to.include('client_token=postman_client_token');
                expect(authHeader).to.include('access_token=postman_access_token');
                expect(authHeader).to.include('timestamp=20191009T06:38:34+0000');
                expect(authHeader).to.include('nonce=foo');
                expect(authHeader).to.include('signature=');
                done();
            });
        });

        it('should add auto-generated nonce to Authorization header when not provided', function (done) {
            var rawReq = requestWithoutOptionalParams,
                request = new Request(rawReq),
                auth = request.auth,
                authInterface = createAuthInterface(auth),
                handler = AuthLoader.getHandler(auth.type);

            handler.sign(authInterface, request, function () {
                var headers = request.headers.all(),
                    authHeader;

                expect(headers).to.have.lengthOf(1);

                authHeader = headers[0].toString();

                expect(authHeader).to.match(/nonce=([A-Z]|[a-z]|[0-9]|-){36};/);
                done();
            });
        });

        it('should add auto-generated timestamp to Authorization header when not provided', function (done) {
            var rawReq = requestWithoutOptionalParams,
                request = new Request(rawReq),
                auth = request.auth,
                authInterface = createAuthInterface(auth),
                handler = AuthLoader.getHandler(auth.type);

            handler.sign(authInterface, request, function () {
                var headers = request.headers.all(),
                    authHeader;

                expect(headers).to.have.lengthOf(1);

                authHeader = headers[0].toString();

                expect(authHeader).to.match(/timestamp=[0-9]{8}T[0-9]{2}:[0-9]{2}:[0-9]{2}\+0000;/);
                done();
            });
        });

        it('should calculate correct signature for request without body', function (done) {
            var rawReq = requestWithAllParams,
                request = new Request(rawReq),
                auth = request.auth,
                authInterface = createAuthInterface(auth),
                handler = AuthLoader.getHandler(auth.type),
                expectedSignature = 'UAU6Kp19TTPX+U0iwL02ILJgwHNN4Uo1vyYYKWileLM=';

            handler.sign(authInterface, request, function () {
                var headers = request.headers.all(),
                    authHeader;

                expect(headers).to.have.lengthOf(1);

                authHeader = headers[0].toString();

                expect(authHeader).to.include(`signature=${expectedSignature}`);
                done();
            });
        });

        it('should calculate correct signature for non-POST request with body', function (done) {
            var rawReq = _.merge({}, requestWithAllParams, {
                    method: 'PUT',
                    body: {
                        mode: 'raw',
                        raw: 'Hello World!!'
                    }
                }),
                request = new Request(rawReq),
                auth = request.auth,
                authInterface = createAuthInterface(auth),
                handler = AuthLoader.getHandler(auth.type),
                expectedSignature = 'qtdfIJzsauPvytI9WdIQoPKH15jGjIgWZyJ37yuzrbM=';

            handler.sign(authInterface, request, function () {
                var headers = request.headers.all(),
                    authHeader;

                expect(headers).to.have.lengthOf(1);

                authHeader = headers[0].toString();

                expect(authHeader).to.include(`signature=${expectedSignature}`);
                done();
            });
        });

        it('should calculate correct signature for POST request with raw body', function (done) {
            var rawReq = _.merge({}, requestWithAllParams, {
                    method: 'POST',
                    body: {
                        mode: 'raw',
                        raw: 'Hello World!!'
                    }
                }),
                request = new Request(rawReq),
                auth = request.auth,
                authInterface = createAuthInterface(auth),
                handler = AuthLoader.getHandler(auth.type),
                expectedSignature = '/206+PqfPKDQ4ljGCU3Jq9kj1D+XrycugYy8GmyVKzg=';

            handler.sign(authInterface, request, function () {
                var headers = request.headers.all(),
                    authHeader;

                expect(headers).to.have.lengthOf(1);

                authHeader = headers[0].toString();

                expect(authHeader).to.include(`signature=${expectedSignature}`);
                done();
            });
        });

        it('should calculate correct signature for POST request with urlencoded body', function (done) {
            var rawReq = _.merge({}, requestWithAllParams, {
                    method: 'POST',
                    body: {
                        mode: 'urlencoded',
                        urlencoded: [{
                            key: 'foo',
                            value: 'bar'
                        }]
                    }
                }),
                request = new Request(rawReq),
                auth = request.auth,
                authInterface = createAuthInterface(auth),
                handler = AuthLoader.getHandler(auth.type),
                expectedSignature = 'CX6gvvw5aaNv0qa9M6Kn2e/+swM914PxBv6wU6jHa84=';

            handler.sign(authInterface, request, function () {
                var headers = request.headers.all(),
                    authHeader;

                expect(headers).to.have.lengthOf(1);

                authHeader = headers[0].toString();

                expect(authHeader).to.include(`signature=${expectedSignature}`);
                done();
            });
        });

        it('should calculate correct signature for POST request with GraphQL body', function (done) {
            var rawReq = _.merge({}, requestWithAllParams, {
                    method: 'POST',
                    body: {
                        mode: 'graphql',
                        graphql: {
                            query: 'query Test { hello }',
                            operationName: 'Test',
                            variables: '{"foo":"bar"}'
                        }
                    }
                }),
                request = new Request(rawReq),
                auth = request.auth,
                authInterface = createAuthInterface(auth),
                handler = AuthLoader.getHandler(auth.type),
                expectedSignature = 'gyJTYlDGTNOGYsOyTvPIWKsEtWBfuILnmMhIIYMcSoU=';

            handler.sign(authInterface, request, function () {
                var headers = request.headers.all(),
                    authHeader;

                expect(headers).to.have.lengthOf(1);

                authHeader = headers[0].toString();

                expect(authHeader).to.include(`signature=${expectedSignature}`);
                done();
            });
        });
    });
});
