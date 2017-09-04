var _ = require('lodash'),

    AUTH_TYPE_PROP = '__auth_type',

    Authorizer;

/**
 * @callback Authorizer~callback
 * @param {Error} err - Errors that occur during construction
 * @param {Authorizer} - The created instance of the authorizer
 */
/**
 * This class manages all authorizations.
 *
 * @param {Object=} options
 * @param {Boolean=} options.interactive - Controls interactive vs non-interactive behavior.
 * @param {Authorizer~callback} callback
 * @constructor
 */
Authorizer = function (options, callback) {
    if (!callback && _.isFunction(options)) {
        callback = options;
        options = undefined;
    }

    var interactive = options && options.interactive;

    // if options.interactive is a boolean, make an object out of it, { 'authtype': bool }, else just use it directly.
    this.interactive = !_.isObject(interactive) ?
        _.transform(Authorizer.Handlers, function (accumulator, handler, name) {
            accumulator[name] = Boolean(interactive);
        }, {}) :
        interactive;

    callback(null, this);
};

_.assign(Authorizer.prototype, /** @lends Authorizer.prototype */ {

    /**
     * Checks if a given auth is enabled.
     *
     * @param {RequestAuthBase} auth
     * @returns {Boolean}
     */
    isInteractive: function (auth) {
        var type = _.get(auth, AUTH_TYPE_PROP);

        return type && _.get(this.interactive, type, false);
    }
});

_.assign(Authorizer, /** @lends Authorizer */ {

    /**
     * All the built-in auth methods.
     *
     * @enum {Object}
     */
    Handlers: {},

    create: function (options, callback) {
        return new Authorizer(options, callback);
    },

    /**
     * Allow injecting custom auth types (helps with testing)
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

        Authorizer.Handlers[name] = Handler;
    },

    /**
     * Allow injecting custom auth types (helps with testing)
     *
     * @param name
     */
    removeHandler: function (name) {
        Authorizer.Handlers[name] && (delete Authorizer.Handlers[name]);
    }
});

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
}, Authorizer.addHandler);

module.exports.Authorizer = Authorizer;
