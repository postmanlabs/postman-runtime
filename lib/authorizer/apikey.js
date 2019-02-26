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
 *     // @todo implement:
 *     privateKey: 'string',
 *     privateValue: 'string'
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
        return done(null, Boolean(auth.get('key') || auth.get('value')));
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
            key = auth.get('key'),
            value = auth.get('value'),

            lkey = _.lowerCase(key); // needed for header case insensitive matches

        // either key or value should be present
        if (!(key || value)) {
            return done();
        }

        if (target === TARGETS.header) {
            request.headers.remove(function (header) {
                return header && (_.lowerCase(header.key) === lkey);
            });

            request.headers.add({
                key: key,
                value: value,
                system: true
            });
        }
        else if (target === TARGETS.query) {
            request.url.query.remove(function (query) {
                return query && (query.key === key);
            });

            request.url.query.add({
                key: key,
                value: value,
                system: true
            });
        }

        return done();
    }
};
