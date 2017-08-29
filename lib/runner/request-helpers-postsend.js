var async = require('async'),

    DEFAULT_TRACE_SRC = 'replay';

module.exports = [
    // Post authorization.
    function (context, run, done) {
        // if no response is provided, there's nothing to do, and probably means that the request errored out
        // let the actual request command handle whatever needs to be done.
        if (!context.response) { return done(); }

        async.waterfall([
            // Post verify
            function (next) {
                run.authorizer.postVerify(context, run, next);
            },
            function (verified, next) {
                // If verification fails, indicate that a replay should be done here.
                context.replay = !verified;

                if (context.replay) {
                    // add a trace to the context, which will be used when the request is replayed
                    context.trace = {
                        type: 'http',
                        source: (context.auth.type || DEFAULT_TRACE_SRC) + '.auth',
                        cursor: context.coords
                    };
                }

                return next();
            }
        ], done);
    }
];
