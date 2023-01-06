const expect = require('chai').expect,
    Url = require('url'),
    async = require('async'),
    {
        Cookie,
        CookieJar,
        Store,
        pathMatch,
        permuteDomain
    } = require('tough-cookie');

class TestCookieStore extends Store {
    constructor () {
        super();

        // This option is part of the API
        this.synchronous = false;

        this.idx = {};
    }

    updateCookie (_oldCookie, newCookie, cb) {
        this.putCookie(newCookie, cb);
    }

    findCookie (domain, path, key, cb) {
        const cookies = this.idx[domain] && this.idx[domain][path] && this.idx[domain][path][key];

        cb(null, cookies ? cookies[0] : null);
    }

    findCookies (domain, path, cb) {
        if (!domain) {
            return cb(null, []);
        }

        const results = [],
            paths = this.idx[domain] || {};

        Object.keys(paths).forEach((curPath) => {
            if (!path || pathMatch(curPath, path)) {
                Object.keys(paths[curPath]).forEach((key) => {
                    results.push(paths[curPath][key][0]);
                });
            }
        });

        cb(null, results);
    }

    putCookie (cookie, cb) {
        if (!this.idx[cookie.domain]) {
            this.idx[cookie.domain] = {};
        }

        if (!this.idx[cookie.domain][cookie.path]) {
            this.idx[cookie.domain][cookie.path] = {};
        }

        this.idx[cookie.domain][cookie.path][cookie.key] = [cookie];

        cb(null);
    }

    removeCookie (domain, path, key, cb) {
        if (this.idx[domain] && this.idx[domain][path] && this.idx[domain][path][key]) {
            delete this.idx[domain][path][key];
        }

        cb(null);
    }

    removeCookies (domain, path, cb) { // not used anywhere ¯\_(ツ)_/¯
        if (this.idx[domain]) {
            if (path) {
                delete this.idx[domain][path];
            }
            else {
                delete this.idx[domain];
            }
        }

        cb(null);
    }

    // eslint-disable-next-line class-methods-use-this
    removeAllCookies () {
        throw new Error('not implemented');
    }

    getAllCookies () {
        const cookies = [];

        Object.keys(this.idx).forEach((domain) => {
            Object.keys(this.idx[domain]).forEach((path) => {
                Object.keys(this.idx[domain][path]).forEach((key) => {
                    cookies.push(this.idx[domain][path][key][0]);
                });
            });
        });

        return cookies;
    }
}

describe('tough-cookie', function () {
    describe('CookieJar', function () {
        it('should throw an error for synchronous methods', function () {
            const store = new TestCookieStore(),
                jar = new CookieJar(store);

            expect(() => { return jar.getCookiesSync('https://postman-echo.com', {}); })
                .to.throw(Error)
                .with.property('message', 'CookieJar store is not synchronous; use async API instead.');

            expect(() => { return jar.setCookieSync('foo=bar', 'https://postman-echo.com', {}); })
                .to.throw(Error)
                .with.property('message', 'CookieJar store is not synchronous; use async API instead.');

            expect(() => { return jar.getCookieStringSync('https://postman-echo.com', {}); })
                .to.throw(Error)
                .with.property('message', 'CookieJar store is not synchronous; use async API instead.');

            expect(() => { return jar.getSetCookieStringsSync('https://postman-echo.com', {}); })
                .to.throw(Error)
                .with.property('message', 'CookieJar store is not synchronous; use async API instead.');

            expect(() => { return jar.removeAllCookiesSync(); })
                .to.throw(Error)
                .with.property('message', 'CookieJar store is not synchronous; use async API instead.');

            expect(() => { return jar.serializeSync(); })
                .to.throw(Error)
                .with.property('message', 'CookieJar store is not synchronous; use async API instead.');
        });

        describe('option: rejectPublicSuffixes', function () {
            it('should be truthy by default', function () {
                const jar = new CookieJar(new TestCookieStore());

                expect(jar.rejectPublicSuffixes).to.be.true;
            });

            it('should not set cookie if rejectPublicSuffixes is true and domain is a public suffix', function (done) {
                const cookie = new Cookie({
                        key: 'foo',
                        value: 'bar',
                        domain: 'com'
                    }, { loose: true }),
                    jar = new CookieJar(new TestCookieStore(), { rejectPublicSuffixes: true });

                jar.setCookie(cookie, 'https://postman-echo.com', function (err) {
                    expect(err).to.be.ok;
                    expect(err.message).to.equal('Cookie has domain set to a public suffix');

                    done();
                });
            });

            it('should set cookie if rejectPublicSuffixes is false and domain is a public suffix', function (done) {
                const cookie = new Cookie({
                        key: 'foo',
                        value: 'bar',
                        domain: 'com'
                    }, { loose: true }),
                    jar = new CookieJar(new TestCookieStore(), { rejectPublicSuffixes: false });

                jar.setCookie(cookie, 'https://postman-echo.com', function (err) {
                    expect(err).to.be.null;

                    done();
                });
            });

            it('should set rejectPublicSuffixes to true by default', function (done) {
                const cookie = new Cookie({
                        key: 'foo',
                        value: 'bar',
                        domain: 'com'
                    }, { loose: true }),
                    jar = new CookieJar(new TestCookieStore());

                jar.setCookie(cookie, 'https://postman-echo.com', function (err) {
                    expect(err).to.be.ok;
                    expect(err.message).to.equal('Cookie has domain set to a public suffix');

                    done();
                });
            });
        });

        describe('option: looseMode', function () {
            it('should create cookies with leading "=" if looseMode is true', function (done) {
                const jar = new CookieJar(new TestCookieStore(), { looseMode: true });

                jar.setCookie('=foo=bar', 'https://postman-echo.com', function (err, cookie) {
                    expect(err).to.be.null;
                    expect(cookie).to.be.ok;

                    done();
                });
            });

            it('should not create cookies with leading "=" if looseMode is false', function (done) {
                const jar = new CookieJar(new TestCookieStore(), { looseMode: false });

                jar.setCookie('=foo=bar', 'https://postman-echo.com', function (err) {
                    expect(err).to.be.ok;
                    expect(err.message).to.equal('Cookie failed to parse');

                    done();
                });
            });
        });

        describe('option: allowSpecialUseDomain', function () {
            it('should be set falsy by default', function () {
                const jar = new CookieJar(new TestCookieStore());

                expect(jar.allowSpecialUseDomain).to.be.not.ok;
            });
        });

        describe('~setCookie', function () {
            it('should set the cookie', function (done) {
                const jar = new CookieJar(new TestCookieStore());

                jar.setCookie('foo=bar', 'https://postman-echo.com', function (err, cookie) {
                    expect(err).to.be.null;
                    expect(cookie).to.be.ok;
                    expect(cookie.key).to.equal('foo');
                    expect(cookie.value).to.equal('bar');

                    done();
                });
            });

            it('should set the cookie with URL as an legacy URL object', function (done) {
                const jar = new CookieJar(new TestCookieStore());

                jar.setCookie('foo=bar', Url.parse('https://postman-echo.com'), function (err, cookie) {
                    expect(err).to.be.null;
                    expect(cookie).to.be.ok;
                    expect(cookie.key).to.equal('foo');
                    expect(cookie.value).to.equal('bar');

                    done();
                });
            });

            it('should set the cookie with URL as an object', function (done) {
                const jar = new CookieJar(new TestCookieStore());

                jar.setCookie('foo=bar', new URL('https://postman-echo.com'), function (err, cookie) {
                    expect(err).to.be.null;
                    expect(cookie).to.be.ok;
                    expect(cookie.key).to.equal('foo');
                    expect(cookie.value).to.equal('bar');

                    done();
                });
            });

            it('should set the cookie with options', function (done) {
                const jar = new CookieJar(new TestCookieStore());

                jar.setCookie('foo=bar; Path=/; Domain=postman-echo.com',
                    'https://postman-echo.com',
                    function (err, cookie) {
                        expect(err).to.be.null;
                        expect(cookie).to.be.ok;
                        expect(cookie.key).to.equal('foo');
                        expect(cookie.value).to.equal('bar');
                        expect(cookie.path).to.equal('/');
                        expect(cookie.domain).to.equal('postman-echo.com');

                        done();
                    });
            });

            it('should not set the cookie if domain does not match', function (done) {
                const jar = new CookieJar(new TestCookieStore());

                jar.setCookie('foo=bar; Path=/; Domain=example.com', 'https://postman-echo.com', function (err) {
                    expect(err).to.be.ok;
                    expect(err.message)
                        .to.equal('Cookie not in this host\'s domain. Cookie:example.com Request:postman-echo.com');

                    done();
                });
            });

            it('should set the cookie with loose=true', function (done) {
                // setting loose=false as default. This test is to ensure that
                // the cookie is set with loose=true when the callback is passed
                const jar = new CookieJar(new TestCookieStore(), { looseMode: false });

                jar.setCookie('=foo=bar; Path=/; Domain=postman-echo.com',
                    'https://postman-echo.com',
                    { loose: true },
                    function (err, cookie) {
                        expect(err).to.be.null;
                        expect(cookie).to.be.ok;
                        expect(cookie.key).to.equal('foo');
                        expect(cookie.value).to.equal('bar');
                        expect(cookie.path).to.equal('/');
                        expect(cookie.domain).to.equal('postman-echo.com');

                        done();
                    });
            });

            it('should throw error when setting cookie with .local domain', function (done) {
                const jar = new CookieJar(new TestCookieStore());

                jar.setCookie('foo=bar; Path=/; Domain=example.local', 'https://example.local', function (err) {
                    expect(err).to.be.ok;
                    expect(err.message).to.equal('Cookie has domain set to a public suffix');

                    done();
                });
            });

            it('should throw error when setting cookie with public suffix domain', function (done) {
                const jar = new CookieJar(new TestCookieStore());

                jar.setCookie('foo=bar; Path=/; Domain=com', 'https://postman-echo.com', function (err) {
                    expect(err).to.be.ok;
                    expect(err.message).to.equal('Cookie has domain set to a public suffix');

                    done();
                });
            });
        });

        describe('~getCookies', function () {
            it('should get the cookies', function (done) {
                const jar = new CookieJar(new TestCookieStore());

                async.series([
                    (next) => {
                        return jar.setCookie('foo=bar', 'https://postman-echo.com', next);
                    },

                    (next) => {
                        return jar.getCookies('https://postman-echo.com', function (err, cookies) {
                            expect(err).to.be.null;
                            expect(cookies).to.be.ok;
                            expect(cookies.length).to.equal(1);
                            expect(cookies[0].key).to.equal('foo');
                            expect(cookies[0].value).to.equal('bar');

                            next(err, cookies);
                        });
                    }
                ], done);
            });

            it('should get cookies for URL as an object', function (done) {
                const jar = new CookieJar(new TestCookieStore());

                async.series([
                    (next) => {
                        return jar.setCookie('foo=bar', 'https://postman-echo.com', next);
                    },

                    (next) => {
                        return jar.getCookies(new URL('https://postman-echo.com'), function (err, cookies) {
                            expect(err).to.be.null;
                            expect(cookies).to.be.ok;
                            expect(cookies.length).to.equal(1);
                            expect(cookies[0].key).to.equal('foo');
                            expect(cookies[0].value).to.equal('bar');

                            next(err, cookies);
                        });
                    }
                ], done);
            });

            it('should get multiple cookies', function (done) {
                const jar = new CookieJar(new TestCookieStore());

                async.series([
                    (next) => {
                        return jar.setCookie('foo=bar', 'https://postman-echo.com', next);
                    },

                    (next) => {
                        return jar.setCookie('bar=baz', 'https://postman-echo.com', next);
                    },

                    (next) => {
                        return jar.getCookies('https://postman-echo.com', function (err, cookies) {
                            expect(err).to.be.null;
                            expect(cookies).to.be.ok;
                            expect(cookies.length).to.equal(2);

                            next();
                        });
                    }
                ], done);
            });

            it('should get the cookies with path option', function (done) {
                const jar = new CookieJar(new TestCookieStore());

                async.series([
                    (next) => {
                        return jar.setCookie('foo=bar; Path=/; Domain=postman-echo.com',
                            'https://postman-echo.com',
                            next);
                    },

                    (next) => {
                        return jar.setCookie('bar=baz; Path=/abc; Domain=postman-echo.com',
                            'https://postman-echo.com',
                            next);
                    },

                    (next) => {
                        return jar.getCookies('https://postman-echo.com', { path: '/' }, function (err, cookies) {
                            expect(err).to.be.null;
                            expect(cookies).to.be.ok;
                            expect(cookies.length).to.equal(1);
                            expect(cookies[0].key).to.equal('foo');
                            expect(cookies[0].value).to.equal('bar');

                            next();
                        });
                    }
                ], done);
            });

            it('should get the cookies with "secure" flag', function (done) {
                const jar = new CookieJar(new TestCookieStore());

                async.series([
                    (next) => {
                        return jar.setCookie('foo=bar; Secure; HttpOnly; foo=bar; hostOnly=false',
                            'https://postman-echo.com',
                            next);
                    },

                    (next) => {
                        return jar.setCookie(new Cookie({
                            key: 'baz',
                            value: 'qux',
                            secure: false
                        }), 'https://postman-echo.com', next);
                    },

                    (next) => {
                        return jar.getCookies('https://postman-echo.com', { secure: false }, function (err, cookies) {
                            expect(err).to.be.null;
                            expect(cookies).to.be.ok;

                            expect(cookies.length).to.equal(1);
                            expect(cookies[0].key).to.equal('baz');
                            expect(cookies[0].value).to.equal('qux');

                            next();
                        });
                    }
                ], done);
            });

            it('should get the cookies with "httpOnly" flag', function (done) {
                const jar = new CookieJar(new TestCookieStore());

                async.series([
                    (next) => {
                        return jar.setCookie('foo=bar', 'http://postman-echo.com', next);
                    },

                    (next) => {
                        return jar.setCookie('bat=baz; Secure', 'http://postman-echo.com', next);
                    },

                    (next) => {
                        return jar.getCookies('http://postman-echo.com', { http: true }, function (err, cookies) {
                            expect(err).to.be.null;
                            expect(cookies).to.be.ok;

                            expect(cookies.length).to.equal(1);
                            expect(cookies[0].key).to.equal('foo');
                            expect(cookies[0].value).to.equal('bar');

                            next();
                        });
                    }
                ], done);
            });

            it('should get the cookies with "allPaths" flag', function (done) {
                const jar = new CookieJar(new TestCookieStore());

                async.series([
                    (next) => {
                        return jar.setCookie('foo=bar; Path=/; Domain=postman-echo.com',
                            'https://postman-echo.com',
                            next);
                    },

                    (next) => {
                        return jar.setCookie('baz=qux; Path=/abc; Domain=postman-echo.com',
                            'https://postman-echo.com',
                            next);
                    },

                    (next) => {
                        return jar.getCookies('https://postman-echo.com', { allPaths: true }, function (err, cookies) {
                            expect(err).to.be.null;
                            expect(cookies).to.be.ok;

                            expect(cookies.length).to.equal(2);
                            expect(cookies[0].key).to.equal('baz');
                            expect(cookies[1].key).to.equal('foo');

                            next();
                        });
                    }
                ], done);
            });

            it('should get the cookies with "now" flag', function (done) {
                const jar = new CookieJar(new TestCookieStore());

                async.series([
                    (next) => {
                        return jar.setCookie('foo=bar; Expires=Thu, 03 Jan 1970 00:00:00 GMT',
                            'https://postman-echo.com',
                            next);
                    },

                    (next) => {
                        return jar.setCookie('bar=baz; Expires=Thu, 01 Jan 1970 00:00:00 GMT',
                            'https://postman-echo.com',
                            next);
                    },

                    (next) => {
                        return jar.getCookies('https://postman-echo.com', {
                            now: (new Date('Thu, 02 Jan 1970 00:00:00 GMT')).getTime()
                        }, function (err, cookies) {
                            expect(err).to.be.null;
                            expect(cookies).to.be.ok;

                            expect(cookies.length).to.equal(1);
                            expect(cookies[0].key).to.equal('foo');

                            next();
                        });
                    }
                ], done);
            });

            it('should get the cookies with "expire" flag', function (done) {
                const jar = new CookieJar(new TestCookieStore());

                async.series([
                    (next) => {
                        return jar.setCookie('foo=bar; Expires=Thu, 03 Jan 1970 00:00:00 GMT',
                            'https://postman-echo.com',
                            next);
                    },

                    (next) => {
                        return jar.setCookie('bar=baz; Expires=Thu, 01 Jan 1970 00:00:00 GMT',
                            'https://postman-echo.com',
                            next);
                    },

                    (next) => {
                        return jar.getCookies('https://postman-echo.com', {
                            now: (new Date('Thu, 02 Jan 1970 00:00:00 GMT')).getTime(),
                            expire: false
                        }, function (err, cookies) {
                            expect(err).to.be.null;
                            expect(cookies).to.be.ok;

                            expect(cookies.length).to.equal(2);
                            expect(cookies[0].key).to.equal('foo');
                            expect(cookies[1].key).to.equal('bar');

                            next();
                        });
                    },

                    (next) => {
                        return jar.getCookies('https://postman-echo.com', {
                            now: (new Date('Thu, 02 Jan 1970 00:00:00 GMT')).getTime(),
                            expire: true
                        }, function (err, cookies) {
                            expect(err).to.be.null;
                            expect(cookies).to.be.ok;

                            expect(cookies.length).to.equal(1);
                            expect(cookies[0].key).to.equal('foo');

                            next();
                        });
                    }
                ], done);
            });

            it('should sort the cookies by path default', function (done) {
                const jar = new CookieJar(new TestCookieStore());

                async.series([
                    (next) => {
                        return jar.setCookie('foo=bar; Path=/; Domain=postman-echo.com',
                            'https://postman-echo.com',
                            next);
                    },

                    (next) => {
                        return jar.setCookie('baz=qux; Path=/abc; Domain=postman-echo.com',
                            'https://postman-echo.com',
                            next);
                    },

                    (next) => {
                        return jar.getCookies('https://postman-echo.com', { allPaths: true }, function (err, cookies) {
                            expect(err).to.be.null;
                            expect(cookies).to.be.ok;

                            expect(cookies.length).to.equal(2);
                            expect(cookies[0].key).to.equal('baz');
                            expect(cookies[1].key).to.equal('foo');

                            next();
                        });
                    }
                ], done);
            });

            it('should not sort the cookie if "sort" flag is false', function (done) {
                const jar = new CookieJar(new TestCookieStore());

                async.series([
                    (next) => {
                        return jar.setCookie('foo=bar; Path=/; Domain=postman-echo.com',
                            'https://postman-echo.com',
                            next);
                    },

                    (next) => {
                        return jar.setCookie('baz=qux; Path=/abc; Domain=postman-echo.com',
                            'https://postman-echo.com',
                            next);
                    },

                    (next) => {
                        return jar.getCookies('https://postman-echo.com', {
                            allPaths: true,
                            sort: false
                        }, function (err, cookies) {
                            expect(err).to.be.null;
                            expect(cookies).to.be.ok;

                            expect(cookies.length).to.equal(2);
                            expect(cookies[0].key).to.equal('foo');
                            expect(cookies[1].key).to.equal('baz');

                            next();
                        });
                    }
                ], done);
            });
        });

        describe('~getCookieString', function () {
            it('should get the cookie string', function (done) {
                const jar = new CookieJar(new TestCookieStore());

                async.series([
                    (next) => {
                        return jar.setCookie('foo=bar', 'https://postman-echo.com', next);
                    },

                    (next) => {
                        return jar.getCookieString('https://postman-echo.com', function (err, cookies) {
                            expect(err).to.be.null;
                            expect(cookies).to.be.ok;
                            expect(cookies).to.equal('foo=bar');

                            next();
                        });
                    }
                ], done);
            });

            it('should get the cookie string for URL as an object', function (done) {
                const jar = new CookieJar(new TestCookieStore());

                async.series([
                    (next) => {
                        return jar.setCookie('foo=bar', 'https://postman-echo.com', next);
                    },

                    (next) => {
                        return jar.getCookieString(new URL('https://postman-echo.com'), function (err, cookies) {
                            expect(err).to.be.null;
                            expect(cookies).to.be.ok;
                            expect(cookies).to.equal('foo=bar');

                            next(err, cookies);
                        });
                    }
                ], done);
            });

            it('should get the cookie string with options', function (done) {
                const jar = new CookieJar(new TestCookieStore());

                async.series([
                    (next) => {
                        return jar.setCookie('foo=bar; Path=/; Domain=postman-echo.com',
                            'https://postman-echo.com',
                            next);
                    },

                    (next) => {
                        return jar.setCookie('bar=baz; Path=/abc; Domain=postman-echo.com',
                            'https://postman-echo.com',
                            next);
                    },

                    (next) => {
                        return jar.getCookieString('https://postman-echo.com', { path: '/' }, function (err, cookies) {
                            expect(err).to.be.null;
                            expect(cookies).to.be.ok;
                            expect(cookies).to.equal('foo=bar');

                            next();
                        });
                    }
                ], done);
            });
        });
    });

    describe('~Cookie', function () {
        it('should have all properties', function () {
            const now = Date.now(),
                cookie = new Cookie({
                    key: 'foo',
                    value: 'bar',
                    expires: now,
                    maxAge: 0,
                    domain: 'postman-echo.com',
                    path: '/my-path',
                    secure: true,
                    httpOnly: true,
                    hostOnly: false,
                    extensions: ['foo=bar']
                });

            expect(cookie).to.be.ok;
            expect(cookie.key).to.equal('foo');
            expect(cookie.value).to.equal('bar');
            expect(cookie.expires.toString()).to.equal(now.toString());
            expect(cookie.maxAge).to.equal(0);
            expect(cookie.domain).to.equal('postman-echo.com');
            expect(cookie.path).to.equal('/my-path');
            expect(cookie.secure).to.be.true;
            expect(cookie.httpOnly).to.be.true;
            expect(cookie.hostOnly).to.be.false;
            expect(cookie.extensions).to.be.ok;
            expect(cookie.extensions.length).to.equal(1);
            expect(cookie.extensions[0]).to.equal('foo=bar');
        });

        describe('~expiryTime', function () {
            it('should return the expiry time', function () {
                const now = new Date(),
                    cookie = new Cookie({
                        key: 'foo',
                        value: 'bar',
                        expires: now
                    });

                expect(cookie.expiryTime()).to.equal(now.getTime());
            });
        });

        describe('~toJSON', function () {
            it('should return the JSON representation', function () {
                const now = new Date(),
                    expires = new Date(now.getTime() + 1000),
                    cookie = new Cookie({
                        key: 'foo',
                        value: 'bar',
                        expires: expires,
                        maxAge: 0,
                        domain: 'postman-echo.com',
                        path: '/my-path',
                        secure: true,
                        httpOnly: true,
                        hostOnly: false,
                        extensions: ['foo=bar'],
                        creation: now
                    });

                expect(cookie.toJSON()).to.eql({
                    key: 'foo',
                    value: 'bar',
                    expires: expires.toISOString(),
                    maxAge: 0,
                    domain: 'postman-echo.com',
                    path: '/my-path',
                    secure: true,
                    httpOnly: true,
                    hostOnly: false,
                    extensions: ['foo=bar'],
                    creation: now.toISOString()
                });
            });
        });

        describe('~fromJSON', function () {
            it('should return the cookie from JSON', function () {
                const now = new Date(),
                    expires = new Date(now.getTime() + 1000),
                    cookie = Cookie.fromJSON({
                        key: 'foo',
                        value: 'bar',
                        expires: expires.toISOString(),
                        maxAge: 0,
                        domain: 'postman-echo.com',
                        path: '/my-path',
                        secure: true,
                        httpOnly: true,
                        hostOnly: false,
                        extensions: ['foo=bar'],
                        creation: now.toISOString()
                    });

                expect(cookie).to.be.ok;
                expect(cookie.key).to.equal('foo');
                expect(cookie.value).to.equal('bar');
                expect(cookie.expires.toString()).to.equal(expires.toString());
                expect(cookie.maxAge).to.equal(0);
                expect(cookie.domain).to.equal('postman-echo.com');
                expect(cookie.path).to.equal('/my-path');
                expect(cookie.secure).to.be.true;
                expect(cookie.httpOnly).to.be.true;
                expect(cookie.hostOnly).to.be.false;
                expect(cookie.extensions).to.be.ok;
                expect(cookie.extensions.length).to.equal(1);
                expect(cookie.extensions[0]).to.equal('foo=bar');
                expect(cookie.creation.toString()).to.equal(now.toString());
            });
        });

        describe('~parse', function () {
            it('should parse the cookie string', function () {
                const cookie = Cookie.parse([
                    'foo=bar',
                    'Expires=Wed, 28 Dec 2022 19:04:17 GMT',
                    'Max-Age=0',
                    'Domain=postman-echo.com',
                    'Path=/my-path',
                    'Secure',
                    'HttpOnly',
                    'foo=bar'
                ].join('; '));

                expect(cookie).to.be.ok;
                expect(cookie.key).to.equal('foo');
                expect(cookie.value).to.equal('bar');
                expect(cookie.domain).to.equal('postman-echo.com');
                expect(cookie.path).to.equal('/my-path');
                expect(cookie.secure).to.be.true;
                expect(cookie.httpOnly).to.be.true;
                expect(cookie.extensions).to.be.ok;
                expect(cookie.extensions.length).to.equal(1);
                expect(cookie.extensions[0]).to.equal('foo=bar');
                expect(cookie.maxAge).to.equal(0);
                expect(cookie.creation).to.be.ok;
            });
        });
    });

    describe('~Store', function () {
        it('should have findCookie method', function () {
            const store = new Store();

            expect(store.findCookie).to.be.a('function');
        });

        it('should have findCookies method', function () {
            const store = new Store();

            expect(store.findCookies).to.be.a('function');
        });

        it('should have putCookie method', function () {
            const store = new Store();

            expect(store.putCookie).to.be.a('function');
        });

        it('should have updateCookie method', function () {
            const store = new Store();

            expect(store.updateCookie).to.be.a('function');
        });

        it('should have removeCookie method', function () {
            const store = new Store();

            expect(store.removeCookie).to.be.a('function');
        });

        it('should have removeCookies method', function () {
            const store = new Store();

            expect(store.removeCookies).to.be.a('function');
        });

        it('should have removeAllCookies method', function () {
            const store = new Store();

            expect(store.removeAllCookies).to.be.a('function');
        });

        it('should have getAllCookies method', function () {
            const store = new Store();

            expect(store.getAllCookies).to.be.a('function');
        });
    });

    describe('~pathMatch', function () {
        it('should return true if the path are the same', function () {
            expect(pathMatch('/foo', '/foo')).to.be.true;
        });

        it('should return true if the path are the same with trailing slash', function () {
            expect(pathMatch('/foo/', '/foo')).to.be.true;
        });

        // '/foo/bar', '/foo' => true
        it('should return true if cookie-path is a prefix of request-path', function () {
            expect(pathMatch('/foo/bar', '/foo')).to.be.true;
        });

        it('should return false if cookie-path is not a prefix of request-path', function () {
            expect(pathMatch('/foo', '/foo/bar')).to.be.false;
        });

        it('should return false if cookie-path is not a proper prefix of request-path', function () {
            expect(pathMatch('/foobar/baz', '/foo')).to.be.false;
        });
    });

    describe('~permuteDomain', function () {
        it('should return an array of domains', function () {
            expect(permuteDomain('example.com')).to.eql([
                'example.com'
            ]);
        });

        it('should return an array of domains with subdomains', function () {
            expect(permuteDomain('www.example.com')).to.eql([
                'example.com',
                'www.example.com'
            ]);
        });

        it('should return an array of domains with subdomains and public suffix', function () {
            expect(permuteDomain('www.app.example.co.uk')).to.eql([
                'example.co.uk',
                'app.example.co.uk',
                'www.app.example.co.uk'
            ]);
        });

        it('should return null if the domain includes path', function () {
            expect(permuteDomain('www.example.com/foo')).to.be.null;
        });

        it('should return null if the domain is invalid', function () {
            expect(permuteDomain('abcd')).to.be.null;
        });

        it('should return null if the domain is special use domain', function () {
            expect(permuteDomain('example')).to.be.null;
        });

        it('should return null for local domains', function () {
            expect(permuteDomain('localhost')).to.be.null;
        });

        it('should return null for local domains with port', function () {
            expect(permuteDomain('localhost:8080')).to.be.null;
        });

        it('should return null for .local domains', function () {
            expect(permuteDomain('example.local')).to.be.null;
        });

        it('should return null for domains with leading dot', function () {
            expect(permuteDomain('.example.com')).to.be.null;
        });
    });
});
