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

module.exports = {
    /**
     * Initializes a item (fetches all required parameters, etc) before the actual authorization step.
     *
     * @param {RequestContext} context
     * @param {Requester} requester
     * @param done
     */
    init: function (context, requester, done) {
        this._ = this._ || {};
        this._state = STATES.INITIALIZED;
        done(null);
    },

    /**
     * Verifies whether the request has correct NTLM credentials.
     *
     * @param {RequestContext} context
     * @param {Requester} requester
     * @param done
     */
    pre: function (context, requester, done) {
        if (!this._state) {
            return done(null, false);
        }
        done(null, true);
    },

    /**
     * Verifies whether the no auth succeeded. (Which means, does nothing.)
     *
     * @param {RequestContext} context
     * @param {Requester} requester
     * @param done
     */
    post: function (context, requester, done) {
        var auth = this,
            typeOneMessage,
            typeTwoMessage,
            typeThreeMessage,
            response = context.response,
            item = context.item;

        if (response.code !== 401 && response.code !== 403) {
            return done(null, true);
        }

        if (auth._state === STATES.INITIALIZED) {

            // Nothing to do if the server does not ask us for auth in the first place.
            if (!(response.headers.has('www-authenticate', 'NTLM') &&
                  response.headers.has('www-authenticate', 'Negotiate'))) {
                return done(null, true);
            }

            // Create a type 1 message to send to the server
            typeOneMessage = ntlmUtil.createType1Message({
                domain: auth.domain,
                workstation: auth.workstation || ''
            });

            // Add the type 1 message as the auth header
            item.request.upsertHeader({
                key: 'Authorization',
                value: typeOneMessage
            });

            // Update the state
            auth._state = STATES.T1_MSG_CREATED;

            // ask runtime to replay the request
            return done(null, false);
        }
        else if (auth._state === STATES.T1_MSG_CREATED) {

            // At this point, we can assume that the type 1 message was sent to the server
            typeTwoMessage = ntlmUtil.parseType2Message(response.headers.get('www-authenticate') || '');

            if (!typeTwoMessage) {
                return done(new Error('ntlm: server did not correctly process authentication request'));
            }

            typeThreeMessage = ntlmUtil.createType3Message(typeTwoMessage, {
                domain: auth.domain,
                workstation: auth.workstation || '',
                username: auth.username,
                password: auth.password
            });

            // Now create the type 3 message, and add it to the request
            item.request.upsertHeader({
                key: 'Authorization',
                value: typeThreeMessage
            });

            auth._state = STATES.T3_MSG_CREATED;

            // ask runtime to replay the request
            return done(null, false);
        }
        else if (auth._state === STATES.T3_MSG_CREATED) {
            // Means we have tried to authenticate, so we should stop here without worrying about anything
            return done(null, true);
        }
        // We are in an undefined state
        done(null, true);
    },

    /**
     * Signs a request.
     *
     * @param {Request} request
     * @todo - this should be made into ".sign" after the signature calculation is moved out of the SDK.
     */
    _sign: function (request) {
        return this.authorize(request);
    }
};
