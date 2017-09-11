var _ = require('lodash'),
    AuthLoader = require('../authorizer/index').AuthLoader,

    util = require('../authorizer/util');

module.exports = [
    // Post authorization.
    function (context, run, done) {
        // if no response is provided, there's nothing to do, and probably means that the request errored out
        // let the actual request command handle whatever needs to be done.
        if (!context.response) { return done(); }

        // bail out if there is no auth
        if (!(context.auth && context.auth.type)) { return done(); }

        // bail out if interactive mode is disabled
        if (!util.isInteractiveForAuth(run.options, context.auth.type)) { return done(); }

        var auth = context.auth,
            authorizer = AuthLoader.getHandler(auth.type);

        // invoke `post` on the Auth
        authorizer.post(auth, context.response, function (err, success) {
            // sync auth state back to item request
            _.set(context, 'item.request.auth', auth);

            // there was an error in auth post hook
            if (err) { return done(err); }

            // auth was verified
            if (success) { return done(); }

            // request a replay of request
            done(null, {replay: true});
        });
    }
];
