const expect = require('chai').expect,
    jwt = require('jsonwebtoken'),
    Header = require('postman-collection').Header,
    QueryParam = require('postman-collection').QueryParam,
    AUTHORIZATION_HEADER = 'authorizationHeader',
    QUERY_PARAM = 'queryParam';

// eslint-disable-next-line
const secretPrivatekey = `-----BEGIN RSA PRIVATE KEY-----
MIIJJwIBAAKCAgEAtUxvcPYA3IKl19HxJXvhnHAIEzXCRF8z13dCIx8+AfLmiY5C
/fA4k+jiXtXwQcAtzUHtj27V/imWv5uYQdWh8l8rBsRdA9uLWxzXA5qc4w+cCoNv
pPPmtR/aik4u6tCMQl85bQivaMrzUQKRlMyoMhDncVlRx+yJ+HqfoL8LYbrYfIy6
RYeMGDr3R8T+VWJ3B6VyDKPVoXFw4GOqNsA1uU8NTjBjKp+iOLOwTuPr4Txi+/eD
KptJiMDwYBXgaQSfvOAPjaAkC4sWc17ZyE1lsZAu2qO6ntAtE4K/wAddOc08+h8y
9SANdG81yV+z/uI9BfaBX+X9uSifxm0HCF5QYqO/fF5ckQk8Obgmh6cQ009WPNhS
2IvL5KjPdpyYKGLXuWnaogKTVzrroiY1kEV3tpfep61qYsrnzkfnRb7G0puiL0tl
45gTLDN6c4J4LdhElSpOtI6yb59nCjjycmjsyArBlhaeHTmVDPTLWmfppi9jDzRx
UF9QRMjrVLTurvTcSzKcOGFWjegrkjGOomrg9wuaEp3hZhT0qxxuG1ODYoyMXyF9
yDP4WCRIKVFgp+WNXzkoJ3FY7uEQoa13HWBvLjyNTSDWlGFpnKW1h5ByEoZxr75u
QnKXRp3bd+6kfZ1Spq0sTABO9YTUuLlHpircq7SQ+Ojyvg0I+Zs6EGfvqw0CAwEA
AQKCAgBzOs+h5lmJzegGkkNI5cHxoisfuo1s022pxvzcQeExb+cjCq59pA7xw5UN
XcDEqZby3LJW9cVBM8HCquxM+7Fg0SgRtwC/kOyzzlLC0aRhlOxCqmNtXjAGcuZ9
/U9Io6BiFw/ywxBp9IRNuuo4vxMwLxpLKtAV17uhmJ6YlpRvW0h5cSB7TLm4NNIy
ZXyZXGn3DCq+6erAH8/0bqQjBGuhCiOUzKBa2PdMPrkSiz7C+5SWPSy7CdPk/WxK
Rd1KIkw8ydRY2a3PQGnWjjSxYK//+XouMN5OTlY4DmQ9cvDH6jCVcPr8XZDvrjdr
dE588+KBRbnY798hrjZO8cEEip1f4gCjI0xl9Cda9gQToiqp3BgaUxGf9RXCZXLS
xE9IJaGZktF9OAErwFQpoTiwwkuTh896DF51dSLuC9xfxvpqY/8+NLS3pIF7WZ8j
vqa2Jmb3gsOtKfYUP7dSj/kZv9aH13NUuUWn5B+b/VtVVw1H1NujS0n01QPbnq4Z
VcB13xO5URLa2iiR4bu/HBADyR/AWQHQwVsqSj492P4eLnlBYFS36qzROZg4AweN
r7hlOcpZoS8bN4DLpU+HeouiHGrUTvNBphNoro3EeFFyiYOyybLBv4CU4FYN6xgB
kHCAi3o88CP/ZvFAHrxBAtbJ83waRNOZV5Gg3H4BZSJSq2z8AQKCAQEA5Qyhgeww
oJR6n/hRg3MOo65uwWT1MdMtKWnvztdJXosHBzvdxvPdDDFEIXtQWFJAnSD1Hki2
3RiZYdt7ZJNHMmEm4KpsdGKp/QNrSTJ5upURzxoH3UmKWUZQZh2qgrkNNyrjqQxr
R753M8sERHT45IOeXV2CWtknmKH3rl0/WgKD+Mi8UiMHrU/KhfGcZCuIbxyH6D9H
o8B3IFDHDtes1/aMQ/JYCaCWh1tUeclRMNzmDdlpk9VTl7SZkY+CYe/Pa7a4VUfO
a8rysknYjaGnQ1+Ezt7OHDtUGS3mrt8D+rLJa0qzjbfV10j7EMLRMiVVngexk3Yl
g+YZwg2CGxr5jQKCAQEAyqF3p6YYmNr73mDeLY74BU/IBcUyNfurhKAYar5ADfAY
g8Oz9jWJSspiNrdP5kkVWHi6u+tkcVQfSO402hh+jSw4wrkguJKHrQDjSdBsVnEl
Nyvfx5naMCP7Qb3Yn1zyKf4LelmmYSe/Il5KTJenXfPuH8Z6CMmpUsqMqDSpBb37
89kjpqa8CpEKgHAZIgLyb31F2zWop3TVHA+d3hZduUSPvnRRaLCdnXf4L3O2IBwE
bNSPMJgHRNEOc3n70//NYZzqwV+nhnzIE89T1ldX8W6a4AJhPh04lh7U6ZGr9S7p
uAYOO8otVYjkBr+hd61bXiYSLWKVeWwMPTS4Ae1XgQKCAQAbpSihK8a6uvEJ+cis
2ug7bURE51CI0Po0c2rURju+w3z3rIwaBTj6zb9xYxbRciwGSwIKw6/+g4ePvhPo
kbYYKI2utCMe8QGfXhhG32a91Fwv6O5mEQg3ujrd+FqqKHel3vFXZ/5SzHRKtggv
0wZvXktw7WZcXLVgwLvKOcr5rDANiPzh1QSKMIU7IWxE0tRGxOTKbUjSRNqb9ePw
sKtV7ZYEZW2my9EfSTCq+ldoVGEX7tPFWgwa1VtrrCyKcY1RbN5WvLH3ZKliR3Nx
tL8hbJf0+ANcePSvjVC4boZmbcnNv1holHWk5FQZM8pYCRWKW1ddevcQMmeNel/n
sZvJAoIBAB5DV1eWmv3ZVtyzovsy6x//9mPGO+WMHOXF81+d4nsybLbhN7OB82tU
Jq79WdWO/L0l6t2+HlY+th1yVjpshhoXjLKoa5ala9YO1+NiWYvfgitnRhjNhaTC
+veqnvvOKezToGs5kHvaL9W2N2qRC9IgaGQehINjewJ+ddt5YfUVlteoioaNSHBb
kTH1jAtkXUkBcLl4niPEcz+ppW5R8NWGw+EyBiaYmjG2hT6xDXZmONL4PBqJ2iwQ
/ROKGG5lOgtmIDmZS6/uWwN6Z48PpHbOihsCv/tC6fyhxjLMKt6HjyiI3v9XBsZL
l6LaZAc3wPmivfxBSQnFdV5+zSycggECggEAdsHbr9KjhGXIHM83uDbM7c1f757d
6uPQi5fq976KHybMjoJht4a3jLI9HeLViaCX21Zhl8FERkpHfztfXDV2JgOQwXj/
0qVQqog4RjStPXmPWWOKgy5EGvuO2K4e0RZf3eXanzTND4T/C1kE8l7oC8sj6KDO
kn0NfQBo7Zynpz9Usu4CV4I1EbnKmZk+ayDgSWzQspEDsgRpeCGvKGgIKAT2yQmo
HJahajkrCiR8kNSziWR9uHnS3vh7V5mVWwRi3fo4duA3YK6aTzqe+MiQqDQZv31e
sesjXercqZMd8haemSW16HshUexqkKBzRBNfP3wrzwI8zjBw0knT5+MVXg==
-----END RSA PRIVATE KEY-----`;

// eslint-disable-next-line
const publicKey = `-----BEGIN PUBLIC KEY-----
MIICIjANBgkqhkiG9w0BAQEFAAOCAg8AMIICCgKCAgEAtUxvcPYA3IKl19HxJXvh
nHAIEzXCRF8z13dCIx8+AfLmiY5C/fA4k+jiXtXwQcAtzUHtj27V/imWv5uYQdWh
8l8rBsRdA9uLWxzXA5qc4w+cCoNvpPPmtR/aik4u6tCMQl85bQivaMrzUQKRlMyo
MhDncVlRx+yJ+HqfoL8LYbrYfIy6RYeMGDr3R8T+VWJ3B6VyDKPVoXFw4GOqNsA1
uU8NTjBjKp+iOLOwTuPr4Txi+/eDKptJiMDwYBXgaQSfvOAPjaAkC4sWc17ZyE1l
sZAu2qO6ntAtE4K/wAddOc08+h8y9SANdG81yV+z/uI9BfaBX+X9uSifxm0HCF5Q
YqO/fF5ckQk8Obgmh6cQ009WPNhS2IvL5KjPdpyYKGLXuWnaogKTVzrroiY1kEV3
tpfep61qYsrnzkfnRb7G0puiL0tl45gTLDN6c4J4LdhElSpOtI6yb59nCjjycmjs
yArBlhaeHTmVDPTLWmfppi9jDzRxUF9QRMjrVLTurvTcSzKcOGFWjegrkjGOomrg
9wuaEp3hZhT0qxxuG1ODYoyMXyF9yDP4WCRIKVFgp+WNXzkoJ3FY7uEQoa13HWBv
LjyNTSDWlGFpnKW1h5ByEoZxr75uQnKXRp3bd+6kfZ1Spq0sTABO9YTUuLlHpirc
q7SQ+Ojyvg0I+Zs6EGfvqw0CAwEAAQ==
-----END PUBLIC KEY-----`;

describe('jwt auth', function () {
    let testrun;

    describe('with invalid algorithm', function () {
        before(function (done) {
            const runOptions = {
                collection: {
                    item: {
                        request: {
                            url: 'https://postman-echo.com/headers',
                            auth: {
                                type: 'jwt',
                                jwt: {
                                    algorithm: '',
                                    header: { alg: 'HS256' },
                                    payload: { test: 123 },
                                    secretOrPrivateKey: '123',
                                    tokenAddTo: AUTHORIZATION_HEADER
                                }
                            }
                        }
                    }
                }
            };

            this.run(runOptions, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        it('should completed the run', function () {
            expect(testrun).to.be.ok;
            expect(testrun).to.nested.include({
                'done.calledOnce': true,
                'start.calledOnce': true,
                'request.calledOnce': true
            });
        });

        it('should not add Authorization header', function () {
            const headers = [],
                request = testrun.request.firstCall.args[3];

            request.headers.members.forEach(function (header) {
                headers.push(header.key);
            });
            expect(headers).that.does.not.include('Authorization');
        });
    });

    describe('with invalid header', function () {
        before(function (done) {
            const runOptions = {
                collection: {
                    item: {
                        request: {
                            url: 'https://postman-echo.com/headers',
                            auth: {
                                type: 'jwt',
                                jwt: {
                                    algorithm: 'HS256',
                                    header: null,
                                    payload: { test: 123 },
                                    secretOrPrivateKey: '123',
                                    tokenAddTo: AUTHORIZATION_HEADER
                                }
                            }
                        }
                    }
                }
            };

            this.run(runOptions, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        it('should completed the run', function () {
            expect(testrun).to.be.ok;
            expect(testrun).to.nested.include({
                'done.calledOnce': true,
                'start.calledOnce': true,
                'request.calledOnce': true
            });
        });

        it('should not add Authorization header', function () {
            const headers = [],
                request = testrun.request.firstCall.args[3];

            request.headers.members.forEach(function (header) {
                headers.push(header.key);
            });
            expect(headers).that.does.not.include('Authorization');
        });
    });

    describe('with invalid secret', function () {
        before(function (done) {
            const runOptions = {
                collection: {
                    item: {
                        request: {
                            url: 'https://postman-echo.com/headers',
                            auth: {
                                type: 'jwt',
                                jwt: {
                                    algorithm: 'HS256',
                                    header: { alg: 'HS256' },
                                    payload: { test: 123 },
                                    secretOrPrivateKey: null,
                                    tokenAddTo: AUTHORIZATION_HEADER
                                }
                            }
                        }
                    }
                }
            };

            this.run(runOptions, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        it('should completed the run', function () {
            expect(testrun).to.be.ok;
            expect(testrun).to.nested.include({
                'done.calledOnce': true,
                'start.calledOnce': true,
                'request.calledOnce': true
            });
        });

        it('should not add Authorization header', function () {
            const headers = [],
                request = testrun.request.firstCall.args[3];

            request.headers.members.forEach(function (header) {
                headers.push(header.key);
            });
            expect(headers).that.does.not.include('Authorization');
        });
    });

    // jwt header test case
    describe('with valid header object', function () {
        before(function (done) {
            const runOptions = {
                collection: {
                    item: {
                        request: {
                            url: 'https://postman-echo.com/headers',
                            auth: {
                                type: 'jwt',
                                jwt: {
                                    algorithm: 'HS256',
                                    header: {
                                        alg: 'HS256',
                                        typ: 'JWS',
                                        cty: 'JWT',
                                        crit: ['JWS'],
                                        kid: '12345',
                                        jku: 'test'
                                    },
                                    payload: { test: 123 },
                                    secretOrPrivateKey: 'cdVGscbTozmMseA6c7YfhimIF8seD02mN0g4x',
                                    tokenAddTo: AUTHORIZATION_HEADER
                                }
                            }
                        }
                    }
                }
            };

            this.run(runOptions, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        it('should completed the run', function () {
            expect(testrun).to.be.ok;
            expect(testrun).to.nested.include({
                'done.calledOnce': true,
                'start.calledOnce': true,
                'request.calledOnce': true
            });
        });

        it('should add Authorization header', function () {
            const headers = [],
                request = testrun.request.firstCall.args[3],
                response = testrun.request.firstCall.args[2];

            let jwtToken;

            request.headers.members.forEach(function (header) {
                if (header.key === 'Authorization') {
                    jwtToken = header.value.split('Bearer ')[1];
                }
                headers.push(header.key);
            });

            expect(request.headers.members).to.include.deep.members([
                new Header({ key: 'Authorization', value: `Bearer ${jwtToken}`, system: true })
            ]);

            expect(response.json()).to.nested.include({
                'headers.authorization': `Bearer ${jwtToken}`
            });

            expect(jwt.verify(jwtToken, 'cdVGscbTozmMseA6c7YfhimIF8seD02mN0g4x'))
                .to.be.deep.equal({ test: 123 });
            expect(jwt.decode(jwtToken, { complete: true }).header)
                .to.be.deep.equal({
                    alg: 'HS256',
                    typ: 'JWS',
                    kid: '12345',
                    cty: 'JWT',
                    crit: ['JWS'],
                    jku: 'test'
                });
        });
    });

    describe('with valid header JSON string', function () {
        before(function (done) {
            const runOptions = {
                collection: {
                    item: {
                        request: {
                            url: 'https://postman-echo.com/headers',
                            auth: {
                                type: 'jwt',
                                jwt: {
                                    algorithm: 'HS256',
                                    header: '{\n "typ": "JWS",\n "jku": "{{jku}}",\n "test12": "demo"}',
                                    payload: '{\n "test": "{{jku}}" }',
                                    secretOrPrivateKey: '{{secretOrPrivateKey}}',
                                    tokenAddTo: AUTHORIZATION_HEADER
                                }
                            }
                        }
                    }
                },
                environment: {
                    values: [
                        {
                            key: 'secretOrPrivateKey',
                            value: 'cdVGscbTozmMseA6c7YfhimIF8seD02mN0g4x'
                        },
                        {
                            key: 'jku',
                            value: 'njsdnfjdnjdngjdnj'
                        }
                    ]
                }
            };

            this.run(runOptions, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        it('should completed the run', function () {
            expect(testrun).to.be.ok;
            expect(testrun).to.nested.include({
                'done.calledOnce': true,
                'start.calledOnce': true,
                'request.calledOnce': true
            });
        });

        it('should add Authorization header', function () {
            const headers = [],
                request = testrun.request.firstCall.args[3],
                response = testrun.request.firstCall.args[2];

            let jwtToken;

            request.headers.members.forEach(function (header) {
                if (header.key === 'Authorization') {
                    jwtToken = header.value.split('Bearer ')[1];
                }
                headers.push(header.key);
            });

            expect(request.headers.members).to.include.deep.members([
                new Header({ key: 'Authorization', value: `Bearer ${jwtToken}`, system: true })
            ]);

            expect(response.json()).to.nested.include({
                'headers.authorization': `Bearer ${jwtToken}`
            });

            expect(jwt.verify(jwtToken, 'cdVGscbTozmMseA6c7YfhimIF8seD02mN0g4x'))
                .to.be.deep.equal({ test: 'njsdnfjdnjdngjdnj' });
            expect(jwt.decode(jwtToken, { complete: true }).header)
                .to.be.deep.equal({
                    alg: 'HS256',
                    typ: 'JWS',
                    test12: 'demo',
                    jku: 'njsdnfjdnjdngjdnj'
                });
        });
    });

    describe('with invalid header & payload JSON string', function () {
        before(function (done) {
            const runOptions = {
                collection: {
                    item: {
                        request: {
                            url: 'https://postman-echo.com/headers',
                            auth: {
                                type: 'jwt',
                                jwt: {
                                    algorithm: 'HS256',
                                    header: '{\n "typ": "JWS",\n "jku": {{jku}},\n "test12": "demo"}',
                                    payload: '{\n "test": {{jku}} }',
                                    secretOrPrivateKey: '{{secretOrPrivateKey}}',
                                    tokenAddTo: AUTHORIZATION_HEADER
                                }
                            }
                        }
                    }
                },
                environment: {
                    values: [
                        {
                            key: 'secretOrPrivateKey',
                            value: 'cdVGscbTozmMseA6c7YfhimIF8seD02mN0g4x'
                        },
                        {
                            key: 'jku',
                            value: 'njsdnfjdnjdngjdnj'
                        }
                    ]
                }
            };

            this.run(runOptions, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        it('should completed the run', function () {
            expect(testrun).to.be.ok;
            expect(testrun).to.nested.include({
                'done.calledOnce': true,
                'start.calledOnce': true,
                'request.calledOnce': true
            });
        });

        it('should not add Authorization header', function () {
            const headers = [],
                request = testrun.request.firstCall.args[3];

            request.headers.members.forEach(function (header) {
                headers.push(header.key);
            });
            expect(headers).that.does.not.include('Authorization');
        });
    });

    // jwt payload test case
    describe('with payload as null', function () {
        before(function (done) {
            const runOptions = {
                collection: {
                    item: {
                        request: {
                            url: 'https://postman-echo.com/headers',
                            auth: {
                                type: 'jwt',
                                jwt: {
                                    algorithm: 'HS256',
                                    header: { typ: 'JWT' },
                                    payload: null,
                                    secretOrPrivateKey: '{{secretOrPrivateKey}}',
                                    tokenAddTo: AUTHORIZATION_HEADER
                                }
                            }
                        }
                    }
                },
                environment: {
                    values: [
                        {
                            key: 'secretOrPrivateKey',
                            value: 'cdVGscbTozmMseA6c7YfhimIF8seD02mN0g4x'
                        }
                    ]
                }
            };

            this.run(runOptions, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        it('should completed the run', function () {
            expect(testrun).to.be.ok;
            expect(testrun).to.nested.include({
                'done.calledOnce': true,
                'start.calledOnce': true,
                'request.calledOnce': true
            });
        });

        it('should not add Authorization header when payload is null', function () {
            const headers = [],
                request = testrun.request.firstCall.args[3];

            request.headers.members.forEach(function (header) {
                headers.push(header.key);
            });
            expect(headers).that.does.not.include('Authorization');
        });
    });

    describe('with payload as undefined', function () {
        before(function (done) {
            const runOptions = {
                collection: {
                    item: {
                        request: {
                            url: 'https://postman-echo.com/headers',
                            auth: {
                                type: 'jwt',
                                jwt: {
                                    algorithm: 'HS256',
                                    header: { typ: 'JWT' },
                                    payload: undefined,
                                    secretOrPrivateKey: '{{secretOrPrivateKey}}',
                                    tokenAddTo: AUTHORIZATION_HEADER
                                }
                            }
                        }
                    }
                },
                environment: {
                    values: [
                        {
                            key: 'secretOrPrivateKey',
                            value: 'cdVGscbTozmMseA6c7YfhimIF8seD02mN0g4x'
                        }
                    ]
                }
            };

            this.run(runOptions, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        it('should completed the run', function () {
            expect(testrun).to.be.ok;
            expect(testrun).to.nested.include({
                'done.calledOnce': true,
                'start.calledOnce': true,
                'request.calledOnce': true
            });
        });

        it('should not add Authorization header when payload is undefined', function () {
            const headers = [],
                request = testrun.request.firstCall.args[3];

            request.headers.members.forEach(function (header) {
                headers.push(header.key);
            });
            expect(headers).that.does.not.include('Authorization');
        });
    });

    describe('with valid payload for HS256 algorithm', function () {
        before(function (done) {
            const runOptions = {
                collection: {
                    item: {
                        request: {
                            url: 'https://postman-echo.com/headers',
                            auth: {
                                type: 'jwt',
                                jwt: {
                                    algorithm: 'HS256',
                                    header: { typ: 'JWT' },
                                    payload: { test: 123, name: 'demo-name' },
                                    secretOrPrivateKey: '{{secretOrPrivateKey}}',
                                    tokenAddTo: AUTHORIZATION_HEADER
                                }
                            }
                        }
                    }
                },
                environment: {
                    values: [
                        {
                            key: 'secretOrPrivateKey',
                            value: 'cdVGscbTozmMseA6c7YfhimIF8seD02mN0g4x'
                        }
                    ]
                }
            };

            this.run(runOptions, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        it('should completed the run', function () {
            expect(testrun).to.be.ok;
            expect(testrun).to.nested.include({
                'done.calledOnce': true,
                'start.calledOnce': true,
                'request.calledOnce': true
            });
        });

        it('should add Authorization header with bearer as jwt token', function () {
            const headers = [],
                request = testrun.request.firstCall.args[3],
                response = testrun.request.firstCall.args[2];

            let jwtToken;

            request.headers.members.forEach(function (header) {
                if (header.key === 'Authorization') {
                    jwtToken = header.value.split('Bearer ')[1];
                }
                headers.push(header.key);
            });

            expect(request.headers.members).to.include.deep.members([
                new Header({ key: 'Authorization', value: `Bearer ${jwtToken}`, system: true })
            ]);

            expect(response.json()).to.nested.include({
                'headers.authorization': `Bearer ${jwtToken}`
            });

            expect(jwt.verify(jwtToken, 'cdVGscbTozmMseA6c7YfhimIF8seD02mN0g4x'))
                .to.be.deep.equal({ test: 123, name: 'demo-name' });
            expect(jwt.decode(jwtToken, { complete: true }).header)
                .to.be.deep.equal({ alg: 'HS256', typ: 'JWT' });
        });
    });

    describe('with payload as JSON String for HS256 algorithm', function () {
        before(function (done) {
            const runOptions = {
                collection: {
                    item: {
                        request: {
                            url: 'https://postman-echo.com/headers',
                            auth: {
                                type: 'jwt',
                                jwt: {
                                    algorithm: 'HS256',
                                    header: { typ: 'JWT' },
                                    payload: '{\n "uno": 1,\n "dos": 2\n}',
                                    secretOrPrivateKey: '{{secretOrPrivateKey}}',
                                    tokenAddTo: AUTHORIZATION_HEADER
                                }
                            }
                        }
                    }
                },
                environment: {
                    values: [
                        {
                            key: 'secretOrPrivateKey',
                            value: 'cdVGscbTozmMseA6c7YfhimIF8seD02mN0g4x'
                        }
                    ]
                }
            };

            this.run(runOptions, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        it('should completed the run', function () {
            expect(testrun).to.be.ok;
            expect(testrun).to.nested.include({
                'done.calledOnce': true,
                'start.calledOnce': true,
                'request.calledOnce': true
            });
        });

        it('should add Authorization header with bearer as jwt token', function () {
            const headers = [],
                request = testrun.request.firstCall.args[3],
                response = testrun.request.firstCall.args[2];

            let jwtToken;

            request.headers.members.forEach(function (header) {
                if (header.key === 'Authorization') {
                    jwtToken = header.value.split('Bearer ')[1];
                }
                headers.push(header.key);
            });

            expect(request.headers.members).to.include.deep.members([
                new Header({ key: 'Authorization', value: `Bearer ${jwtToken}`, system: true })
            ]);

            expect(response.json()).to.nested.include({
                'headers.authorization': `Bearer ${jwtToken}`
            });

            expect(jwt.verify(jwtToken, 'cdVGscbTozmMseA6c7YfhimIF8seD02mN0g4x'))
                .to.be.deep.equal({ uno: 1, dos: 2 });
            expect(jwt.decode(jwtToken, { complete: true }).header)
                .to.be.deep.equal({ alg: 'HS256', typ: 'JWT' });
        });
    });

    describe('with payload as JSON String and env variable for HS256 algorithm', function () {
        before(function (done) {
            const runOptions = {
                collection: {
                    item: {
                        request: {
                            url: 'https://postman-echo.com/headers',
                            auth: {
                                type: 'jwt',
                                jwt: {
                                    algorithm: 'HS256',
                                    header: { typ: 'JWT' },
                                    payload: '{\n "uno": 1,\n "dos": 2\n,\n "number": {{number}}}',
                                    secretOrPrivateKey: '{{secretOrPrivateKey}}',
                                    tokenAddTo: AUTHORIZATION_HEADER
                                }
                            }
                        }
                    }
                },
                environment: {
                    values: [
                        {
                            key: 'secretOrPrivateKey',
                            value: 'cdVGscbTozmMseA6c7YfhimIF8seD02mN0g4x'
                        },
                        {
                            key: 'number',
                            value: 12345
                        }
                    ]
                }
            };

            this.run(runOptions, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        it('should completed the run', function () {
            expect(testrun).to.be.ok;
            expect(testrun).to.nested.include({
                'done.calledOnce': true,
                'start.calledOnce': true,
                'request.calledOnce': true
            });
        });

        it('should add Authorization header with bearer as jwt token', function () {
            const headers = [],
                request = testrun.request.firstCall.args[3],
                response = testrun.request.firstCall.args[2];

            let jwtToken;

            request.headers.members.forEach(function (header) {
                if (header.key === 'Authorization') {
                    jwtToken = header.value.split('Bearer ')[1];
                }
                headers.push(header.key);
            });

            expect(request.headers.members).to.include.deep.members([
                new Header({ key: 'Authorization', value: `Bearer ${jwtToken}`, system: true })
            ]);

            expect(response.json()).to.nested.include({
                'headers.authorization': `Bearer ${jwtToken}`
            });

            expect(jwt.verify(jwtToken, 'cdVGscbTozmMseA6c7YfhimIF8seD02mN0g4x'))
                .to.be.deep.equal({ uno: 1, dos: 2, number: 12345 });
            expect(jwt.decode(jwtToken, { complete: true }).header)
                .to.be.deep.equal({ alg: 'HS256', typ: 'JWT' });
        });
    });

    describe('with valid payload for HS384 algorithm', function () {
        before(function (done) {
            const runOptions = {
                collection: {
                    item: {
                        request: {
                            url: 'https://postman-echo.com/get',
                            auth: {
                                type: 'jwt',
                                jwt: {
                                    algorithm: 'HS384',
                                    header: { typ: 'JWT' },
                                    payload: { name: '{{name}}' },
                                    secretOrPrivateKey: '{{secretOrPrivateKey}}',
                                    tokenAddTo: QUERY_PARAM,
                                    queryParamKey: 'jwt'
                                }
                            }
                        }
                    }
                },
                environment: {
                    values: [
                        {
                            key: 'name',
                            value: 'test-name'
                        },
                        {
                            key: 'secretOrPrivateKey',
                            value: 'cdVGscbTozmMseA6c7YfhimIF8seD02mN0g4x1234567891'
                        }
                    ]
                }
            };

            this.run(runOptions, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        it('should completed the run', function () {
            expect(testrun).to.be.ok;
            expect(testrun).to.nested.include({
                'done.calledOnce': true,
                'start.calledOnce': true,
                'request.calledOnce': true
            });
        });

        it('should generate a valid jwt token & add to query param correctly', function () {
            const queries = [],
                request = testrun.request.firstCall.args[3],
                response = testrun.request.firstCall.args[2];

            let jwtToken;

            request.url.query.members.forEach(function (query) {
                if (query.key === 'jwt') {
                    jwtToken = query.value;
                }
                queries.push(query.value);
            });

            expect(request.url.query.members).to.include.deep.members([
                new QueryParam({ key: 'jwt', value: jwtToken })
            ]);

            expect(jwt.verify(jwtToken, 'cdVGscbTozmMseA6c7YfhimIF8seD02mN0g4x1234567891'))
                .to.be.deep.equal({ name: 'test-name' });
            expect(jwt.decode(jwtToken, { complete: true }).header)
                .to.be.deep.equal({ alg: 'HS384', typ: 'JWT' });

            expect(response.json()).to.nested.include({
                'args.jwt': jwtToken
            });
        });
    });

    describe('with valid payload for HS512 algorithm', function () {
        const secretKey = 'cdVGscbTozmMseA6c7YfhimIF8seD02mN0g4x1212121232323434242352352345252245245245245241212s';

        before(function (done) {
            const runOptions = {
                collection: {
                    item: {
                        request: {
                            url: 'https://postman-echo.com/headers',
                            auth: {
                                type: 'jwt',
                                jwt: {
                                    algorithm: 'HS512',
                                    header: { typ: 'JWT' },
                                    payload: { test: '123', name: 'demo-name' },
                                    secretOrPrivateKey: '{{secretOrPrivateKey}}',
                                    tokenAddTo: AUTHORIZATION_HEADER
                                }
                            }
                        }
                    }
                },
                environment: {
                    values: [
                        {
                            key: 'secretOrPrivateKey',
                            value: secretKey
                        }
                    ]
                }
            };

            this.run(runOptions, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        it('should completed the run', function () {
            expect(testrun).to.be.ok;
            expect(testrun).to.nested.include({
                'done.calledOnce': true,
                'start.calledOnce': true,
                'request.calledOnce': true
            });
        });

        it('should add Authorization header with bearer as jwt token', function () {
            const headers = [],
                request = testrun.request.firstCall.args[3],
                response = testrun.request.firstCall.args[2];

            let jwtToken;

            request.headers.members.forEach(function (header) {
                if (header.key === 'Authorization') {
                    jwtToken = header.value.split('Bearer ')[1];
                }
                headers.push(header.key);
            });

            expect(request.headers.members).to.include.deep.members([
                new Header({ key: 'Authorization', value: `Bearer ${jwtToken}`, system: true })
            ]);

            expect(response.json()).to.nested.include({
                'headers.authorization': `Bearer ${jwtToken}`
            });

            expect(jwt.verify(jwtToken, secretKey))
                .to.be.deep.equal({ test: '123', name: 'demo-name' });
            expect(jwt.decode(jwtToken, { complete: true }).header)
                .to.be.deep.equal({ alg: 'HS512', typ: 'JWT' });
        });
    });

    describe('generate valid jwt token for registered claim payload', function () {
        const secretKey = 'cdVGscbTozmMseA6c7YfhimIF8seD02mN0g4x1212121232323434242352352345252245245245245241212s',
            issuedAt = Math.floor(Date.now() / 1000),
            notBefore = Math.floor(Date.now() / 1000) - (60 * 60),
            expiresIn = Math.floor(Date.now() / 1000) + (60 * 60), // 1hr expiry
            issuer = 'https://dev-0yc9dnt0.us.auth0.com/',
            subject = 'auth0|6062e94f20d55800692b4dad',
            audience = 'lasEkslasjnn2324nxskskosdk',
            jwtId = 'sjh3h46bsdh37ybasjha237612723';


        before(function (done) {
            const runOptions = {
                collection: {
                    item: {
                        request: {
                            url: 'https://postman-echo.com/get',
                            auth: {
                                type: 'jwt',
                                jwt: {
                                    algorithm: 'HS512',
                                    header: { typ: 'JWT' },
                                    payload: {
                                        iat: '{{issuedAt}}',
                                        exp: expiresIn,
                                        aud: audience,
                                        iss: '{{issuer}}',
                                        sub: '{{subject}}',
                                        jti: jwtId,
                                        nbf: notBefore
                                    },
                                    secretOrPrivateKey: '{{secretOrPrivateKey}}',
                                    tokenAddTo: QUERY_PARAM,
                                    queryParamKey: 'jwt'
                                }
                            }
                        }
                    }
                },
                environment: {
                    values: [
                        {
                            key: 'secretOrPrivateKey',
                            value: secretKey
                        },
                        {
                            key: 'issuer',
                            value: issuer
                        },
                        {
                            key: 'subject',
                            value: subject
                        },
                        {
                            key: 'issuedAt',
                            value: issuedAt
                        }
                    ]
                }
            };

            this.run(runOptions, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        it('should completed the run', function () {
            expect(testrun).to.be.ok;
            expect(testrun).to.nested.include({
                'done.calledOnce': true,
                'start.calledOnce': true,
                'request.calledOnce': true
            });
        });

        it('should generate a valid jwt token & add to query param correctly', function () {
            const queries = [],
                request = testrun.request.firstCall.args[3],
                response = testrun.request.firstCall.args[2];

            let jwtToken;

            request.url.query.members.forEach(function (query) {
                if (query.key === 'jwt') {
                    jwtToken = query.value;
                }
                queries.push(query.value);
            });

            expect(request.url.query.members).to.include.deep.members([
                new QueryParam({ key: 'jwt', value: jwtToken })
            ]);

            expect(jwt.decode(jwtToken, { complete: true }).header)
                .to.be.deep.equal({ alg: 'HS512', typ: 'JWT' });

            expect(response.json()).to.nested.include({
                'args.jwt': jwtToken
            });

            expect(jwt.verify(jwtToken, secretKey))
                .to.be.deep.equal({
                    aud: 'lasEkslasjnn2324nxskskosdk',
                    exp: expiresIn,
                    iat: `${issuedAt}`,
                    iss: 'https://dev-0yc9dnt0.us.auth0.com/',
                    jti: 'sjh3h46bsdh37ybasjha237612723',
                    nbf: notBefore,
                    sub: 'auth0|6062e94f20d55800692b4dad'
                });
        });
    });

    describe('generate valid jwt token for iat claim payload as env variable', function () {
        const secretKey = 'cdVGscbTozmMseA6c7YfhimIF8seD02mN0g4x1212121232323434242352352345252245245245245241212s',
            issuedAt = Math.floor(Date.now() / 1000);


        before(function (done) {
            const runOptions = {
                collection: {
                    item: {
                        request: {
                            url: 'https://postman-echo.com/get',
                            auth: {
                                type: 'jwt',
                                jwt: {
                                    algorithm: 'HS512',
                                    header: { typ: 'JWT' },
                                    // eslint-disable-next-line
                                    payload: '{\n    \"iat\":{{issuedAt}}\n}',
                                    secretOrPrivateKey: '{{secretOrPrivateKey}}',
                                    tokenAddTo: QUERY_PARAM,
                                    queryParamKey: 'jwt'
                                }
                            }
                        }
                    }
                },
                environment: {
                    values: [
                        {
                            key: 'secretOrPrivateKey',
                            value: secretKey
                        },
                        {
                            key: 'issuedAt',
                            value: issuedAt
                        }
                    ]
                }
            };

            this.run(runOptions, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        it('should completed the run', function () {
            expect(testrun).to.be.ok;
            expect(testrun).to.nested.include({
                'done.calledOnce': true,
                'start.calledOnce': true,
                'request.calledOnce': true
            });
        });

        it('should generate a valid jwt token & add to query param correctly', function () {
            const queries = [],
                request = testrun.request.firstCall.args[3],
                response = testrun.request.firstCall.args[2];

            let jwtToken;

            request.url.query.members.forEach(function (query) {
                if (query.key === 'jwt') {
                    jwtToken = query.value;
                }
                queries.push(query.value);
            });

            expect(request.url.query.members).to.include.deep.members([
                new QueryParam({ key: 'jwt', value: jwtToken })
            ]);

            expect(jwt.decode(jwtToken, { complete: true }).header)
                .to.be.deep.equal({ alg: 'HS512', typ: 'JWT' });

            expect(response.json()).to.nested.include({
                'args.jwt': jwtToken
            });

            expect(jwt.verify(jwtToken, secretKey))
                .to.be.deep.equal({
                    iat: issuedAt
                });
        });
    });

    describe('generate token for private and public claim payload', function () {
        const secretKey = 'cdVGscbTozmMseA6c7YfhimIF8seD02mN0g4x1212121232323434242352352345252245245245245241212s';

        before(function (done) {
            const runOptions = {
                collection: {
                    item: {
                        request: {
                            url: 'https://postman-echo.com/get',
                            auth: {
                                type: 'jwt',
                                jwt: {
                                    algorithm: 'HS512',
                                    header: { typ: 'JWT' },
                                    payload: {
                                        customField: 'test', // private claim
                                        isAdmin: true, // private claim
                                        email: 'test@gmail.com', // public claim openId
                                        sid: 12345 // public claim IESG
                                    },
                                    secretOrPrivateKey: '{{secretOrPrivateKey}}',
                                    tokenAddTo: QUERY_PARAM,
                                    queryParamKey: 'jwtToken'
                                }
                            }
                        }
                    }
                },
                environment: {
                    values: [
                        {
                            key: 'secretOrPrivateKey',
                            value: secretKey
                        }
                    ]
                }
            };

            this.run(runOptions, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        it('should completed the run', function () {
            expect(testrun).to.be.ok;
            expect(testrun).to.nested.include({
                'done.calledOnce': true,
                'start.calledOnce': true,
                'request.calledOnce': true
            });
        });

        it('should generate a valid jwt token & add to query param correctly', function () {
            const queries = [],
                request = testrun.request.firstCall.args[3],
                response = testrun.request.firstCall.args[2];

            let jwtToken;

            request.url.query.members.forEach(function (query) {
                if (query.key === 'jwtToken') {
                    jwtToken = query.value;
                }
                queries.push(query.value);
            });

            expect(request.url.query.members).to.include.deep.members([
                new QueryParam({ key: 'jwtToken', value: jwtToken })
            ]);

            expect(jwt.decode(jwtToken, { complete: true }).header)
                .to.be.deep.equal({ alg: 'HS512', typ: 'JWT' });

            expect(response.json()).to.nested.include({
                'args.jwtToken': jwtToken
            });

            expect(jwt.verify(jwtToken, secretKey))
                .to.be.deep.equal({
                    customField: 'test', // private claim
                    isAdmin: true, // private claim
                    email: 'test@gmail.com', // public claim openId
                    sid: 12345 // public claim IESG
                });
        });
    });

    describe('with nbf is greater than iat', function () {
        const secretKey = 'cdVGscbTozmMseA6c7YfhimIF8seD02mN0g4x1212121232323434242352352345252245245245245241212s',
            issuedAt = Math.floor(Date.now() / 1000),
            notBefore = Math.floor(Date.now() / 1000) + (60 * 60 * 60),
            expiresIn = Math.floor(Date.now() / 1000) + (60 * 60 * 60),
            issuer = 'https://dev-0yc9dnt0.us.auth0.com/',
            subject = 'auth0|6062e94f20d55800692b4dad',
            audience = 'lasEkslasjnn2324nxskskosdk',
            jwtId = 'sjh3h46bsdh37ybasjha237612723';


        before(function (done) {
            const runOptions = {
                collection: {
                    item: {
                        request: {
                            url: 'https://postman-echo.com/get',
                            auth: {
                                type: 'jwt',
                                jwt: {
                                    algorithm: 'HS256',
                                    header: { typ: 'JWT' },
                                    payload: {
                                        iat: issuedAt,
                                        exp: expiresIn,
                                        aud: audience,
                                        iss: '{{issuer}}',
                                        sub: '{{subject}}',
                                        jwtId: jwtId,
                                        nbf: notBefore
                                    },
                                    secretOrPrivateKey: '{{secretOrPrivateKey}}',
                                    tokenAddTo: AUTHORIZATION_HEADER
                                }
                            }
                        }
                    }
                },
                environment: {
                    values: [
                        {
                            key: 'secretOrPrivateKey',
                            value: secretKey
                        },
                        {
                            key: 'issuer',
                            value: issuer
                        },
                        {
                            key: 'subject',
                            value: subject
                        }
                    ]
                }
            };

            this.run(runOptions, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        it('should completed the run', function () {
            expect(testrun).to.be.ok;
            expect(testrun).to.nested.include({
                'done.calledOnce': true,
                'start.calledOnce': true,
                'request.calledOnce': true
            });
        });

        it('should not add verify token when nbf is greater than iat', function () {
            const headers = [],
                request = testrun.request.firstCall.args[3],
                response = testrun.request.firstCall.args[2];

            let jwtToken;

            request.headers.members.forEach(function (header) {
                if (header.key === 'Authorization') {
                    jwtToken = header.value.split('Bearer ')[1];
                }
                headers.push(header.key);
            });

            expect(request.headers.members).to.include.deep.members([
                new Header({ key: 'Authorization', value: `Bearer ${jwtToken}`, system: true })
            ]);

            expect(response.json()).to.nested.include({
                'headers.authorization': `Bearer ${jwtToken}`
            });

            try {
                jwt.verify(jwtToken, secretKey)
                    .to.be.deep.equal({ test: '123', name: 'demo-name' });
            }
            catch (e) {
                expect(e.message).to.be.equal('jwt not active');
            }
        });
    });

    describe('with expiry time crossed for token', function () {
        const secretKey = 'cdVGscbTozmMseA6c7YfhimIF8seD02mN0g4x1212121232323434242352352345252245245245245241212s',
            issuedAt = Math.floor(Date.now() / 1000),
            expiresIn = Math.floor(Date.now() / 1000) - (60 * 60);

        before(function (done) {
            const runOptions = {
                collection: {
                    item: {
                        request: {
                            url: 'https://postman-echo.com/get',
                            auth: {
                                type: 'jwt',
                                jwt: {
                                    algorithm: 'HS256',
                                    header: { typ: 'JWT' },
                                    payload: {
                                        iat: issuedAt,
                                        exp: expiresIn
                                    },
                                    secretOrPrivateKey: secretKey,
                                    tokenAddTo: AUTHORIZATION_HEADER
                                }
                            }
                        }
                    }
                }
            };

            this.run(runOptions, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        it('should completed the run', function () {
            expect(testrun).to.be.ok;
            expect(testrun).to.nested.include({
                'done.calledOnce': true,
                'start.calledOnce': true,
                'request.calledOnce': true
            });
        });

        it('should throw expired token error', function () {
            const headers = [],
                request = testrun.request.firstCall.args[3],
                response = testrun.request.firstCall.args[2];

            let jwtToken;

            request.headers.members.forEach(function (header) {
                if (header.key === 'Authorization') {
                    jwtToken = header.value.split('Bearer ')[1];
                }
                headers.push(header.key);
            });

            expect(request.headers.members).to.include.deep.members([
                new Header({ key: 'Authorization', value: `Bearer ${jwtToken}`, system: true })
            ]);

            expect(response.json()).to.nested.include({
                'headers.authorization': `Bearer ${jwtToken}`
            });

            try {
                jwt.verify(jwtToken, secretKey)
                    .to.be.deep.equal({ });
            }
            catch (e) {
                expect(e.message).to.be.equal('jwt expired');
            }
        });
    });

    describe('with invalid signature', function () {
        const secretKey = 'cdVGscbTozmMseA6c7YfhimIF8seD02mN0g4x1212121232323434242352352345252245245245245241212s',
            issuedAt = Math.floor(Date.now() / 1000),
            expiresIn = Math.floor(Date.now() / 1000) + (60 * 60);

        before(function (done) {
            const runOptions = {
                collection: {
                    item: {
                        request: {
                            url: 'https://postman-echo.com/get',
                            auth: {
                                type: 'jwt',
                                jwt: {
                                    algorithm: 'HS256',
                                    header: { typ: 'JWT' },
                                    payload: {
                                        iat: issuedAt,
                                        exp: expiresIn
                                    },
                                    secretOrPrivateKey: secretKey,
                                    tokenAddTo: AUTHORIZATION_HEADER
                                }
                            }
                        }
                    }
                }
            };

            this.run(runOptions, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        it('should completed the run', function () {
            expect(testrun).to.be.ok;
            expect(testrun).to.nested.include({
                'done.calledOnce': true,
                'start.calledOnce': true,
                'request.calledOnce': true
            });
        });

        it('should throw invalid signature error', function () {
            const headers = [],
                request = testrun.request.firstCall.args[3],
                response = testrun.request.firstCall.args[2];

            let jwtToken;

            request.headers.members.forEach(function (header) {
                if (header.key === 'Authorization') {
                    jwtToken = header.value.split('Bearer ')[1];
                }
                headers.push(header.key);
            });

            expect(request.headers.members).to.include.deep.members([
                new Header({ key: 'Authorization', value: `Bearer ${jwtToken}`, system: true })
            ]);

            expect(response.json()).to.nested.include({
                'headers.authorization': `Bearer ${jwtToken}`
            });

            try {
                jwt.verify(jwtToken, '123')
                    .to.be.deep.equal({});
            }
            catch (e) {
                expect(e.message).to.be.equal('invalid signature');
            }
        });
    });

    // RS Algorithms
    describe('with payload as JSON string for RS256 algorithm', function () {
        before(function (done) {
            const runOptions = {
                collection: {
                    item: {
                        request: {
                            url: 'https://postman-echo.com/headers',
                            auth: {
                                type: 'jwt',
                                jwt: {
                                    algorithm: 'RS256',
                                    header: { typ: 'JWT' },
                                    payload: '{\n "uno": 1,\n "dos": 2\n,\n "number": {{number}}}',
                                    secretOrPrivateKey: '{{secretOrPrivateKey}}',
                                    tokenAddTo: AUTHORIZATION_HEADER
                                }
                            }
                        }
                    }
                },
                environment: {
                    values: [
                        {
                            key: 'secretOrPrivateKey',
                            value: secretPrivatekey
                        },
                        {
                            key: 'number',
                            value: 12345
                        }
                    ]
                }
            };

            this.run(runOptions, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        it('should completed the run', function () {
            expect(testrun).to.be.ok;
            expect(testrun).to.nested.include({
                'done.calledOnce': true,
                'start.calledOnce': true,
                'request.calledOnce': true
            });
        });

        it('should add Authorization header with bearer as jwt token', function () {
            const headers = [],
                request = testrun.request.firstCall.args[3],
                response = testrun.request.firstCall.args[2];

            let jwtToken;

            request.headers.members.forEach(function (header) {
                if (header.key === 'Authorization') {
                    jwtToken = header.value.split('Bearer ')[1];
                }
                headers.push(header.key);
            });

            expect(request.headers.members).to.include.deep.members([
                new Header({ key: 'Authorization', value: `Bearer ${jwtToken}`, system: true })
            ]);

            expect(response.json()).to.nested.include({
                'headers.authorization': `Bearer ${jwtToken}`
            });

            expect(jwt.verify(jwtToken, secretPrivatekey, { algorithms: 'RS256' }))
                .to.be.deep.equal({ uno: 1, dos: 2, number: 12345 });
            expect(jwt.decode(jwtToken, { complete: true }).header)
                .to.be.deep.equal({ alg: 'RS256', typ: 'JWT' });
        });
    });

    describe('with valid payload as object for RS256 algorithm', function () {
        const issuedAt = Math.floor(Date.now() / 1000),
            notBefore = Math.floor(Date.now() / 1000) - (60 * 60),
            expiresIn = Math.floor(Date.now() / 1000) + (60 * 60), // 1hr expiry
            issuer = 'https://dev-0yc9dnt0.us.auth0.com/',
            subject = 'auth0|6062e94f20d55800692b4dad',
            audience = 'lasEkslasjnn2324nxskskosdk',
            jwtId = 'sjh3h46bsdh37ybasjha237612723';

        before(function (done) {
            const runOptions = {
                collection: {
                    item: {
                        request: {
                            url: 'https://postman-echo.com/get',
                            auth: {
                                type: 'jwt',
                                jwt: {
                                    algorithm: 'RS256',
                                    header: { typ: 'JWT', custom: 'field' },
                                    payload: {
                                        iat: '{{issuedAt}}',
                                        exp: expiresIn,
                                        aud: audience,
                                        iss: '{{issuer}}',
                                        sub: '{{subject}}',
                                        jti: jwtId,
                                        nbf: notBefore
                                    },
                                    secretOrPrivateKey: '{{secretOrPrivateKey}}',
                                    tokenAddTo: QUERY_PARAM,
                                    queryParamKey: 'jwtToken'
                                }
                            }
                        }
                    }
                },
                environment: {
                    values: [
                        {
                            key: 'secretOrPrivateKey',
                            value: secretPrivatekey
                        },
                        {
                            key: 'issuer',
                            value: issuer
                        },
                        {
                            key: 'subject',
                            value: subject
                        },
                        {
                            key: 'issuedAt',
                            value: issuedAt
                        }
                    ]
                }
            };

            this.run(runOptions, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        it('should completed the run', function () {
            expect(testrun).to.be.ok;
            expect(testrun).to.nested.include({
                'done.calledOnce': true,
                'start.calledOnce': true,
                'request.calledOnce': true
            });
        });

        it('should generate a valid jwt token & add to query param correctly', function () {
            const queries = [],
                request = testrun.request.firstCall.args[3],
                response = testrun.request.firstCall.args[2];

            let jwtToken;

            request.url.query.members.forEach(function (query) {
                if (query.key === 'jwtToken') {
                    jwtToken = query.value;
                }
                queries.push(query.value);
            });

            expect(request.url.query.members).to.include.deep.members([
                new QueryParam({ key: 'jwtToken', value: jwtToken })
            ]);

            expect(jwt.decode(jwtToken, { complete: true }).header)
                .to.be.deep.equal({ alg: 'RS256', typ: 'JWT', custom: 'field' });

            expect(response.json()).to.nested.include({
                'args.jwtToken': jwtToken
            });

            expect(jwt.verify(jwtToken, secretPrivatekey, { algorithms: 'RS256' }))
                .to.be.deep.equal({
                    aud: 'lasEkslasjnn2324nxskskosdk',
                    exp: expiresIn,
                    iat: `${issuedAt}`,
                    iss: 'https://dev-0yc9dnt0.us.auth0.com/',
                    jti: 'sjh3h46bsdh37ybasjha237612723',
                    nbf: notBefore,
                    sub: 'auth0|6062e94f20d55800692b4dad'
                });
        });
    });

    describe('with payload as JSON string for RS384 algorithm', function () {
        before(function (done) {
            const runOptions = {
                collection: {
                    item: {
                        request: {
                            url: 'https://postman-echo.com/headers',
                            auth: {
                                type: 'jwt',
                                jwt: {
                                    algorithm: 'RS384',
                                    header: { typ: 'JWT' },
                                    payload: '{\n "email": "test@gmail.com",\n "isAdmin": true\n,\n "num": {{number}}}',
                                    secretOrPrivateKey: '{{secretOrPrivateKey}}',
                                    tokenAddTo: AUTHORIZATION_HEADER
                                }
                            }
                        }
                    }
                },
                environment: {
                    values: [
                        {
                            key: 'secretOrPrivateKey',
                            value: secretPrivatekey
                        },
                        {
                            key: 'number',
                            value: '12345'
                        }
                    ]
                }
            };

            this.run(runOptions, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        it('should completed the run', function () {
            expect(testrun).to.be.ok;
            expect(testrun).to.nested.include({
                'done.calledOnce': true,
                'start.calledOnce': true,
                'request.calledOnce': true
            });
        });

        it('should add Authorization header with bearer as jwt token', function () {
            const headers = [],
                request = testrun.request.firstCall.args[3],
                response = testrun.request.firstCall.args[2];

            let jwtToken;

            request.headers.members.forEach(function (header) {
                if (header.key === 'Authorization') {
                    jwtToken = header.value.split('Bearer ')[1];
                }
                headers.push(header.key);
            });

            expect(request.headers.members).to.include.deep.members([
                new Header({ key: 'Authorization', value: `Bearer ${jwtToken}`, system: true })
            ]);

            expect(response.json()).to.nested.include({
                'headers.authorization': `Bearer ${jwtToken}`
            });

            expect(jwt.verify(jwtToken, secretPrivatekey, { algorithms: 'RS384' }))
                .to.be.deep.equal({ email: 'test@gmail.com', isAdmin: true, num: 12345 });
            expect(jwt.decode(jwtToken, { complete: true }).header)
                .to.be.deep.equal({ alg: 'RS384', typ: 'JWT' });
        });
    });

    describe('with valid payload as object RS512 algorithm', function () {
        const issuedAt = Math.floor(Date.now() / 1000),
            notBefore = Math.floor(Date.now() / 1000) - (60 * 60),
            expiresIn = Math.floor(Date.now() / 1000) + (60 * 60), // 1hr expiry
            issuer = 'https://dev-0yc9dnt0.us.auth0.com/',
            subject = 'auth0|6062e94f20d55800692b4dad',
            audience = 'lasEkslasjnn2324nxskskosdk',
            jwtId = 'sjh3h46bsdh37ybasjha237612723';

        before(function (done) {
            const runOptions = {
                collection: {
                    item: {
                        request: {
                            url: 'https://postman-echo.com/get',
                            auth: {
                                type: 'jwt',
                                jwt: {
                                    algorithm: 'RS512',
                                    header: { typ: 'JWT', custom: 'field' },
                                    payload: {
                                        iat: '{{issuedAt}}',
                                        exp: expiresIn,
                                        aud: audience,
                                        iss: '{{issuer}}',
                                        sub: '{{subject}}',
                                        jti: jwtId,
                                        nbf: notBefore
                                    },
                                    secretOrPrivateKey: '{{secretOrPrivateKey}}',
                                    tokenAddTo: QUERY_PARAM,
                                    queryParamKey: 'jwtToken'
                                }
                            }
                        }
                    }
                },
                environment: {
                    values: [
                        {
                            key: 'secretOrPrivateKey',
                            value: secretPrivatekey
                        },
                        {
                            key: 'issuer',
                            value: issuer
                        },
                        {
                            key: 'subject',
                            value: subject
                        },
                        {
                            key: 'issuedAt',
                            value: issuedAt
                        }
                    ]
                }
            };

            this.run(runOptions, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        it('should completed the run', function () {
            expect(testrun).to.be.ok;
            expect(testrun).to.nested.include({
                'done.calledOnce': true,
                'start.calledOnce': true,
                'request.calledOnce': true
            });
        });

        it('should generate a valid jwt token & add to query param correctly', function () {
            const queries = [],
                request = testrun.request.firstCall.args[3],
                response = testrun.request.firstCall.args[2];

            let jwtToken;

            request.url.query.members.forEach(function (query) {
                if (query.key === 'jwtToken') {
                    jwtToken = query.value;
                }
                queries.push(query.value);
            });

            expect(request.url.query.members).to.include.deep.members([
                new QueryParam({ key: 'jwtToken', value: jwtToken })
            ]);

            expect(jwt.decode(jwtToken, { complete: true }).header)
                .to.be.deep.equal({ alg: 'RS512', typ: 'JWT', custom: 'field' });

            expect(response.json()).to.nested.include({
                'args.jwtToken': jwtToken
            });

            expect(jwt.verify(jwtToken, secretPrivatekey, { algorithms: 'RS512' }))
                .to.be.deep.equal({
                    aud: 'lasEkslasjnn2324nxskskosdk',
                    exp: expiresIn,
                    iat: `${issuedAt}`,
                    iss: 'https://dev-0yc9dnt0.us.auth0.com/',
                    jti: 'sjh3h46bsdh37ybasjha237612723',
                    nbf: notBefore,
                    sub: 'auth0|6062e94f20d55800692b4dad'
                });
        });
    });

    // PS Algorithms
    describe('with payload as JSON string for PS256 algorithm', function () {
        before(function (done) {
            const runOptions = {
                collection: {
                    item: {
                        request: {
                            url: 'https://postman-echo.com/headers',
                            auth: {
                                type: 'jwt',
                                jwt: {
                                    algorithm: 'PS256',
                                    header: { typ: 'JWT' },
                                    payload: '{\n "uno": 1,\n "dos": ["test", "{{number}}"]\n,\n "number": {{number}}}',
                                    secretOrPrivateKey: '{{secretOrPrivateKey}}',
                                    tokenAddTo: AUTHORIZATION_HEADER
                                }
                            }
                        }
                    }
                },
                environment: {
                    values: [
                        {
                            key: 'secretOrPrivateKey',
                            value: secretPrivatekey
                        },
                        {
                            key: 'number',
                            value: 12345
                        }
                    ]
                }
            };

            this.run(runOptions, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        it('should completed the run', function () {
            expect(testrun).to.be.ok;
            expect(testrun).to.nested.include({
                'done.calledOnce': true,
                'start.calledOnce': true,
                'request.calledOnce': true
            });
        });

        it('should add Authorization header with bearer as jwt token', function () {
            const headers = [],
                request = testrun.request.firstCall.args[3],
                response = testrun.request.firstCall.args[2];

            let jwtToken;

            request.headers.members.forEach(function (header) {
                if (header.key === 'Authorization') {
                    jwtToken = header.value.split('Bearer ')[1];
                }
                headers.push(header.key);
            });

            expect(request.headers.members).to.include.deep.members([
                new Header({ key: 'Authorization', value: `Bearer ${jwtToken}`, system: true })
            ]);

            expect(response.json()).to.nested.include({
                'headers.authorization': `Bearer ${jwtToken}`
            });

            expect(jwt.verify(jwtToken, secretPrivatekey, { algorithms: 'PS256' }))
                .to.be.deep.equal({ uno: 1, dos: ['test', '12345'], number: 12345 });
            expect(jwt.decode(jwtToken, { complete: true }).header)
                .to.be.deep.equal({ alg: 'PS256', typ: 'JWT' });
        });
    });

    describe('with payload as JSON string for PS384 algorithm', function () {
        before(function (done) {
            const runOptions = {
                collection: {
                    item: {
                        request: {
                            url: 'https://postman-echo.com/get',
                            auth: {
                                type: 'jwt',
                                jwt: {
                                    algorithm: 'PS384',
                                    header: { typ: 'JWT' },
                                    payload: '{\n "uno": 1,\n "dos": ["test", "{{name}}"]\n,\n "number": {{number}}}',
                                    secretOrPrivateKey: '{{secretOrPrivateKey}}',
                                    tokenAddTo: QUERY_PARAM,
                                    queryParamKey: 'jwt test'
                                }
                            }
                        }
                    }
                },
                environment: {
                    values: [
                        {
                            key: 'secretOrPrivateKey',
                            value: secretPrivatekey
                        },
                        {
                            key: 'number',
                            value: 12345
                        },
                        {
                            key: 'name',
                            value: 'sathish'
                        }
                    ]
                }
            };

            this.run(runOptions, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        it('should completed the run', function () {
            expect(testrun).to.be.ok;
            expect(testrun).to.nested.include({
                'done.calledOnce': true,
                'start.calledOnce': true,
                'request.calledOnce': true
            });
        });

        it('should generate a valid jwt token & add to query param correctly', function () {
            const queries = [],
                request = testrun.request.firstCall.args[3],
                response = testrun.request.firstCall.args[2];

            let jwtToken;

            request.url.query.members.forEach(function (query) {
                if (query.key === 'jwt%20test') {
                    jwtToken = query.value;
                }
                queries.push(query.value);
            });

            expect(request.url.query.members).to.include.deep.members([
                new QueryParam({ key: 'jwt%20test', value: jwtToken })
            ]);

            expect(jwt.decode(jwtToken, { complete: true }).header)
                .to.be.deep.equal({ alg: 'PS384', typ: 'JWT' });

            expect(response.json()).to.nested.include({
                'args.jwt test': jwtToken
            });

            expect(jwt.verify(jwtToken, secretPrivatekey, { algorithms: 'PS384' }))
                .to.be.deep.equal({
                    uno: 1,
                    number: 12345,
                    dos: ['test', 'sathish']
                });
        });
    });

    describe('with payload as JSON string for PS512 algorithm', function () {
        before(function (done) {
            const runOptions = {
                collection: {
                    item: {
                        request: {
                            url: 'https://postman-echo.com/get',
                            auth: {
                                type: 'jwt',
                                jwt: {
                                    algorithm: 'PS512',
                                    header: { typ: 'JWT' },
                                    payload: '{\n "uno": 1,\n "dos": ["test", "{{name}}"]\n,\n "number": {{number}}}',
                                    secretOrPrivateKey: '{{secretOrPrivateKey}}',
                                    tokenAddTo: QUERY_PARAM,
                                    queryParamKey: 'jwt test'
                                }
                            }
                        }
                    }
                },
                environment: {
                    values: [
                        {
                            key: 'secretOrPrivateKey',
                            value: secretPrivatekey
                        },
                        {
                            key: 'number',
                            value: 12345
                        },
                        {
                            key: 'name',
                            value: 'sathish'
                        }
                    ]
                }
            };

            this.run(runOptions, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        it('should completed the run', function () {
            expect(testrun).to.be.ok;
            expect(testrun).to.nested.include({
                'done.calledOnce': true,
                'start.calledOnce': true,
                'request.calledOnce': true
            });
        });

        it('should generate a valid jwt token & add to query param correctly', function () {
            const queries = [],
                request = testrun.request.firstCall.args[3],
                response = testrun.request.firstCall.args[2];

            let jwtToken;

            request.url.query.members.forEach(function (query) {
                if (query.key === 'jwt%20test') {
                    jwtToken = query.value;
                }
                queries.push(query.value);
            });

            expect(request.url.query.members).to.include.deep.members([
                new QueryParam({ key: 'jwt%20test', value: jwtToken })
            ]);

            expect(jwt.decode(jwtToken, { complete: true }).header)
                .to.be.deep.equal({ alg: 'PS512', typ: 'JWT' });

            expect(response.json()).to.nested.include({
                'args.jwt test': jwtToken
            });

            expect(jwt.verify(jwtToken, secretPrivatekey, { algorithms: 'PS512' }))
                .to.be.deep.equal({
                    uno: 1,
                    number: 12345,
                    dos: ['test', 'sathish']
                });
        });
    });
});
