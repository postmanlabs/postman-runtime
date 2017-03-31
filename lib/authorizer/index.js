var _ = require('lodash'),
    async = require('async'),

    // todo - expose these constants from the SDK.
    NOAUTH = 'noauth',

    Authorizer;

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
     * Checks whether required parameters are present, and takes the appropriate next step.
     *
     * @param item
     * @param run
     * @param callback
     */
    preVerify: function (item, run, callback) {
        // if stateless mode is enabled, returns affirmative
        if (this.options.stateless) {
            return callback(null, true);
        }

        var authType = item.request.auth.type,
            handler;

        if (!authType || (authType === NOAUTH) || !(handler = this[authType])) {
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
        var authType = item.request.auth.type,
            handler;

        if (!authType || (authType === NOAUTH) || !(handler = this[authType])) {
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
        // perform the actual signature additions etc
        item.request = item.request.authorize();
        callback(null);
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
        if (this.options.stateless) {
            return callback(null, true);
        }

        var authType = item.request.auth.type,
            handler;

        if (!authType || (authType === NOAUTH) || !(handler = this[authType])) {
            // fine, no authentication is to be performed.
            return callback(null, true);
        }

        handler.post(item, response, run, run.requester, callback);
    },

    /**
     * Allow injecting custom auth types (helps with testing)
     *
     * @param auth
     * @param name
     */
    add: function (auth, name) {
        this[name] = auth;
    },

    /**
     * Allow injecting custom auth types (helps with testing)
     *
     * @param auth
     * @param name
     */
    remove: function (name) {
        this[name] && (delete this[name]);
    }
});

_.extend(Authorizer, {
    AUTHS: {
        digest: require('./auths/digest'),
        basic: require('./auths/basic')
    },

    create: function (options, callback) {
        return new Authorizer(options, callback);
    }
});

module.exports.Authorizer = Authorizer;
