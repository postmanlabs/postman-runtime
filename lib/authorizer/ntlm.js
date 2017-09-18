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
    _ = require('lodash'),

    EMPTY = '',
    NTLM = 'NTLM',
    STATE = 'state',
    NEGOTIATE = 'negotiate',
    NTLM_HEADER = 'ntlmHeader',
    AUTHORIZATION = 'Authorization',
    WWW_AUTHENTICATE = 'www-authenticate',
    NTLM_PARAMETERS = {
        DOMAIN: 'domain',
        WORKSTATION: 'workstation',
        USERNAME: 'username',
        PASSWORD: 'password',
    },
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
     * @param {AuthHandlerInterface~authInitHookCallback} done
     */
    init: function (auth, response, done) {
        done(null);
    },

    /**
     * Verifies whether the request has valid basic auth credentials (which is always).
     * Sanitizes the auth parameters if needed.
     *
     * @param {AuthInterface} auth
     * @param {AuthHandlerInterface~authPreHookCallback} done
     */
    pre: function (auth, done) {
        !auth.get(STATE) && auth.set(STATE, STATES.INITIALIZED);

        done(null, true);
    },

    /**
     * Verifies whether the basic auth succeeded.
     *
     * @param {AuthInterface} auth
     * @param {Response} response
     * @param {AuthHandlerInterface~authPostHookCallback} done
     */
    post: function (auth, response, done) {
        var state = auth.get(STATE),
            domain = auth.get(NTLM_PARAMETERS.DOMAIN) || EMPTY,
            workstation = auth.get(NTLM_PARAMETERS.WORKSTATION) || EMPTY,
            username = auth.get(NTLM_PARAMETERS.USERNAME),
            password = auth.get(NTLM_PARAMETERS.PASSWORD),
            negotiateMessage, // type 1
            challengeMessage, // type 2
            authenticateMessage; // type 3

        if (response.code !== 401 && response.code !== 403) {
            return done(null, true);
        }

        if (state === STATES.INITIALIZED) {

            // Nothing to do if the server does not ask us for auth in the first place.
            if (!(response.headers.has(WWW_AUTHENTICATE, NTLM) ||
                  response.headers.has(WWW_AUTHENTICATE, NEGOTIATE))) {
                return done(null, true);
            }

            // Create a type 1 message to send to the server
            negotiateMessage = ntlmUtil.createType1Message({
                domain: domain,
                workstation: workstation
            });

            // Add the type 1 message as the auth header
            auth.set(NTLM_HEADER, negotiateMessage);

            // Update the state
            auth.set(STATE, STATES.T1_MSG_CREATED);

            // ask runtime to replay the request
            return done(null, false);
        }
        else if (state === STATES.T1_MSG_CREATED) {

            // At this point, we can assume that the type 1 message was sent to the server
            challengeMessage = ntlmUtil.parseType2Message(response.headers.get(WWW_AUTHENTICATE) || EMPTY, _.noop);

            if (!challengeMessage) {
                return done(new Error('ntlm: server did not correctly process authentication request'));
            }

            authenticateMessage = ntlmUtil.createType3Message(challengeMessage, {
                domain: domain,
                workstation: workstation,
                username: username,
                password: password
            });

            // Now create the type 3 message, and add it to the request
            auth.set(NTLM_HEADER, authenticateMessage);
            auth.set(STATE, STATES.T3_MSG_CREATED);

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
     * @param {AuthHandlerInterface~authSignHookCallback} done
     */
    sign: function (auth, request, done) {
        request.removeHeader(AUTHORIZATION, {ignoreCase: true});
        if (auth.get(NTLM_HEADER)) {
            request.addHeader({
                key: AUTHORIZATION,
                value: auth.get(NTLM_HEADER),
                system: true
            });
        }
        return done();
    }
};
