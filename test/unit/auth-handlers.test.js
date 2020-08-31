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

        it('should add the Auth header for (algorithm="SHA-256", qop=""', function () {
            var clonedReqObj = _.merge({}, rawRequests.digest, {
                    auth: {
                        digest: {
                            algorithm: 'SHA-256'
                        }
                    }
                }),
                request = new Request(clonedReqObj),
                auth = request.auth,
                authInterface = createAuthInterface(auth),
                handler = AuthLoader.getHandler(auth.type),
                headers,
                authHeader,

                // eslint-disable-next-line max-len
                expectedHeader = 'Authorization: Digest username="postman", realm="Users", nonce="bcgEc5RPU1ANglyT2I0ShU0oxqPB5jXp", uri="/digest-auth", algorithm="SHA-256", response="640a149858bc1b2a90a02453a328bad01c1bad5dad6ba92cf0bf7832fd7dcae2", opaque="5ccc069c403ebaf9f0171e9517f40e"';

            handler.sign(authInterface, request, _.noop);
            headers = request.headers.all();
            authHeader = headers[0];

            expect(headers).to.have.lengthOf(1);
            expect(authHeader.toString()).to.eql(expectedHeader);
            expect(authHeader.system).to.be.true;
        });

        it('should add the Auth header for (algorithm="SHA-256", qop="auth")', function () {
            var clonedReqObj = _.merge({}, rawRequests.digest, {
                    auth: {
                        digest: {
                            algorithm: 'SHA-256',
                            qop: 'auth'
                        }
                    }
                }),
                request = new Request(clonedReqObj),
                auth = request.auth,
                authInterface = createAuthInterface(auth),
                handler = AuthLoader.getHandler(auth.type),
                headers,
                authHeader,

                // eslint-disable-next-line max-len
                expectedHeader = 'Authorization: Digest username="postman", realm="Users", nonce="bcgEc5RPU1ANglyT2I0ShU0oxqPB5jXp", uri="/digest-auth", algorithm="SHA-256", qop=auth, nc=00000001, cnonce="0a4f113b", response="6025934347a57283989281f03d9c4e1adbb3ee50af57827c83182d87e0cb7ec0", opaque="5ccc069c403ebaf9f0171e9517f40e"';

            handler.sign(authInterface, request, _.noop);
            headers = request.headers.all();
            authHeader = headers[0];

            expect(headers).to.have.lengthOf(1);
            expect(authHeader.toString()).to.eql(expectedHeader);
            expect(authHeader.system).to.be.true;
        });

        it('should add the Auth header for (algorithm="SHA-256", qop="auth-int")', function () {
            var clonedReqObj = _.merge({}, rawRequests.digest, {
                    auth: {
                        digest: {
                            algorithm: 'SHA-256',
                            qop: 'auth-int'
                        }
                    }
                }),
                request = new Request(clonedReqObj),
                auth = request.auth,
                authInterface = createAuthInterface(auth),
                handler = AuthLoader.getHandler(auth.type),
                headers,
                authHeader,

                // eslint-disable-next-line max-len
                expectedHeader = 'Authorization: Digest username="postman", realm="Users", nonce="bcgEc5RPU1ANglyT2I0ShU0oxqPB5jXp", uri="/digest-auth", algorithm="SHA-256", qop=auth-int, nc=00000001, cnonce="0a4f113b", response="06ba0831e0043ddc784784a1915acfd6d58792ab8203edaff5082800f8d294a5", opaque="5ccc069c403ebaf9f0171e9517f40e"';

            handler.sign(authInterface, request, _.noop);
            headers = request.headers.all();
            authHeader = headers[0];

            expect(headers).to.have.lengthOf(1);
            expect(authHeader.toString()).to.eql(expectedHeader);
            expect(authHeader.system).to.be.true;
        });

        it('should add the Auth header for (algorithm="SHA-256-sess", qop="")', function () {
            var clonedReqObj = _.merge({}, rawRequests.digest, {
                    auth: {
                        digest: {
                            algorithm: 'SHA-256-sess'
                        }
                    }
                }),
                request = new Request(clonedReqObj),
                auth = request.auth,
                authInterface = createAuthInterface(auth),
                handler = AuthLoader.getHandler(auth.type),
                headers,
                authHeader,

                // eslint-disable-next-line max-len
                expectedHeader = 'Authorization: Digest username="postman", realm="Users", nonce="bcgEc5RPU1ANglyT2I0ShU0oxqPB5jXp", uri="/digest-auth", algorithm="SHA-256-sess", response="0b4e18576fd9f4850dda49eab2a581a5f40bb50f6ecaa17ab4340cd416497e13", opaque="5ccc069c403ebaf9f0171e9517f40e"';

            handler.sign(authInterface, request, _.noop);
            headers = request.headers.all();
            authHeader = headers[0];

            expect(headers).to.have.lengthOf(1);
            expect(authHeader.toString()).to.eql(expectedHeader);
            expect(authHeader.system).to.be.true;
        });

        it('should add the Auth header for (algorithm="SHA-256-sess", qop="auth")', function () {
            var clonedReqObj = _.merge({}, rawRequests.digest, {
                    auth: {
                        digest: {
                            algorithm: 'SHA-256-sess',
                            qop: 'auth'
                        }
                    }
                }),
                request = new Request(clonedReqObj),
                auth = request.auth,
                authInterface = createAuthInterface(auth),
                handler = AuthLoader.getHandler(auth.type),
                headers,
                authHeader,

                // eslint-disable-next-line max-len
                expectedHeader = 'Authorization: Digest username="postman", realm="Users", nonce="bcgEc5RPU1ANglyT2I0ShU0oxqPB5jXp", uri="/digest-auth", algorithm="SHA-256-sess", qop=auth, nc=00000001, cnonce="0a4f113b", response="9388df8d879c3d988419aafca225ccc4626eb089192e992239b5595a532e243d", opaque="5ccc069c403ebaf9f0171e9517f40e"';

            handler.sign(authInterface, request, _.noop);
            headers = request.headers.all();
            authHeader = headers[0];

            expect(headers).to.have.lengthOf(1);
            expect(authHeader.toString()).to.eql(expectedHeader);
            expect(authHeader.system).to.be.true;
        });

        it('should add the Auth header for (algorithm="SHA-256-sess", qop="auth-int")', function () {
            var clonedReqObj = _.merge({}, rawRequests.digest, {
                    auth: {
                        digest: {
                            algorithm: 'SHA-256-sess',
                            qop: 'auth-int'
                        }
                    }
                }),
                request = new Request(clonedReqObj),
                auth = request.auth,
                authInterface = createAuthInterface(auth),
                handler = AuthLoader.getHandler(auth.type),
                headers,
                authHeader,

                // eslint-disable-next-line max-len
                expectedHeader = 'Authorization: Digest username="postman", realm="Users", nonce="bcgEc5RPU1ANglyT2I0ShU0oxqPB5jXp", uri="/digest-auth", algorithm="SHA-256-sess", qop=auth-int, nc=00000001, cnonce="0a4f113b", response="31ecccb1899773a8d2478e6f7042f3174485ce18949731e84c572a1dd48d1539", opaque="5ccc069c403ebaf9f0171e9517f40e"';

            handler.sign(authInterface, request, _.noop);
            headers = request.headers.all();
            authHeader = headers[0];

            expect(headers).to.have.lengthOf(1);
            expect(authHeader.toString()).to.eql(expectedHeader);
            expect(authHeader.system).to.be.true;
        });

        it('should add the Auth header for (algorithm="SHA-512-256", qop=""', function () {
            var clonedReqObj = _.merge({}, rawRequests.digest, {
                    auth: {
                        digest: {
                            algorithm: 'SHA-512-256'
                        }
                    }
                }),
                request = new Request(clonedReqObj),
                auth = request.auth,
                authInterface = createAuthInterface(auth),
                handler = AuthLoader.getHandler(auth.type),
                headers,
                authHeader,

                // eslint-disable-next-line max-len
                expectedHeader = 'Authorization: Digest username="postman", realm="Users", nonce="bcgEc5RPU1ANglyT2I0ShU0oxqPB5jXp", uri="/digest-auth", algorithm="SHA-512-256", response="1676ceef7b880281567d30ca03f2517131fbc4a0c0a16d577cc4ad477b6b8c52", opaque="5ccc069c403ebaf9f0171e9517f40e"';

            handler.sign(authInterface, request, _.noop);
            headers = request.headers.all();
            authHeader = headers[0];

            expect(headers).to.have.lengthOf(1);
            expect(authHeader.toString()).to.eql(expectedHeader);
            expect(authHeader.system).to.be.true;
        });

        it('should add the Auth header for (algorithm="SHA-512-256", qop="auth")', function () {
            var clonedReqObj = _.merge({}, rawRequests.digest, {
                    auth: {
                        digest: {
                            algorithm: 'SHA-512-256',
                            qop: 'auth'
                        }
                    }
                }),
                request = new Request(clonedReqObj),
                auth = request.auth,
                authInterface = createAuthInterface(auth),
                handler = AuthLoader.getHandler(auth.type),
                headers,
                authHeader,

                // eslint-disable-next-line max-len
                expectedHeader = 'Authorization: Digest username="postman", realm="Users", nonce="bcgEc5RPU1ANglyT2I0ShU0oxqPB5jXp", uri="/digest-auth", algorithm="SHA-512-256", qop=auth, nc=00000001, cnonce="0a4f113b", response="fb53cf8c6922b758cf05477afd5cd896ad0213f16588ed15089da72a2900cb19", opaque="5ccc069c403ebaf9f0171e9517f40e"';

            handler.sign(authInterface, request, _.noop);
            headers = request.headers.all();
            authHeader = headers[0];

            expect(headers).to.have.lengthOf(1);
            expect(authHeader.toString()).to.eql(expectedHeader);
            expect(authHeader.system).to.be.true;
        });

        it('should add the Auth header for (algorithm="SHA-512-256", qop="auth-int")', function () {
            var clonedReqObj = _.merge({}, rawRequests.digest, {
                    auth: {
                        digest: {
                            algorithm: 'SHA-512-256',
                            qop: 'auth-int'
                        }
                    }
                }),
                request = new Request(clonedReqObj),
                auth = request.auth,
                authInterface = createAuthInterface(auth),
                handler = AuthLoader.getHandler(auth.type),
                headers,
                authHeader,

                // eslint-disable-next-line max-len
                expectedHeader = 'Authorization: Digest username="postman", realm="Users", nonce="bcgEc5RPU1ANglyT2I0ShU0oxqPB5jXp", uri="/digest-auth", algorithm="SHA-512-256", qop=auth-int, nc=00000001, cnonce="0a4f113b", response="f928c7ae0b0d4e4fe870e2fe66ccb85362e08b7c9ac33dcc527915019dec7aa2", opaque="5ccc069c403ebaf9f0171e9517f40e"';

            handler.sign(authInterface, request, _.noop);
            headers = request.headers.all();
            authHeader = headers[0];

            expect(headers).to.have.lengthOf(1);
            expect(authHeader.toString()).to.eql(expectedHeader);
            expect(authHeader.system).to.be.true;
        });

        it('should add the Auth header for (algorithm="SHA-512-256-sess", qop="")', function () {
            var clonedReqObj = _.merge({}, rawRequests.digest, {
                    auth: {
                        digest: {
                            algorithm: 'SHA-512-256-sess'
                        }
                    }
                }),
                request = new Request(clonedReqObj),
                auth = request.auth,
                authInterface = createAuthInterface(auth),
                handler = AuthLoader.getHandler(auth.type),
                headers,
                authHeader,

                // eslint-disable-next-line max-len
                expectedHeader = 'Authorization: Digest username="postman", realm="Users", nonce="bcgEc5RPU1ANglyT2I0ShU0oxqPB5jXp", uri="/digest-auth", algorithm="SHA-512-256-sess", response="501c722984db1ecab705757c060e359debac8c9ee98bea00fc70c111977fcaba", opaque="5ccc069c403ebaf9f0171e9517f40e"';

            handler.sign(authInterface, request, _.noop);
            headers = request.headers.all();
            authHeader = headers[0];

            expect(headers).to.have.lengthOf(1);
            expect(authHeader.toString()).to.eql(expectedHeader);
            expect(authHeader.system).to.be.true;
        });

        it('should add the Auth header for (algorithm="SHA-512-256-sess", qop="auth")', function () {
            var clonedReqObj = _.merge({}, rawRequests.digest, {
                    auth: {
                        digest: {
                            algorithm: 'SHA-512-256-sess',
                            qop: 'auth'
                        }
                    }
                }),
                request = new Request(clonedReqObj),
                auth = request.auth,
                authInterface = createAuthInterface(auth),
                handler = AuthLoader.getHandler(auth.type),
                headers,
                authHeader,

                // eslint-disable-next-line max-len
                expectedHeader = 'Authorization: Digest username="postman", realm="Users", nonce="bcgEc5RPU1ANglyT2I0ShU0oxqPB5jXp", uri="/digest-auth", algorithm="SHA-512-256-sess", qop=auth, nc=00000001, cnonce="0a4f113b", response="5b0af1e60cff4aaa751326f6e837ea5d32c77324254f6c0c9882ff6cc0947799", opaque="5ccc069c403ebaf9f0171e9517f40e"';

            handler.sign(authInterface, request, _.noop);
            headers = request.headers.all();
            authHeader = headers[0];

            expect(headers).to.have.lengthOf(1);
            expect(authHeader.toString()).to.eql(expectedHeader);
            expect(authHeader.system).to.be.true;
        });

        it('should add the Auth header for (algorithm="SHA-512-256-sess", qop="auth-int")', function () {
            var clonedReqObj = _.merge({}, rawRequests.digest, {
                    auth: {
                        digest: {
                            algorithm: 'SHA-512-256-sess',
                            qop: 'auth-int'
                        }
                    }
                }),
                request = new Request(clonedReqObj),
                auth = request.auth,
                authInterface = createAuthInterface(auth),
                handler = AuthLoader.getHandler(auth.type),
                headers,
                authHeader,

                // eslint-disable-next-line max-len
                expectedHeader = 'Authorization: Digest username="postman", realm="Users", nonce="bcgEc5RPU1ANglyT2I0ShU0oxqPB5jXp", uri="/digest-auth", algorithm="SHA-512-256-sess", qop=auth-int, nc=00000001, cnonce="0a4f113b", response="6e12487570a4f493953dd7e378924eee9a61dea0e6f0ee59854cf2c77c223f53", opaque="5ccc069c403ebaf9f0171e9517f40e"';

            handler.sign(authInterface, request, _.noop);
            headers = request.headers.all();
            authHeader = headers[0];

            expect(headers).to.have.lengthOf(1);
            expect(authHeader.toString()).to.eql(expectedHeader);
            expect(authHeader.system).to.be.true;
        });

        it('should add correct Auth header for request with raw body and (qop="auth-int")', function () {
            var clonedReqObj = _.merge({}, rawRequests.digest, {
                    auth: {
                        digest: {
                            algorithm: 'SHA-512-256',
                            qop: 'auth-int'
                        }
                    },
                    body: {
                        mode: 'raw',
                        raw: 'Hello Postman!!!'
                    }
                }),
                request = new Request(clonedReqObj),
                auth = request.auth,
                authInterface = createAuthInterface(auth),
                handler = AuthLoader.getHandler(auth.type),
                headers,
                authHeader,

                // eslint-disable-next-line max-len
                expectedHeader = 'Authorization: Digest username="postman", realm="Users", nonce="bcgEc5RPU1ANglyT2I0ShU0oxqPB5jXp", uri="/digest-auth", algorithm="SHA-512-256", qop=auth-int, nc=00000001, cnonce="0a4f113b", response="08af7d82b032a502331788f1e56e16337910c11a887b99c60abf86e9c26fab2a", opaque="5ccc069c403ebaf9f0171e9517f40e"';

            handler.sign(authInterface, request, _.noop);
            headers = request.headers.all();
            authHeader = headers[0];

            expect(headers).to.have.lengthOf(1);
            expect(authHeader.toString()).to.eql(expectedHeader);
            expect(authHeader.system).to.be.true;
        });

        it('should add correct Auth header for request with urlencoded body and (qop="auth-int")', function () {
            var clonedReqObj = _.merge({}, rawRequests.digest, {
                    auth: {
                        digest: {
                            algorithm: 'SHA-512-256',
                            qop: 'auth-int'
                        }
                    },
                    body: {
                        mode: 'urlencoded',
                        urlencoded: [
                            {key: 'foo', value: 'bar'},
                            {key: 'postman', value: '邮差'},
                            {key: 'alpha', value: 'beta', disabled: true}
                        ]
                    }
                }),
                request = new Request(clonedReqObj),
                auth = request.auth,
                authInterface = createAuthInterface(auth),
                handler = AuthLoader.getHandler(auth.type),
                headers,
                authHeader,

                // eslint-disable-next-line max-len
                expectedHeader = 'Authorization: Digest username="postman", realm="Users", nonce="bcgEc5RPU1ANglyT2I0ShU0oxqPB5jXp", uri="/digest-auth", algorithm="SHA-512-256", qop=auth-int, nc=00000001, cnonce="0a4f113b", response="cbfd61ad1bc2a4c9bb3d058e2b9b9d231e11501261c2115a8f23f787d296d6f4", opaque="5ccc069c403ebaf9f0171e9517f40e"';

            handler.sign(authInterface, request, _.noop);
            headers = request.headers.all();
            authHeader = headers[0];

            expect(headers).to.have.lengthOf(1);
            expect(authHeader.toString()).to.eql(expectedHeader);
            expect(authHeader.system).to.be.true;
        });

        it('should add correct Auth header for request with GraphQL body and (qop="auth-int")', function () {
            var clonedReqObj = _.merge({}, rawRequests.digest, {
                    auth: {
                        digest: {
                            algorithm: 'SHA-512-256',
                            qop: 'auth-int'
                        }
                    },
                    body: {
                        mode: 'graphql',
                        graphql: {
                            query: 'query Test { hello }',
                            operationName: 'Test',
                            variables: '{"foo":"bar"}'
                        }
                    }
                }),
                request = new Request(clonedReqObj),
                auth = request.auth,
                authInterface = createAuthInterface(auth),
                handler = AuthLoader.getHandler(auth.type),
                headers,
                authHeader,

                // eslint-disable-next-line max-len
                expectedHeader = 'Authorization: Digest username="postman", realm="Users", nonce="bcgEc5RPU1ANglyT2I0ShU0oxqPB5jXp", uri="/digest-auth", algorithm="SHA-512-256", qop=auth-int, nc=00000001, cnonce="0a4f113b", response="88f80bf9c08dd1250ae6fa848f48147aaebc0d56b7f41f04ccd8de4f217d0256", opaque="5ccc069c403ebaf9f0171e9517f40e"';

            handler.sign(authInterface, request, _.noop);
            headers = request.headers.all();
            authHeader = headers[0];

            expect(headers).to.have.lengthOf(1);
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

        it('should give error for unsupported algorithm', function () {
            var request = new Request(_.merge({}, rawRequests.digest, {
                    auth: {
                        digest: {
                            algorithm: 'Unknown algorithm'
                        }
                    }
                })),
                auth = request.auth,
                authInterface = createAuthInterface(auth),
                handler = AuthLoader.getHandler(auth.type);

            handler.sign(authInterface, request, function (err) {
                expect(err).to.be.ok;
            });
        });

        it('should default to MD5 algorithm when not provided', function () {
            var request = new Request(_.merge({}, rawRequests.digest, {
                    auth: {
                        digest: {
                            algorithm: null
                        }
                    }
                })),
                auth = request.auth,
                authInterface = createAuthInterface(auth),
                handler = AuthLoader.getHandler(auth.type),
                authHeader;

            handler.sign(authInterface, request, _.noop);
            authHeader = request.headers.one('Authorization');

            expect(authHeader.toString()).to.include('algorithm="MD5"');
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

        it('should bail out if consumerKey is absent', function () {
            var request = new Request(_.omit(rawRequests.oauth1, ['header', 'auth.oauth1.consumerKey'])),
                auth = request.auth,
                authInterface = createAuthInterface(auth),
                handler = AuthLoader.getHandler(auth.type);

            handler.sign(authInterface, request, _.noop);

            expect(request.headers.all()).to.be.an('array').that.is.empty;
        });

        it('should bail out if consumerSecret is absent for HMAC signature', function () {
            var request = new Request(_.omit(rawRequests.oauth1, ['header', 'auth.oauth1.consumerSecret'])),
                auth = request.auth,
                authInterface = createAuthInterface(auth),
                handler = AuthLoader.getHandler(auth.type);

            handler.sign(authInterface, request, _.noop);

            expect(request.headers.all()).to.be.an('array').that.is.empty;
        });

        it('should bail out if consumerSecret is absent for PLAINTEXT signature', function () {
            var request = new Request(_(rawRequests.oauth1).omit(['header', 'auth.oauth1.consumerSecret']).merge({
                    auth: {
                        oauth1: {
                            signatureMethod: 'PLAINTEXT'
                        }
                    }
                }).value()),
                auth = request.auth,
                authInterface = createAuthInterface(auth),
                handler = AuthLoader.getHandler(auth.type);

            handler.sign(authInterface, request, _.noop);

            expect(request.headers.all()).to.be.an('array').that.is.empty;
        });

        it('should bail out if privateKey is absent for RSA signature', function () {
            var request = new Request(_(rawRequests.oauth1).omit(['header', 'auth.oauth1.consumerSecret']).merge({
                    auth: {
                        oauth1: {
                            signatureMethod: 'RSA-SHA1',
                            privateKey: undefined
                        }
                    }
                }).value()),
                auth = request.auth,
                authInterface = createAuthInterface(auth),
                handler = AuthLoader.getHandler(auth.type);

            handler.sign(authInterface, request, _.noop);

            expect(request.headers.all()).to.be.an('array').that.is.empty;
        });

        it('should pass invalid privateKey error in callback for RSA signature', function () {
            var request = new Request(_(rawRequests.oauth1).omit(['header', 'auth.oauth1.consumerSecret']).merge({
                    auth: {
                        oauth1: {
                            signatureMethod: 'RSA-SHA1',
                            privateKey: 'invalid key'
                        }
                    }
                }).value()),
                auth = request.auth,
                authInterface = createAuthInterface(auth),
                handler = AuthLoader.getHandler(auth.type);

            handler.sign(authInterface, request, function (err) {
                expect(err).to.be.ok;
            });
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

        it('should include body hash when includeBodyHash:true', function () {
            var rawReq = _.merge({}, rawRequests.oauth1, {
                    auth: {
                        oauth1: {
                            includeBodyHash: true
                        }
                    },
                    body: {
                        mode: 'raw',
                        raw: 'Hello World!!'
                    }
                }),
                request = new Request(rawReq),
                auth = request.auth,
                authInterface = createAuthInterface(auth),
                handler = AuthLoader.getHandler(auth.type);

            handler.sign(authInterface, request, _.noop);

            expect(request.headers.get('Authorization')).to.include('oauth_body_hash');
        });

        it('should not include body hash when includeBodyHash:false', function () {
            var rawReq = _.merge({}, rawRequests.oauth1, {
                    auth: {
                        oauth1: {
                            includeBodyHash: false
                        }
                    },
                    body: {
                        mode: 'raw',
                        raw: 'Hello World!!'
                    }
                }),
                request = new Request(rawReq),
                auth = request.auth,
                authInterface = createAuthInterface(auth),
                handler = AuthLoader.getHandler(auth.type);

            handler.sign(authInterface, request, _.noop);

            expect(request.headers.get('Authorization')).to.not.include('oauth_body_hash');
        });

        it('should not include body hash for url-encoded body when includeBodyHash:true', function () {
            var rawReq = _.merge({}, rawRequests.oauth1, {
                    auth: {
                        oauth1: {
                            includeBodyHash: true
                        }
                    },
                    body: {
                        mode: 'urlencoded',
                        urlencoded: [{
                            key: 'haha',
                            value: 'somevalue'
                        }]
                    }
                }),
                request = new Request(rawReq),
                auth = request.auth,
                authInterface = createAuthInterface(auth),
                handler = AuthLoader.getHandler(auth.type);

            handler.sign(authInterface, request, _.noop);

            expect(request.headers.get('Authorization')).to.not.include('oauth_body_hash');
        });

        it('should include correct body hash for empty body', function () {
            var rawReq = _.merge({}, rawRequests.oauth1, {
                    auth: {
                        oauth1: {
                            addParamsToHeader: false,
                            includeBodyHash: true
                        }
                    },
                    body: {}
                }),
                request = new Request(rawReq),
                auth = request.auth,
                authInterface = createAuthInterface(auth),
                handler = AuthLoader.getHandler(auth.type);

            handler.sign(authInterface, request, _.noop);

            expect(request.url.query.get('oauth_body_hash')).to.eql('2jmj7l5rSw0yVb/vlWAYkK/YBwk=');
        });

        it('should include correct body hash for raw body', function () {
            var rawReq = _.merge({}, rawRequests.oauth1, {
                    auth: {
                        oauth1: {
                            addParamsToHeader: false,
                            includeBodyHash: true
                        }
                    },
                    body: {
                        mode: 'raw',
                        raw: 'Hello World!!'
                    }
                }),
                request = new Request(rawReq),
                auth = request.auth,
                authInterface = createAuthInterface(auth),
                handler = AuthLoader.getHandler(auth.type);

            handler.sign(authInterface, request, _.noop);

            expect(request.url.query.get('oauth_body_hash')).to.eql('pqfIFYs01VSVSkySGxRPgtddtoM=');
        });

        it('should include correct body hash for GraphQL body', function () {
            var rawReq = _.merge({}, rawRequests.oauth1, {
                    auth: {
                        oauth1: {
                            addParamsToHeader: false,
                            includeBodyHash: true
                        }
                    },
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
                handler = AuthLoader.getHandler(auth.type);

            handler.sign(authInterface, request, _.noop);

            expect(request.url.query.get('oauth_body_hash')).to.eql('2jwsdzjZEuFdm6ubMtk0HZi34+U=');
        });

        it('should include all non-empty oauth1 params in request', function () {
            var rawReq = {
                    url: 'https://postman-echo.com/oauth1',
                    auth: {
                        type: 'oauth1',
                        oauth1: {
                            consumerKey: 'RKCGzna7bv9YD57c',
                            consumerSecret: 'D+EdQ-gs$-%@2Nu7',
                            token: 'foo',
                            tokenSecret: 'bar',
                            signatureMethod: 'HMAC-SHA1',
                            timestamp: '1461319769',
                            nonce: 'ik3oT5',
                            version: '1.0',
                            realm: 'foo',
                            verifier: 'bar',
                            callback: 'http://postman.com',
                            addParamsToHeader: false,
                            addEmptyParamsToSign: false
                        }
                    }
                },
                request = new Request(rawReq),
                auth = request.auth,
                authInterface = createAuthInterface(auth),
                handler = AuthLoader.getHandler(auth.type);

            handler.sign(authInterface, request, function () {
                expect(request.url.query.toObject()).to.include({
                    oauth_consumer_key: 'RKCGzna7bv9YD57c',
                    oauth_token: 'foo',
                    oauth_signature_method: 'HMAC-SHA1',
                    oauth_timestamp: '1461319769',
                    oauth_nonce: 'ik3oT5',
                    oauth_version: '1.0',
                    oauth_callback: 'http://postman.com',
                    oauth_verifier: 'bar',
                    oauth_signature: 'WHnpdWcwWzBM3bHcRQNshHVh2Og='
                });
            });
        });

        // issue: https://github.com/postmanlabs/postman-app-support/issues/8737
        it('should generate correct signature for empty callback and addEmptyParamsToSign:true', function () {
            var rawReq = {
                    url: 'https://postman-echo.com/oauth1',
                    auth: {
                        type: 'oauth1',
                        oauth1: {
                            consumerKey: 'RKCGzna7bv9YD57c',
                            consumerSecret: 'D+EdQ-gs$-%@2Nu7',
                            token: 'foo',
                            tokenSecret: 'bar',
                            signatureMethod: 'HMAC-SHA1',
                            timestamp: '1461319769',
                            nonce: 'ik3oT5',
                            version: '1.0',
                            verifier: 'bar',
                            callback: '',
                            addParamsToHeader: false,
                            addEmptyParamsToSign: true
                        }
                    }
                },
                request = new Request(rawReq),
                auth = request.auth,
                authInterface = createAuthInterface(auth),
                handler = AuthLoader.getHandler(auth.type);

            handler.sign(authInterface, request, function () {
                expect(request.url.query.get('oauth_signature')).to.eql('w8WS1SXfe/dtJu/4tH5DaD7qZgM=');
            });
        });

        // issue: https://github.com/postmanlabs/postman-app-support/issues/8737
        it('should generate correct signature for empty verifier and addEmptyParamsToSign:true', function () {
            var rawReq = {
                    url: 'https://postman-echo.com/oauth1',
                    auth: {
                        type: 'oauth1',
                        oauth1: {
                            consumerKey: 'RKCGzna7bv9YD57c',
                            consumerSecret: 'D+EdQ-gs$-%@2Nu7',
                            token: 'foo',
                            tokenSecret: 'bar',
                            signatureMethod: 'HMAC-SHA1',
                            timestamp: '1461319769',
                            nonce: 'ik3oT5',
                            version: '1.0',
                            verifier: '',
                            callback: 'http://postman.com',
                            addParamsToHeader: false,
                            addEmptyParamsToSign: true
                        }
                    }
                },
                request = new Request(rawReq),
                auth = request.auth,
                authInterface = createAuthInterface(auth),
                handler = AuthLoader.getHandler(auth.type);

            handler.sign(authInterface, request, function () {
                expect(request.url.query.get('oauth_signature')).to.eql('WO1RMBRLIM5Anfxxt8P7Kbt82b4=');
            });
        });

        it('should generate correct signature for RSA based signature method', function () {
            // eslint-disable-next-line max-len
            var privateKey = '-----BEGIN RSA PRIVATE KEY-----\nMIICWwIBAAKBgFKLvzM9zbm3I0+HWcHlBSqpfRY/bKs6NDLclERrzfnReFV4utjkhjaEQPPT6tHVHKrZkcxmIgwe3XrkJkUjcuingXIF+Fc3KpY61qJ4HSM50qIuHdi+C5YfuXwNrh6OOeZAhhqgSw2e2XqPfATbkYYwpIFpdVdcH/Pb2ynpd6VXAgMBAAECgYAbQE+LFyhH25Iou0KCpJ0kDHhjU+UIUlrRP8kjHYQOqXzUmtr0p903OkpHNPsc8wJX1SQxGra60aXE4HVR9fYFQNliAnSmA/ztGR4ddnirK1Gzog4y2OOkicTdSqJ/1XXtTEDSRkA0Z2DIqcWgudeSDzVjUpreYwQ/rCEZbi50AQJBAJcf9wi5bU8tdZUCg3/8MNDwHhr4If4V/9kmhsgNp+M/9tHwCbD05hCbiGS7g58DPF+6V2K30qQYq7yvBP8Te4ECQQCL1GhX/YwkD6rexi0E1bjz+RqhNLTR9kexkTfSYmL6zHeeIFSH8ROioGOJMU51lUtMNkkrKEeki5SZpkfaQOzXAkAvBnJPU6vQ7HtfH8YdiDMEgQNNLxMcxmmzf4qHK8CnNRsvnnrVho8kcdFSTwsY6t/Zhdl1TXANQeQGtYtfeAeBAkEAhUB351JSWJMtrHqCsFbTmHxNKk7F+kiObeMLpUvpM0PiwifhJmNQ6Oubr0Pzlw4c4ZXiCGSsUVxK0lmpo423pQJATYDoxVhZrKA3xDAifWoyxbyxf/WXtUGDaAOuZc/naVN5TKiqaEO6G+k3NpmOXNKsYU/Zd9e6P/TnfU74TyDDDA==\n-----END RSA PRIVATE KEY-----',
                // eslint-disable-next-line max-len
                signature = 'Bi/ocoeczWLcYlMpYtW9HdFh41YMEFXSWpdzFZkJKJ8T7rBsuYoC/VDeCUx52DLiHMlkrnfVwmNfnvwyUusEPIOq61Ytb0w3Oq3V2G5jE58+SYMmgKEZQuP6znqfadWq+u8z3nv1oiN4xacJpIRtFh4M1iDz8q+pLvxl3of+toE=',
                rawReq = _.merge({}, rawRequests.oauth1, {
                    auth: {
                        oauth1: {
                            signatureMethod: 'RSA-SHA1',
                            addParamsToHeader: false,
                            includeBodyHash: true,
                            privateKey: privateKey
                        }
                    },
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
                handler = AuthLoader.getHandler(auth.type);

            handler.sign(authInterface, request, _.noop);

            expect(request.url.query.get('oauth_signature')).to.eql(signature);
        });

        it('should generate correct signature for request with disabled query params', function () {
            var rawReq = _(rawRequests.oauth1).omit(['auth.oauth1.nonce', 'auth.oauth1.timestamp']).merge({
                    url: {
                        host: ['postman-echo', 'com'],
                        path: ['auth', 'oauth1'],
                        protocol: 'https',
                        query: [
                            {key: 'param_1', value: 'value_1'},
                            {key: 'param_2', value: 'value_2', disabled: true}
                        ]
                    },
                    auth: {
                        oauth1: {
                            consumerKey: 'RKCGzna7bv9YD57c',
                            consumerSecret: 'D+EdQ-gs$-%@2Nu7',
                            token: 'foo',
                            tokenSecret: 'bar',
                            signatureMethod: 'HMAC-SHA1',
                            timestamp: 1461319769,
                            nonce: 'ik3oT5',
                            version: '1.0',
                            realm: '',
                            addParamsToHeader: false,
                            addEmptyParamsToSign: false
                        }
                    }
                }).value(),
                request = new Request(rawReq),
                auth = request.auth,
                authInterface = createAuthInterface(auth),
                handler = AuthLoader.getHandler(auth.type);

            handler.sign(authInterface, request, function () {
                expect(request.url.query.get('oauth_signature')).to.eql('e8WDYQsG8SYPoWnxU4CYbqHT1HU=');
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

        it('should use custom header prefix when provided', function () {
            var clonedRequestObj,
                request,
                auth,
                authInterface,
                handler;

            clonedRequestObj = _.cloneDeep(requestObj);
            clonedRequestObj.auth.oauth2.headerPrefix = 'Postman ';

            request = new Request(clonedRequestObj);
            auth = request.auth;
            authInterface = createAuthInterface(auth);
            handler = AuthLoader.getHandler(auth.type);

            handler.sign(authInterface, request, _.noop);

            expect(request.headers.all()).to.be.an('array').that.has.lengthOf(1);
            expect(request.headers.toJSON()[0]).to.eql({
                key: 'Authorization',
                value: 'Postman ' + requestObj.auth.oauth2.accessToken,
                system: true
            });
        });

        it('should separate custom header prefix and token with a space', function () {
            var clonedRequestObj,
                request,
                auth,
                authInterface,
                handler;

            clonedRequestObj = _.cloneDeep(requestObj);
            clonedRequestObj.auth.oauth2.headerPrefix = 'Postman';

            request = new Request(clonedRequestObj);
            auth = request.auth;
            authInterface = createAuthInterface(auth);
            handler = AuthLoader.getHandler(auth.type);

            handler.sign(authInterface, request, _.noop);

            expect(request.headers.all()).to.be.an('array').that.has.lengthOf(1);
            expect(request.headers.toJSON()[0]).to.eql({
                key: 'Authorization',
                value: 'Postman ' + requestObj.auth.oauth2.accessToken,
                system: true
            });
        });

        it('should trim extra spaces in custom header prefix', function () {
            var clonedRequestObj,
                request,
                auth,
                authInterface,
                handler;

            clonedRequestObj = _.cloneDeep(requestObj);
            clonedRequestObj.auth.oauth2.headerPrefix = '     Postman     ';

            request = new Request(clonedRequestObj);
            auth = request.auth;
            authInterface = createAuthInterface(auth);
            handler = AuthLoader.getHandler(auth.type);

            handler.sign(authInterface, request, _.noop);

            expect(request.headers.all()).to.be.an('array').that.has.lengthOf(1);
            expect(request.headers.toJSON()[0]).to.eql({
                key: 'Authorization',
                value: 'Postman ' + requestObj.auth.oauth2.accessToken,
                system: true
            });
        });

        it('should add empty header prefix when headerPrefix = ""', function () {
            var clonedRequestObj,
                request,
                auth,
                authInterface,
                handler;

            clonedRequestObj = _.cloneDeep(requestObj);
            clonedRequestObj.auth.oauth2.headerPrefix = '';

            request = new Request(clonedRequestObj);
            auth = request.auth;
            authInterface = createAuthInterface(auth);
            handler = AuthLoader.getHandler(auth.type);

            handler.sign(authInterface, request, _.noop);

            expect(request.headers.all()).to.be.an('array').that.has.lengthOf(1);
            expect(request.headers.toJSON()[0]).to.eql({
                key: 'Authorization',
                value: requestObj.auth.oauth2.accessToken,
                system: true
            });
        });

        it('should add default header prefix when headerPrefix = undefined', function () {
            var clonedRequestObj,
                request,
                auth,
                authInterface,
                handler;

            clonedRequestObj = _.cloneDeep(requestObj);
            clonedRequestObj.auth.oauth2.headerPrefix = undefined;

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

        it('should list all modified headers in manifest', function (done) {
            var requestJSON = _.assign({}, rawRequests.awsv4, {
                    header: [],
                    body: {
                        mode: 'raw',
                        raw: 'Hello'
                    }
                }),
                request = new Request(requestJSON),
                auth = request.auth,
                authInterface = createAuthInterface(auth),
                handler = AuthLoader.getHandler(auth.type),
                headersInManifest = _.transform(handler.manifest.updates, function (acc, entity) {
                    if (entity.type === 'header') {
                        acc.push(entity.property.toLowerCase());
                    }
                }, []),
                headers;

            handler.sign(authInterface, request, function () {
                headers = request.getHeaders({
                    ignoreCase: true
                });

                // ensure that all the headers added are listed in manifest
                expect(_.difference(Object.keys(headers), headersInManifest)).to.be.empty;

                // ensure that there are no extra headers in manifest that
                // are not added by the auth
                expect(headers).to.include.keys(headersInManifest);
                done();
            });
        });

        it('should list all modified query params in manifest', function (done) {
            var requestJSON = _.merge({}, rawRequests.awsv4, {
                    auth: {
                        awsv4: {
                            service: 's3',
                            addAuthDataToQuery: true
                        }
                    }
                }),
                request = new Request(requestJSON),
                auth = request.auth,
                authInterface = createAuthInterface(auth),
                handler = AuthLoader.getHandler(auth.type),
                paramsInManifest = _.transform(handler.manifest.updates, function (acc, entity) {
                    if (entity.type === 'url.param') {
                        acc.push(entity.property);
                    }
                }, []),
                params;

            handler.sign(authInterface, request, function () {
                params = request.url.query.toObject();

                // ensure that all the params added are listed in manifest
                expect(_.difference(Object.keys(params), paramsInManifest)).to.be.empty;

                // ensure that there are no extra params in manifest that
                // are not added by the auth
                expect(params).to.include.keys(paramsInManifest);
                done();
            });
        });

        it('should not modify query params when `addAuthDataToQuery: false`', function (done) {
            var requestJSON = _.merge({}, rawRequests.awsv4, {
                    auth: {
                        awsv4: {
                            service: 's3',
                            addAuthDataToQuery: false
                        }
                    }
                }),
                request = new Request(requestJSON),
                auth = request.auth,
                authInterface = createAuthInterface(auth),
                handler = AuthLoader.getHandler(auth.type);

            handler.sign(authInterface, request, function () {
                expect(request.url.query.count()).to.eql(0);
                done();
            });
        });

        it('should not add auth data to headers when `addAuthDataToQuery: true`', function (done) {
            var requestJSON = _.merge({}, rawRequests.awsv4, {
                    auth: {
                        awsv4: {
                            service: 's3',
                            addAuthDataToQuery: true
                        }
                    }
                }),
                request = new Request(requestJSON),
                auth = request.auth,
                authInterface = createAuthInterface(auth),
                handler = AuthLoader.getHandler(auth.type),
                headers;

            handler.sign(authInterface, request, function () {
                headers = request.getHeaders({
                    ignoreCase: true
                });

                expect(headers).to.not.include.keys([
                    'authorization',
                    'x-amz-date',
                    'X-amz-security-token',
                    'x-amz-content-sha256'
                ]);
                done();
            });
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
