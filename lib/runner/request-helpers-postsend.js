var AuthLoader = require('../authorizer/index').AuthLoader,

    ReplayController = require('./replay-controller'),
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
            // there was an error in auth post hook
            if (err) { return done(err); }

            // auth was verified
            if (success) {
                return done();
            }

            // Auth wants to replay the request
            var replayController = new ReplayController(context.replayState, run);

            // finish up current request and schedule a replay
            replayController.requestReplay(context, context.item, false, function (err) {
                done(err);
            }, function (err) {
                done(err);
            });
        });
    }
];
