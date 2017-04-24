var async = require('async');

module.exports = [
    // Post authorization.
    function (payload, run, done) {
        // if no response is provided, there's nothing to do, and probably means that the request errored out
        // let the actual request command handle whatever needs to be done.
        if (!payload._response) { return done(); }

        var item = payload._item,
            response = payload._response,
            cursor = payload.coords;

        async.waterfall([
            // Post verify
            function (next) {
                run.authorizer.postVerify(item, response, cursor, run, next);
            },
            // Call initialize if necessary
            function (verified, next) {
                // If verification fails & the request is not already replayed,
                // indicate that a replay should be done here.
                (!verified && !payload._replay) && (payload._replay = true);
                return next();
            }
        ], done);
    }
];
