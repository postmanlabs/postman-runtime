var async = require('async');

module.exports = [
    // Post authorization.
    function (payload, run, done) {
        // if no response is provided, there's nothing to do, and probably means that the request errored out
        // let the actual request command handle whatever needs to be done.
        if (!payload._response) { return done(); }

        var item = payload._item,
            response = payload._response;

        async.waterfall([
            // Post verify
            function (next) {
                run.authorizer.postVerify(item, response, run, next);
            },
            // Call initialize if necessary
            function (verified, next) {
                // If verification succeeds or the request is already a replay,
                // move on to the next request
                if (verified || payload._replay) { return next(null); }

                payload._replay = true;
                run.authorizer.init(item, run, function (err) {
                    return next(err);
                });
            }
        ], done);
    }
];
