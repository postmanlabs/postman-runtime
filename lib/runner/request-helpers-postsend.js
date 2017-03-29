var _ = require('lodash'),
    async = require('async'),
    sdk = require('postman-collection');

module.exports = [
    // Post authorization.
    function (payload, run, done) {
        run.authorizer
    },
];
