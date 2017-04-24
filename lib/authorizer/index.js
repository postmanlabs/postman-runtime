var _ = require('lodash'),
    sdk = require('postman-collection'),

    Authorizer;

/**
 * This class manages all authorizations.
 *
 * @param options
 * @param {Boolean} options.interactive - Controls interactive vs non-interactive behavior.
 * @param callback
 * @constructor
 */
Authorizer = function (options, callback) {
    var self = this;

    self.interactive = options.interactive;

    callback(null, this);
};

_.extend(Authorizer.prototype, {
    /**
     * Checks whether required parameters are present, and takes the appropriate next step.
     *
     * @param item
     * @param run
     * @param cursor
     * @param callback
     */
    preVerify: function (item, run, cursor, callback) {
        // if stateless mode is enabled, returns affirmative
        if (!this.interactive) {
            return callback(null, true);
        }

        var handler = item.getAuth();

        if (!handler) {
            // fine, no authentication is to be performed.
            return callback(null, true);
        }

        handler.pre(item, run, cursor, callback);
    },

    /**
     * "Initializes" a request, in turn performing whatever steps are necessary for the
     * authorization to go forward (fetching extra params, prompting user, etc).
     *
     * @param item
     * @param run
     * @param cursor
     * @param callback
     */
    init: function (item, run, cursor, callback) {
        var handler = item.getAuth();

        if (!handler) {
            // fine, no authentication is to be performed.
            return callback(null, true);
        }

        handler.init(item, run, cursor, callback);
    },

    /**
     * Actually performs the signing step, calling the correct signature generators.
     *
     * @param item
     * @param run
     * @param cursor
     * @param callback
     */
    sign: function (item, run, cursor, callback) {
        var handler = item.getAuth();

        try {
            handler && (item.request = handler.authorize(item.request));
        }
        catch (e) {
            return callback(e);
        }

        return callback(null);
    },

    /**
     * Checks whether required parameters are present, and takes the appropriate next step.
     *
     * @param item
     * @param response
     * @param cursor
     * @param run
     * @param callback
     */
    postVerify: function (item, response, run, cursor, callback) {
        // if stateless mode is enabled, returns affirmative
        if (!this.interactive) {
            return callback(null, true);
        }

        var handler = item.getAuth();

        if (!handler) {
            // fine, no authentication is to be performed.
            return callback(null);
        }

        handler.post(item, response, run, cursor, callback);
    }
});

_.extend(Authorizer, {

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
        var Signer = sdk.RequestAuth.types[name];
        if (!Signer) {
            // @todo we have a handler, but no corresponding SDK Signer, what do we do now? :/
            return;
        }

        if (!_.isFunction(Handler.init)) {
            throw new Error('The handler for "' + name + '" does not have an "init" function, which is necessary');
        }

        if (!_.isFunction(Handler.pre)) {
            throw new Error('The handler for "' + name + '" does not have an "pre" function, which is necessary');
        }

        if (!_.isFunction(Handler.post)) {
            throw new Error('The handler for "' + name + '" does not have an "post" function, which is necessary');
        }

        _.extend(Signer.prototype, Handler);

        Authorizer.Handlers[name] = Signer;
    },

    /**
     * Allow injecting custom auth types (helps with testing)
     *
     * @param name
     */
    remove: function (name) {
        Authorizer.Handlers[name] && (delete Authorizer.Handlers[name]);
    }
});

// Create a Handler from each Signer that the SDK provides. Basically, we augment the signers with extra
// helper functions which take over the job of preparing a request for signing.
_.forEach({
    aws4: require('./aws4'),
    basic: require('./basic'),
    digest: require('./digest'),
    hawk: require('./hawk'),
    oauth1: require('./oauth1'),
    oauth2: require('./oauth2')
}, Authorizer.addHandler);

module.exports.Authorizer = Authorizer;
