var _ = require('lodash'),
    sdk = require('postman-collection'),

    createAuthInterface = require('./auth-interface'),

    AUTH_TYPE_PROP = '__auth_type',

    AuthLoader,
    authorizeRequest;

/**
 * This object manages loading and finding Handlers for auth.
 *
 * @type AuthLoader
 */
AuthLoader = {
    /**
     * Houses list of available Authentication handlers.
     *
     * @property
     */
    handlers: {},

    /**
     * Finds the Handler for an Auth type.
     *
     * @param name
     *
     * @returns {AuthHandler}
     */
    getHandler: function (name) {
        return AuthLoader.handlers[name];
    },

    /**
     * Adds a Handler for use with given Auth type.
     *
     * @param Handler
     * @param name
     */
    addHandler: function (Handler, name) {
        if (!_.isFunction(Handler.init)) {
            throw new Error('The handler for "' + name + '" does not have an "init" function, which is necessary');
        }

        if (!_.isFunction(Handler.pre)) {
            throw new Error('The handler for "' + name + '" does not have a "pre" function, which is necessary');
        }

        if (!_.isFunction(Handler.post)) {
            throw new Error('The handler for "' + name + '" does not have a "post" function, which is necessary');
        }

        if (!_.isFunction(Handler.sign)) {
            throw new Error('The handler for "' + name + '" does not have a "sign" function, which is necessary');
        }

        Object.defineProperty(Handler, AUTH_TYPE_PROP, {
            value: name,
            configurable: false,
            enumerable: false,
            writable: false
        });

        AuthLoader.handlers[name] = Handler;
    },

    /**
     * Removes the Handler for the Auth type.
     *
     * @param name
     */
    removeHandler: function (name) {
        AuthLoader.handlers[name] && (delete AuthLoader.handlers[name]);
    }
};

// Create a Handler from each Signer that the SDK provides. Basically, we augment the signers with extra
// helper functions which take over the job of preparing a request for signing.
_.forEach({
    noauth: require('./noauth'),
    awsv4: require('./aws4'),
    basic: require('./basic'),
    digest: require('./digest'),
    hawk: require('./hawk'),
    oauth1: require('./oauth1'),
    oauth2: require('./oauth2'),
    ntlm: require('./ntlm')
}, AuthLoader.addHandler);

/**
 * Creates a copy of request, with the appropriate auth headers or parameters added.
 *
 * @note This function does not take care of resolving variables.
 *
 * @param {Request} request
 * @param done
 *
 * @returns {Request}
 */
authorizeRequest = function (request, done) {
    if (!request.auth) {
        return done();
    }

    var clonedReq = new sdk.Request(request.toJSON()),
        auth = clonedReq.auth,
        authInterface = createAuthInterface(auth),
        handler = AuthLoader.getHandler(auth.type);

    handler && handler.sign(authInterface, clonedReq, function () { return done(null, clonedReq); });
    if (!handler) {
        return done('runtime~authorizeRequest: could not find handler for auth type' + auth.type);
    }
};

module.exports = {
    AuthLoader: AuthLoader,
    authorizeRequest: authorizeRequest
};
