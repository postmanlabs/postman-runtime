var _ = require('lodash'),

    AuthLoader = require('../authorizer/index').AuthLoader,
    createAuthInterface = require('../authorizer/auth-interface'),

    DOT_AUTH = '.auth';

module.exports = [
    // Post authorization.
    function (context, run, done) {
        // if no response is provided, there's nothing to do, and probably means that the request errored out
        // let the actual request command handle whatever needs to be done.
        if (!context.response) { return done(); }

        // bail out if there is no auth
        if (!(context.auth && context.auth.type)) { return done(); }

        var auth = context.auth,
            originalAuth = context.originalItem.getAuth(),
            originalAuthParams = originalAuth && originalAuth.parameters(),
            authHandler = AuthLoader.getHandler(auth.type),
            authInterface = createAuthInterface(auth);

        // bail out if there is no matching auth handler for the type
        if (!authHandler) {
            run.triggers.console(context.coords, 'warn', 'runtime: could not find a handler for auth: ' + auth.type);

            return done();
        }

        // invoke `post` on the Auth
        authHandler.post(authInterface, context.response, function (err, success) {
            // sync all auth system parameters to the original auth
            originalAuthParams && auth.parameters().each(function (param) {
                param && param.system && originalAuthParams.upsert({key: param.key, value: param.value, system: true});
            });

            // sync auth state back to item request
            _.set(context, 'item.request.auth', auth);

            // there was an error in auth post hook
            // warn the user but don't bubble it up
            if (err) {
                run.triggers.console(
                    context.coords,
                    'warn',
                    'runtime~' + auth.type + '.auth: there was an error validating auth: ' + (err.message || err),
                    err
                );

                return done();
            }

            // auth was verified
            if (success) { return done(); }

            // request a replay of request
            done(null, {replay: true, helper: auth.type + DOT_AUTH});
        });
    }
];
