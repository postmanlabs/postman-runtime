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
    DISABLE_RETRY_REQUEST = 'disableRetryRequest',
    NTLM_PARAMETERS = {
        DOMAIN: 'domain',
        WORKSTATION: 'workstation',
        USERNAME: 'username',
        PASSWORD: 'password'
    },
    STATES = {
        INITIALIZED: 'INITIALIZED',
        T1_MSG_CREATED: 'T1_MSG_CREATED',
        T3_MSG_CREATED: 'T3_MSG_CREATED'
    };

/**
 * Parses the username to separate username and domain. It can handle two formats:
 *   - Down-Level Logon name format `DOMAIN\USERNAME`
 *   - User Principal Name format `USERNAME@DOMAIN`
 *
 * @param {String} username - Username string to parse from
 * @return {Object} - An object with `username` and `domain` fields, which are `strings`.
 */
function parseParametersFromUsername (username) {
    var dllParams,
        upnParams;

    if (!(username && typeof username === 'string')) {
        return {
            username: EMPTY,
            domain: EMPTY
        };
    }

    dllParams = username.split('\\');
    upnParams = username.split('@');

    // username should be either of the two formats, not both
    if (dllParams.length > 1 && upnParams.length > 1) {
        return {
            username,
            domain: EMPTY
        };
    }

    // try to parse from "down level logon" format
    if (dllParams.length === 2 && dllParams[0] && dllParams[1]) {
        return {
            username: dllParams[1],
            domain: dllParams[0]
        };
    }

    // try to parse from "user principal name" format
    if (upnParams.length === 2 && upnParams[0] && upnParams[1]) {
        return {
            username: upnParams[0],
            domain: upnParams[1]
        };
    }

    return {
        username,
        domain: EMPTY
    };
}

/**
 * NTLM auth while authenticating requires negotiateMessage (type 1) and authenticateMessage (type 3) to be stored.
 * Also it needs to know which stage is it in (INITIALIZED, T1_MSG_CREATED and T3_MSG_CREATED).
 * After the first successful authentication, it just relies on the TCP connection, no other state is needed.
 * @todo Currenty we don't close the connection. So there is no way to de-authenticate.
 *
 * @implements {AuthHandlerInterface}
 */
module.exports = {
    /**
     * @property {AuthHandlerInterface~AuthManifest}
     */
    manifest: {
        info: {
            name: 'ntlm',
            version: '1.0.0'
        },
        updates: [
            {
                property: 'Authorization',
                type: 'header'
            }
        ]
    },

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
        if (auth.get(DISABLE_RETRY_REQUEST)) {
            return done(null, true);
        }

        var state = auth.get(STATE),
            domain = auth.get(NTLM_PARAMETERS.DOMAIN) || EMPTY,
            workstation = auth.get(NTLM_PARAMETERS.WORKSTATION) || EMPTY,
            username = auth.get(NTLM_PARAMETERS.USERNAME) || EMPTY,
            password = auth.get(NTLM_PARAMETERS.PASSWORD) || EMPTY,
            negotiateMessage, // type 1
            challengeMessage, // type 2
            authenticateMessage, // type 3
            ntlmType2Header,
            parsedParameters;

        if (response.code !== 401 && response.code !== 403) {
            return done(null, true);
        }

        // we try to extract domain from username if not specified.
        if (!domain) {
            parsedParameters = parseParametersFromUsername(username) || {};

            username = parsedParameters.username;
            domain = parsedParameters.domain;
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

            // there can be multiple headers present with key `www-authenticate`.
            // iterate to get the one which has the NTLM hash. if multiple
            // headers have the NTLM hash, use the first one.
            ntlmType2Header = response.headers.find(function (header) {
                return String(header.key).toLowerCase() === WWW_AUTHENTICATE &&
                    header.valueOf().startsWith('NTLM ');
            });

            if (!ntlmType2Header) {
                return done(new Error('ntlm: server did not send NTLM type 2 message'));
            }

            challengeMessage = ntlmUtil.parseType2Message(ntlmType2Header.valueOf(), _.noop);

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
        var ntlmHeader = auth.get(NTLM_HEADER);

        request.removeHeader(AUTHORIZATION, {ignoreCase: true});
        ntlmHeader && request.addHeader({
            key: AUTHORIZATION,
            value: ntlmHeader,
            system: true
        });

        return done();
    }
};
