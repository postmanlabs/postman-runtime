var _ = require('lodash'),

    // todo - expose these constants from the SDK.
    NOAUTH = 'noauth',

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

    self.options = options;

    _.forEach(Authorizer.AUTHS, function (Constructor, auth) {
        self[auth] = new Constructor(self.options);
    });

    callback(null, this);
};

_.extend(Authorizer.prototype, {

    /**
     * Returns an auth handler for the given item, if any.
     *
     * @param item
     */
    handler: function (item) {
        var type = _.get(item, 'request.auth.type'),
            handler;

        // No auth is selected
        if (!type || (type === NOAUTH)) { return; }

        handler = this[type];
        return handler;
    },

    /**
     * Checks whether required parameters are present, and takes the appropriate next step.
     *
     * @param item
     * @param run
     * @param callback
     */
    preVerify: function (item, run, callback) {
        // if stateless mode is enabled, returns affirmative
        if (!this.options.interactive) {
            return callback(null, true);
        }

        var handler = this.handler(item);

        if (!handler) {
            // fine, no authentication is to be performed.
            return callback(null, true);
        }

        handler.pre(item, run, run.requester, callback);
    },

    /**
     * "Initializes" a request, in turn performing whatever steps are necessary for the
     * authorization to go forward (fetching extra params, prompting user, etc).
     *
     * @param item
     * @param run
     * @param callback
     */
    init: function (item, run, callback) {
        var handler = this.handler(item);

        if (!handler) {
            // fine, no authentication is to be performed.
            return callback(null, true);
        }

        handler.init(item, run, run.requester, callback);
    },

    /**
     * Actually performs the authorization step, calling the correct signature generators.
     *
     * @param item
     * @param run
     * @param callback
     */
    authorize: function (item, run, callback) {
        var handler = this.handler(item);

        if (!handler) {
            // fine, no authentication is to be performed.
            return callback(null);
        }

        return handler.sign(item, run, callback);
    },

    /**
     * Checks whether required parameters are present, and takes the appropriate next step.
     *
     * @param item
     * @param response
     * @param run
     * @param callback
     */
    postVerify: function (item, response, run, callback) {
        // if stateless mode is enabled, returns affirmative
        if (!this.options.interactive) {
            return callback(null, true);
        }

        var handler = this.handler(item);

        if (!handler) {
            // fine, no authentication is to be performed.
            return callback(null);
        }

        handler.post(item, response, run, run.requester, callback);
    }
});

_.extend(Authorizer, {

    /**
     * All the built-in auth methods.
     *
     * @enum {Object}
     * @todo - should we have no-auth here instead of handling it as a special case
     */
    AUTHS: {
        aws4: require('./auths/aws4'),
        basic: require('./auths/basic'),
        digest: require('./auths/digest'),
        hawk: require('./auths/hawk'),
        oauth1: require('./auths/oauth1'),
        oauth2: require('./auths/oauth2')
    },

    create: function (options, callback) {
        return new Authorizer(options, callback);
    },

    /**
     * Allow injecting custom auth types (helps with testing)
     *
     * @param auth
     * @param name
     *
     * @note Any {@link Authorizer} already constructed will not be able to use the newly added methods.
     * @todo perform some sanity checks on the given auth before accepting it.
     */
    add: function (auth, name) {
        Authorizer.AUTHS[name] = auth;
    },

    /**
     * Allow injecting custom auth types (helps with testing)
     *
     * @param name
     */
    remove: function (name) {
        Authorizer.AUTHS[name] && (delete Authorizer.AUTHS[name]);
    }
});

module.exports.Authorizer = Authorizer;
