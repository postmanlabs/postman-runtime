var _ = require('lodash'),
    sdk = require('postman-collection'),

    AUTH_TYPE_PROP = '__auth_type',

    PRE = 'pre',
    POST = 'post',
    INIT = 'init',
    DOT_AUTH = '.auth',

    arraySlice = Array.prototype.slice,

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
    },

    /**
     * Checks whether required parameters are present, and takes the appropriate next step.
     *
     * @param context
     * @param run
     * @param callback
     */
    preVerify: function (context, run, callback) {
        var auth = context.auth,
            handler = Authorizer.Handlers[auth.type];

        if (!this.isInteractive(handler)) {
            // fine, no authentication is to be performed.
            return callback(null, true);
        }

        run.requester.create({
            type: 'http', // @todo - how can the auth declare what type it needs?
            source: _.get(handler, AUTH_TYPE_PROP, PRE) + DOT_AUTH
        }, function (err, requester) {
            if (err) { return callback(err); }

            handler.pre(context, requester, function () {
                requester.dispose(); // todo - when this becomes async, call the callback after dispose.
                callback.apply(run, arraySlice.call(arguments));
            });
        });
    },

    /**
     * "Initializes" a request, in turn performing whatever steps are necessary for the
     * authorization to go forward (fetching extra params, prompting user, etc).
     *
     * @param context
     * @param run
     * @param callback
     */
    init: function (context, run, callback) {
        var auth = context.auth,
            handler = Authorizer.Handlers[auth.type];

        if (!this.isInteractive(handler)) {
            // fine, no authentication is to be performed.
            return callback(null, true);
        }

        run.requester.create({
            type: 'http', // @todo - how can the auth declare what type it needs?
            source: _.get(handler, AUTH_TYPE_PROP, INIT) + DOT_AUTH
        }, function (err, requester) {
            if (err) { return callback(err); }

            handler.init(context, requester, function () {
                requester.dispose(); // todo - when this becomes async, call the callback after dispose.
                callback.apply(run, arraySlice.call(arguments));
            });
        });
    },

    /**
     * Actually performs the signing step, calling the correct signature generators.
     *
     * @param context
     * @param run
     * @param callback
     */
    sign: function (context, run, callback) {
        var auth = context.auth,
            authVarlist = auth.parameters(),
            params,
            handler;

        if (authVarlist) {
            params = auth.parameters().toObject();
            handler = Authorizer.Handlers[auth.type];
        }

        try {
            handler && (context.item.request = handler.sign(params, context.item.request));
        }
        catch (e) {
            return callback(e);
        }

        return callback(null);
    },

    /**
     * Checks whether required parameters are present, and takes the appropriate next step.
     *
     * @param context
     * @param run
     * @param callback
     */
    postVerify: function (context, run, callback) {
        var auth = context.auth,
            handler = Authorizer.Handlers[auth.type];

        if (!this.isInteractive(handler)) {
            // fine, no authentication is to be performed.
            return callback(null, true);
        }

        run.requester.create({
            type: 'http', // @todo - how can the auth declare what type it needs?
            source: _.get(handler, AUTH_TYPE_PROP, POST) + DOT_AUTH
        }, function (err, requester) {
            if (err) { return callback(err); }

            handler.post(context, requester, function () {
                requester.dispose(); // todo - when this becomes async, call the callback after dispose.
                callback.apply(run, arraySlice.call(arguments));
            });
        });
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
    },

    /**
    * Creates a copy of request, with the appropriate auth headers or parameters added.
    *
    * @note This function does not take care of resolving variables.
    * @param {Request} request
    * @returns {Request}
    * @throws {Error}
    */
    authorize: function (request) {
        if (!request.auth) { return request; }

        var clonedReq = new sdk.Request(request.toJSON()),
            auth = clonedReq.auth,
            authVarlist = auth.parameters(),
            handler,
            params;

        if (authVarlist) {
            params = auth.parameters().toObject();
            handler = Authorizer.Handlers[auth.type];
        }

        handler && (clonedReq = handler.sign(params, clonedReq));
        return clonedReq;
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
