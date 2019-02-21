var _ = require('lodash'),
    TARGETS = {
        header: 'header',
        query: 'query'
    };

/**
 * This module negotiates the following
 *
 * auth: {
 *     key: 'string',
 *     value: 'string',
 *     in: 'string~enum header, query',
 *
 * }
 * @implements {AuthHandlerInterface}
 */
module.exports = {
    /**
     * @property {AuthHandlerInterface~AuthManifest}
     */
    manifest: {
        info: {
            name: 'apikey',
            version: '0.0.1'
        },
        updates: [
            {
                property: 'in',
                type: 'string'
            },
            {
                property: '*',
                type: 'header'
            },
            {
                property: '*',
                type: 'url.param'
            }
        ]
    },

    /**
     * Initializes an item (extracts parameters from intermediate requests if any, etc)
     * before the actual authorization step
     *
     * @param {AuthInterface} auth
     * @param {Response} response
     * @param {AuthHandlerInterface~authInitHookCallback} done
     */
    init: function (auth, response, done) {
        done();
    },

    /**
     * Verifies whether the request has required parameters
     *
     * @param {AuthInterface} auth
     * @param {AuthHandlerInterface~authPreHookCallback} done
     */
    pre: function (auth, done) {
        // at this point just by looking at auth we cannot determine whether to proceed or not, so we proceed anyway.
        return done(null, true);
    },

    /**
     * Verifies whether the auth succeeded
     *
     * @param {AuthInterface} auth
     * @param {Response} response
     * @param {AuthHandlerInterface~authPostHookCallback} done
     */
    post: function (auth, response, done) {
        done(null, true);
    },

    /**
     * Signs the request
     *
     * @param {AuthInterface} auth
     * @param {Request} request
     * @param {AuthHandlerInterface~authSignHookCallback} done
     */
    sign: function (auth, request, done) {
        var target = TARGETS[auth.get('in')] || TARGETS.header,
            // in api key authentication method api keys are known by different names, thus we don't impose any
            // default value for query name or header name and is provided by the user.There can be a single key or
            // multiple keys.
            keys = _.filter(_.map(request.auth.apikey.members, 'key'), function(key) {
                return (key !== 'in');
            });

        // either key or value should be present
        if (!keys) {
            return done();
        }

        if (target === TARGETS.header) {
            keys.forEach(function(key) {
                request.headers.remove(function (header) {
                    return header && (_.lowerCase(header.key) === _.lowerCase(key));
                });

                request.headers.add({
                    key: key,
                    value: auth.get(key),
                    system: true
                });
            });
        }
        else if (target === TARGETS.query) {
            keys.forEach(function(key) {
                request.url.query.remove(function (query) {
                    return query && (query.key === key);
                });

                request.url.query.add({
                    key: key,
                    value: auth.get(key),
                    system: true
                });
            });
        }

        return done();
    }
};
