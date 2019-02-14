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
    bearer: require('./bearer'),
    digest: require('./digest'),
    hawk: require('./hawk'),
    oauth1: require('./oauth1'),
    oauth2: require('./oauth2'),
    ntlm: require('./ntlm'),
    apikey: require('./apikey')
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

// Interface
/**
 * Interface for implementing auth handlers
 *
 * @interface AuthHandlerInterface
 */

// Interface functions
/**
 * Defines the behaviour of an Auth Handler. This way the handler allows to statically analyse
 * any changes the Handler will make ahead of time.
 *
 * @member {AuthHandlerInterface~AuthManifest} AuthHandlerInterface#manifest
 */

/**
 * This hook decides whether all the required parameters are present in the auth or not.
 * What happens next is dependent upon how the `done` callback is called.
 * Check {@link AuthHandlerInterface~authPreHookCallback} for all the possible ways the callback can be called.
 *
 * @function
 * @name AuthHandlerInterface#pre
 *
 * @param {AuthInterface} auth
 * @param {AuthHandlerInterface~authPreHookCallback} done
 * Callback function which takes error, success, and request as arguments
 */

/**
 * This hook is called with the response from the intermediate request, which was requested from the
 * [pre]{@link AuthHandlerInterface#pre} hook.
 * Here the `auth` can be modified using the response. After this [pre]{@link AuthHandlerInterface#pre} hook will be
 * called again to verify the required parameters.
 *
 * @function
 * @name AuthHandlerInterface#init
 *
 * @param {AuthInterface} auth
 * @param {Response} response
 * @param {AuthHandlerInterface~authInitHookCallback} done Callback function which takes error as the only argument
 */

/**
 * This hook signs the `request` using the `auth`.
 *
 * @function
 * @name AuthHandlerInterface#sign
 *
 * @param {AuthInterface} auth
 * @param {Request} request
 * @param {AuthHandlerInterface~authSignHookCallback} done Callback function which takes error as the only argument
 */

/**
 * This hook is called after the request is made. It receives the response using which it can determine whether
 * it was a failure or success. It can also modify the `auth` and ask to replay the `request`.
 * For this it has to call the [done]{@link AuthHandlerInterface~authPostHookCallback} callback with `success` as false.
 *
 * @function
 * @name AuthHandlerInterface#post
 *
 * @param {AuthInterface} auth
 * @param {Response} response
 * @param {AuthHandlerInterface~authPostHookCallback} done Callback function which takes error and success as arguments
 */


// Callbacks
/**
 * This callback is called in the `pre` hook of the auth handler
 * Depending on what parameters are passed in this callback, one of the following flows will be executed:
 * 1. return (err): The request will be stopped and the error will be bubbled up
 * 2. return (null, true): The request will be signed and sent
 * 3. return (null, false): The request will be sent without being signed
 * 4. return (null, false, `request`):
 *  - send the intermediate request
 *  - invoke the auth's [init]{@link AuthHandlerInterface#init} hook with the response of the intermediate request
 *  - invoke the auth's [pre]{@link AuthHandlerInterface#pre} hook
 * @callback AuthHandlerInterface~authPreHookCallback
 * @param {?Error} err
 * @param {Boolean} success Defines whether the [pre]{@link AuthHandlerInterface#pre} hook was successful.
 * @param {Request~definition|String} [request] It can be either request definition or request URL
 */

/**
 * This callback is called in the `init` hook of the auth handler
 * @callback AuthHandlerInterface~authInitHookCallback
 * @param {?Error} err
 */

/**
 * This callback is called in the `sign` hook of the auth handler
 * @callback AuthHandlerInterface~authSignHookCallback
 * @param {?Error} err
 */

/**
 * This callback is called in the `post` hook of the auth handler
 * @callback AuthHandlerInterface~authPostHookCallback
 * @param {?Error} err
 * @param {Boolean} success Defines whether the request was successful or not. If not, it will be replayed.
 */

/**
 * Structure of an Auth Manifest. See {@link AuthHandlerInterface#manifest} for description.
 *
 * @typedef {Object} AuthHandlerInterface~AuthManifest
 *
 * @property {Object} info
 * @property {String} info.name
 * @property {String} info.version
 * @property {Array<Object>} updates
 */
