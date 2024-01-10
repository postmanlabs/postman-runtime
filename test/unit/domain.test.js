const expect = require('chai').expect;
const {
    _containsProtocol,
    areDomainsEqual,
    hasDomain,
    hasMatchingDomain
} = require('../../lib/runner/domains');

describe('domains', function () {
    describe('_containsProtocol', function () {
        it('should return true if url has a protocol', function () {
            const res = _containsProtocol('https://postman-echo.com');

            expect(res).to.equal(true);
        });
        it('should return false if url has a protocol', function () {
            const res = _containsProtocol('postman-echo.com');

            expect(res).to.equal(false);
        });
    });

    describe('areDomainsEqual', function () {
        it('should auto add https:// and www for checks and return true', function () {
            const res = areDomainsEqual('www.postman-echo.com',
                'https://postman-echo.com');

            expect(res).to.equal(true);
        });
        it('should auto add https:// and www for checks and return true but other way', function () {
            const res = areDomainsEqual('https://postman-echo.com',
                'www.postman-echo.com');

            expect(res).to.equal(true);
        });

        it('should return false if domains are not same', function () {
            const res = areDomainsEqual('https://postman-echo.com',
                'www.postman.com');

            expect(res).to.equal(false);
        });
    });

    describe('hasDomain', function () {
        it('should return false if domains is falsy', function () {
            const res = hasDomain({
                domains: undefined
            });

            expect(res).to.equal(false);
        });
        it('should return false if domains is empty string', function () {
            const res = hasDomain({
                domains: ''
            });

            expect(res).to.equal(false);
        });

        it('should return false if domains is an array of empty length', function () {
            const res = hasDomain({
                domains: []
            });

            expect(res).to.equal(false);
        });

        it('should return false if domains is not an array', function () {
            const res = hasDomain({
                domains: {}
            });

            expect(res).to.equal(false);
        });

        it('should return true if domains is an array of non-zero length', function () {
            const res = hasDomain({
                domains: ['postman-echo.com']
            });

            expect(res).to.equal(true);
        });
    });

    describe('hasMatchingDomain', function () {
        it('should return true if domain is invalid', function () {
            const resFn = hasMatchingDomain('<url>'),
                res = resFn({ domains: [] });

            expect(res).to.equal(true);
        });

        it('should return false if url does not match domains', function () {
            const resFn = hasMatchingDomain('https://postman-echo.com'),
                res = resFn({ domains: ['postman.com'] });

            expect(res).to.equal(false);
        });

        it('should return true if url matches domains', function () {
            const resFn = hasMatchingDomain('https://postman-echo.com'),
                res = resFn({ domains: ['postman-echo.com'] });

            expect(res).to.equal(true);
        });
    });
});
