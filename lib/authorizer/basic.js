var btoa = require('btoa');

module.exports = {
    /**
     * Initializes an item (extracts parameters from intermediate requests if any, etc)
     * before the actual authorization step.
     *
     * @param {RequestAuth} auth
     * @param {Response} response
     * @param done
     */
    init: function (auth, response, done) {
        done(null);
    },

    /**
     * Verifies whether the request has valid basic auth credentials (which is always).
     * Sanitizes the auth parameters if needed.
     * @todo - add support for prompting a user for basic auth credentials if not already provided
     *
     * @param {RequestAuth} auth
     * @param done
     */
    pre: function (auth, done) {
        done(null, true);
    },

    /**
     * Verifies whether the basic auth succeeded.
     *
     * @param {RequestAuth} auth
     * @param {Response} response
     * @param done
     */
    post: function (auth, response, done) {
        done(null, true);
    },

    /**
     * Signs a request.
     *
     * @param {RequestAuth} auth
     * @param {Request} request
     * @param done
     */
    sign: function (auth, request, done) {
        var params = auth.parameters().toObject();

        if (!params) { return done(); } // Nothing to do if no parameters are present.

        request.removeHeader('Authorization', {ignoreCase: true});
        request.addHeader({
            key: 'Authorization',
            value: 'Basic ' + btoa((params.username || '') + ':' + (params.password || '')),
            system: true
        });
        return done();
    }
};
