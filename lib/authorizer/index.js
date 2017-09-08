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
     * @property {Object}
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

    if (handler) {
        handler.sign(authInterface, clonedReq, function () { return done(null, clonedReq); });
    }
    else {
        return done(new Error('runtime~authorizeRequest: could not find handler for auth type ' + auth.type));
    }
};

module.exports = {
    AuthLoader: AuthLoader,
    authorizeRequest: authorizeRequest
};

/**
 * Interface for implementing auth handlers
 *
 * @interface AuthHandlerInterface
 */

/**
 * This hook decides whether all the required paramaters are present in the auth or not.
 * 3 things can happen depending on how it calls the done callback:
 *
 * 1. Calls with no error: Sign the request and proceed to send the request
 * 2. Calls with error but no request: don't sign the request, but proceed to send the request
 * 3. Calls with error and a request:
 *      - send the intermediate request
 *      - invoke the auth's [init]{@link AuthHandlerInterface#init} hook with the response of the intermediate request
 *      - invoke the auth's [pre]{@link AuthHandlerInterface#pre} hook
 *
 * @function
 * @name AuthHandlerInterface#pre
 *
 * @param {AuthInterface} auth
 * @param {Function} done Callback function
 * @param {Error|null} done.err
 * @param {Boolean} done.success Current request will be replayed if `success` is false
 * @param {Object|String} done.request Intermediate request to be queued.
 * It can be either request URL or request JSON definition
 */

/**
 * This hook is called with the reponse from the intermediate request, which was requested from the
 * [pre]{@link AuthHandlerInterface#pre} hook.
 * Here the `auth` can be modified using the response. After this [pre]{@link AuthHandlerInterface#pre} hook will be
 * called again to verify the required paramaters.
 *
 * @function
 * @name AuthHandlerInterface#init
 *
 * @param {AuthInterface} auth
 * @param {Response} response
 * @param {Function} done Callback function
 * @param {Error|null} done.error
 */

/**
 * This hook signs the `request` using the `auth`.
 *
 * @function
 * @name AuthHandlerInterface#sign
 *
 * @param {AuthInterface} auth
 * @param {Request} resquest
 * @param {Function} done Callback function
 * @param {Error|null} done.err
 */

/**
 * This hook is called after the request is made. It receives the response using which it can determine whether
 * it was a failure or success. It can also modify the `auth` and ask to replay the `request`.
 * For this it has to call the `done` callback with `success` as false.
 *
 * @function
 * @name AuthHandlerInterface#post
 *
 * @param {AuthInterface} auth
 * @param {Response} response
 * @param {Function} done Callback function
 * @param {Error|null} done.err
 * @param {Boolean} done.success
 */
