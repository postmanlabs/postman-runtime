var sdk = require('postman-collection'),
    expect = require('expect.js'),
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
        expect(createAuthInterface).withArgs({type: 'basic', basic: {}})
            .to.throwError(/runtime~createAuthInterface: invalid auth/);
    });

    it('get with single key should return single value', function () {
        var fakeAuth = new sdk.RequestAuth(fakeAuthObj),
            authInterface = createAuthInterface(fakeAuth);
        expect(authInterface.get('user')).to.be(USER);
        expect(authInterface.get('pass')).to.be(PASS);
        expect(authInterface.get('joker')).to.be(undefined);
    });

    it('get with multiple keys should return object', function () {
        var fakeAuth = new sdk.RequestAuth(fakeAuthObj),
            authInterface = createAuthInterface(fakeAuth);
        expect(authInterface.get(['user', 'pass', 'nonce', 'joker'])).to.eql(
            new sdk.VariableList(null, CREDENTIALS).toObject()
        );
    });

    it('set with key and value should update the auth', function () {
        var fakeAuth = new sdk.RequestAuth(fakeAuthObj),
            authInterface = createAuthInterface(fakeAuth),
            newUsername = 'bane',
            newPassword = 'tom hardy';

        authInterface.set('user', newUsername);
        authInterface.set('pass', newPassword);
        expect(authInterface.get('user')).to.be(newUsername);
        expect(authInterface.get('pass')).to.be(newPassword);
    });

    it('set should retain the data type of value', function () {
        var fakeAuth = new sdk.RequestAuth(fakeAuthObj),
            authInterface = createAuthInterface(fakeAuth);

        // test for Number
        authInterface.set('pass', 123);
        expect(authInterface.get('pass')).to.be(123);
        // test for Object
        authInterface.set('pass', {foo: 123});
        expect(authInterface.get('pass')).to.eql({foo: 123});
        // test for Array
        authInterface.set('pass', [1, 2, 3]);
        expect(authInterface.get('pass')).to.eql([1, 2, 3]);
        // test for Function
        authInterface.set('pass', function () { return 123; });
        expect(authInterface.get('pass')).to.be(123);
    });

    it('set with an object should update the auth', function () {
        var fakeAuth = new sdk.RequestAuth(fakeAuthObj),
            authInterface = createAuthInterface(fakeAuth),
            newUsername = 'bane',
            newCreds = {user: newUsername}; // only partial update, password & nonce shoudn't change

        authInterface.set(newCreds);
        expect(authInterface.get('user')).to.be(newUsername);
        expect(authInterface.get('pass')).to.be(PASS);
        expect(authInterface.get('nonce')).to.be(NONCE);
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
            expect(authInterface.get('something')).to.be(value);
            authInterface.set({'something': XYZ});
            expect(authInterface.get('something')).to.be(value);
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
            expect(authInterface.get('something')).to.be(XYZ);
            authInterface.set({'something': ABC});
            expect(authInterface.get('something')).to.be(ABC);
        });
    });

    it('new params should be added with system:true', function () {
        var fakeAuth = new sdk.RequestAuth(fakeAuthObj),
            authInterface = createAuthInterface(fakeAuth),
            joker = 'heath ledger',
            gordon = 'gary oldman';

        authInterface.set('joker', joker);
        authInterface.set({'gordon': gordon});
        expect(authInterface.get('joker')).to.be(joker);
        expect(authInterface.get('gordon')).to.be(gordon);
        expect(fakeAuth.parameters().one('joker')).to.have.property('system', true);
        expect(fakeAuth.parameters().one('gordon')).to.have.property('system', true);
    });

    it('set with invalid params should throw', function () {
        var fakeAuth = new sdk.RequestAuth(fakeAuthObj),
            authInterface = createAuthInterface(fakeAuth),
            newPassword = 'tom hardy';

        expect(authInterface.set).withArgs(true, newPassword)
            .to.throwError(/runtime~AuthInterface: set should be called with `key` as a string or object/);
    });
});
