/**
 * @fileOverview
 *
 * Implements the NTLM over HTTP specification: [MS-NTHT] https://msdn.microsoft.com/en-us/library/cc237488.aspx
 * Also see [MS-NLMP]: https://msdn.microsoft.com/en-us/library/cc236621.aspx
 *
 * @note NTLM supports a number of different variations, where an actual TCP connection is signed etc. This file
 * does _not_ implement those cases.
 */

var ntlmUtil = require('httpntlm').ntlm,

    STATES = {
        INITIALIZED: 'INITIALIZED',
        T1_MSG_CREATED: 'T1_MSG_CREATED',
        T3_MSG_CREATED: 'T3_MSG_CREATED'
    };

/**
 * @implements {AuthHandlerInterface}
 */
module.exports = {
    /**
     * Initializes an item (extracts parameters from intermediate requests if any, etc)
     * before the actual authorization step.
     *
     * @param {AuthInterface} auth
     * @param {Response} response
     * @param {authInitHookCallback} done
     */
    init: function (auth, response, done) {
        done(null);
    },

    /**
     * Verifies whether the request has valid basic auth credentials (which is always).
     * Sanitizes the auth parameters if needed.
     *
     * @param {AuthInterface} auth
     * @param {authPreHookCallback} done
     */
    pre: function (auth, done) {
        !auth.get('state') && auth.set('state', STATES.INITIALIZED);

        done(null, true);
    },

    /**
     * Verifies whether the basic auth succeeded.
     *
     * @param {AuthInterface} auth
     * @param {Response} response
     * @param {authPostHookCallback} done
     */
    post: function (auth, response, done) {
        var state = auth.get('state'),
            domain = auth.get('domain'),
            workstation = auth.get('workstation'),
            username = auth.get('username'),
            password = auth.get('password'),
            typeOneMessage,
            typeTwoMessage,
            typeThreeMessage,
            item = context.item;

        if (response.code !== 401 && response.code !== 403) {
            return done(null, true);
        }

        if (state === STATES.INITIALIZED) {

            // Nothing to do if the server does not ask us for auth in the first place.
            if (!(response.headers.has('www-authenticate', 'NTLM') &&
                  response.headers.has('www-authenticate', 'Negotiate'))) {
                return done(null, true);
            }

            // Create a type 1 message to send to the server
            typeOneMessage = ntlmUtil.createType1Message({
                domain: domain,
                workstation: workstation || ''
            });

            // Add the type 1 message as the auth header
            item.request.upsertHeader({
                key: 'Authorization',
                value: typeOneMessage
            });

            // Update the state
            auth.set('state', STATES.T1_MSG_CREATED);

            // ask runtime to replay the request
            return done(null, false);
        }
        else if (state === STATES.T1_MSG_CREATED) {

            // At this point, we can assume that the type 1 message was sent to the server
            typeTwoMessage = ntlmUtil.parseType2Message(response.headers.get('www-authenticate') || '');

            if (!typeTwoMessage) {
                return done(new Error('ntlm: server did not correctly process authentication request'));
            }

            typeThreeMessage = ntlmUtil.createType3Message(typeTwoMessage, {
                domain: domain,
                workstation: workstation || '',
                username: username,
                password: password
            });

            // Now create the type 3 message, and add it to the request
            item.request.upsertHeader({
                key: 'Authorization',
                value: typeThreeMessage
            });

            auth.set('state', STATES.T3_MSG_CREATED);

            // ask runtime to replay the request
            return done(null, false);
        }
        else if (state === STATES.T3_MSG_CREATED) {
            // Means we have tried to authenticate, so we should stop here without worrying about anything
            return done(null, true);
        }
        // We are in an undefined state
        return done(null, true);
    },

    /**
     * Signs a request.
     *
     * @param {AuthInterface} auth
     * @param {Request} request
     * @param {authSignHookCallback} done
     */
    sign: function (auth, request, done) {
        return done();
    }
};
