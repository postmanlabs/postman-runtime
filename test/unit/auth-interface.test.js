var sdk = require('postman-collection'),
    expect = require('expect.js'),
    createAuthInterface = require('../../lib/authorizer/auth-interface');

const USER = 'batman',
    PASS = 'christian bale',
    NONCE = 'abcd',
    CREDENTIALS = [
        {key: 'nonce', value: NONCE},
        {key: 'user', value: USER, system: true},
        {key: 'pass', value: PASS, system: true}
    ],
    fakeAuthObj = {type: 'fake', 'fake': CREDENTIALS};

describe('AuthInterface', function () {
    it('should return undefined on invalid input', function () {
        var authInterface = createAuthInterface();
        expect(authInterface).to.be(undefined);

        authInterface = createAuthInterface({type: 'basic', basic: {}});
        expect(authInterface).to.be(undefined);
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

    it('non system parameters should not be able to be updated', function () {
        var fakeAuth = new sdk.RequestAuth(fakeAuthObj),
            authInterface = createAuthInterface(fakeAuth),
            newNonce = 'xyz';

        authInterface.set('nonce', newNonce);
        expect(authInterface.get('nonce')).not.to.be(newNonce);
        expect(authInterface.get('nonce')).to.be(NONCE);

        authInterface.set({'nonce': newNonce});
        expect(authInterface.get('nonce')).not.to.be(newNonce);
        expect(authInterface.get('nonce')).to.be(NONCE);
    });

    it('new params should be able to be added to auth with system:true property', function () {
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

    it('set with invalid params should return the auth unchanged', function () {
        var fakeAuth = new sdk.RequestAuth(fakeAuthObj),
            authInterface = createAuthInterface(fakeAuth),
            newPassword = 'tom hardy';

        authInterface.set(['user', 'pass'], newPassword);
        expect(authInterface.get('user')).to.be(USER);
    });
});
