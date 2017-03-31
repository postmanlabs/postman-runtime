var _ = require('lodash'),
    async = require('async'),
    sdk = require('postman-collection');

module.exports = [
    // Post authorization.
    function (payload, run, done) {
        if (!payload._response) { return done(new Error('No response to process.')); }

        var item = payload._item,
            response = payload._response;

        async.waterfall([
            // Pre verify
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
    },
];
