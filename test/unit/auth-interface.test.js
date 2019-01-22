var sdk = require('postman-collection'),
    expect = require('chai').expect,
    _ = require('lodash'),
    createAuthInterface = require('../../lib/authorizer/auth-interface');

const USER = 'batman',
    PASS = 'christian bale',
    NONCE = 'abcd',
    EMPTY = '',
    XYZ = 'xyz',
    ABC = 'abc',
    CREDENTIALS = [
        {key: 'nonce', value: NONCE},
        {key: 'user', value: USER, system: true},
        {key: 'pass', value: PASS, system: true}
    ],
    fakeAuthObj = {type: 'fake', 'fake': CREDENTIALS};

describe('AuthInterface', function () {
    it('should throw an error on invalid input', function () {
        expect(function () {
            createAuthInterface({type: 'basic', basic: {}});
        }).to.throw(/runtime~createAuthInterface: invalid auth/);
    });

    it('should return a single value for get with single key', function () {
        var fakeAuth = new sdk.RequestAuth(fakeAuthObj),
            authInterface = createAuthInterface(fakeAuth);

        expect(authInterface.get('user')).to.equal(USER);
        expect(authInterface.get('pass')).to.equal(PASS);
        expect(authInterface.get('joker')).to.be.undefined;
    });

    it('should return an object for get with multiple keys', function () {
        var fakeAuth = new sdk.RequestAuth(fakeAuthObj),
            authInterface = createAuthInterface(fakeAuth);

        expect(authInterface.get(['user', 'pass', 'nonce', 'joker'])).to.eql(
            new sdk.VariableList(null, CREDENTIALS).toObject()
        );
    });

    it('should set with key and value and update the auth', function () {
        var fakeAuth = new sdk.RequestAuth(fakeAuthObj),
            authInterface = createAuthInterface(fakeAuth),
            newUsername = 'bane',
            newPassword = 'tom hardy';

        authInterface.set('user', newUsername);
        authInterface.set('pass', newPassword);
        expect(authInterface.get('user')).to.equal(newUsername);
        expect(authInterface.get('pass')).to.equal(newPassword);
    });

    it('should retain the type of the set value', function () {
        var fakeAuth = new sdk.RequestAuth(fakeAuthObj),
            authInterface = createAuthInterface(fakeAuth);

        // test for Number
        authInterface.set('pass', 123);
        expect(authInterface.get('pass')).to.equal(123);
        // test for Object
        authInterface.set('pass', {foo: 123});
        expect(authInterface.get('pass')).to.eql({foo: 123});
        // test for Array
        authInterface.set('pass', [1, 2, 3]);
        expect(authInterface.get('pass')).to.eql([1, 2, 3]);
        // test for Function
        authInterface.set('pass', function () { return 123; });
        expect(authInterface.get('pass')).to.equal(123);
    });

    it('should update the auth when set with an object', function () {
        var fakeAuth = new sdk.RequestAuth(fakeAuthObj),
            authInterface = createAuthInterface(fakeAuth),
            newUsername = 'bane',
            newCreds = {user: newUsername}; // only partial update, password & nonce shoudn't change

        authInterface.set(newCreds);
        expect(authInterface.get('user')).to.equal(newUsername);
        expect(authInterface.get('pass')).to.equal(PASS);
        expect(authInterface.get('nonce')).to.equal(NONCE);
    });

    it('should not update non-empty user parameters', function () {
        var fakeAuthObj,
            fakeAuth,
            authInterface,
            valuesToTestWith = ['foo', false, 0];

        _.forEach(valuesToTestWith, function (value) {
            fakeAuthObj = {type: 'fake', 'fake': [{key: 'something', value: value}]};
            fakeAuth = new sdk.RequestAuth(fakeAuthObj);
            authInterface = createAuthInterface(fakeAuth);
            authInterface.set('something', XYZ);
            expect(authInterface.get('something')).to.equal(value);
            authInterface.set({'something': XYZ});
            expect(authInterface.get('something')).to.equal(value);
        });
    });

    it('should update user parameters with falsy value', function () {
        var fakeAuthObj,
            fakeAuth,
            authInterface,
            valuesToTestWith = [EMPTY, null, undefined, NaN];

        _.forEach(valuesToTestWith, function (value) {
            fakeAuthObj = {type: 'fake', 'fake': [{key: 'something', value: value}]};
            fakeAuth = new sdk.RequestAuth(fakeAuthObj);
            authInterface = createAuthInterface(fakeAuth);
            authInterface.set('something', XYZ);
            expect(authInterface.get('something')).to.equal(XYZ);
            authInterface.set({'something': ABC});
            expect(authInterface.get('something')).to.equal(ABC);
        });
    });

    it('should add new params with system:true', function () {
        var fakeAuth = new sdk.RequestAuth(fakeAuthObj),
            authInterface = createAuthInterface(fakeAuth),
            joker = 'heath ledger',
            gordon = 'gary oldman';

        authInterface.set('joker', joker);
        authInterface.set({'gordon': gordon});
        expect(authInterface.get('joker')).to.equal(joker);
        expect(authInterface.get('gordon')).to.equal(gordon);
        expect(fakeAuth.parameters().one('joker')).to.have.property('system', true);
        expect(fakeAuth.parameters().one('gordon')).to.have.property('system', true);
    });

    it('should throw on set with invalid params', function () {
        var fakeAuth = new sdk.RequestAuth(fakeAuthObj),
            authInterface = createAuthInterface(fakeAuth),
            newPassword = 'tom hardy';

        expect(function () {
            authInterface.set(true, newPassword);
        }).to.throw(/runtime~AuthInterface: set should be called with `key` as a string or object/);
    });
});
