var sdk = require('postman-collection'),
    expect = require('expect.js'),
    createAuthInterface = require('../../lib/authorizer/auth-interface');

describe('AuthInterface', function () {
    const USER = 'batman',
        PASS = 'christian bale',
        CREDENTIALS = {user: USER, pass: PASS};
    var fakeAuthObj = {type: 'fake', 'fake': CREDENTIALS};

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
        expect(authInterface.get(['user', 'pass', 'joker'])).to.eql(CREDENTIALS);
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
            newPassword = 'tom hardy',
            newCreds = {user: newUsername};

        authInterface.set(newCreds);
        expect(authInterface.get('user')).to.be(newUsername);
        expect(authInterface.get('pass')).to.be(PASS);
    });

    it('set with invalid params should return the auth unchanged', function () {
        var fakeAuth = new sdk.RequestAuth(fakeAuthObj),
            authInterface = createAuthInterface(fakeAuth),
            newPassword = 'tom hardy';

        authInterface.set(['user', 'pass'], newPassword);
        expect(authInterface.get('user')).to.be(USER);
    });
});
