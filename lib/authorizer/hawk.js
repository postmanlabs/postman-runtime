var _ = require('lodash'),
    Hawk = require('hawk'),

    ASCII_SOURCE = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
    ASCII_SOURCE_LENGTH = ASCII_SOURCE.length,
    EMPTY = '';

/**
 * Generates a random string of given length (useful for nonce generation, etc).
 *
 * @param {Number} length
 */
function randomString (length) {
    length = length || 6;

    var result = [],
        i;

    for (i = 0; i < length; i++) {
        result[i] = ASCII_SOURCE[(Math.random() * ASCII_SOURCE_LENGTH) | 0];
    }
    return result.join(EMPTY);
}

module.exports = {
    /**
     * Initializes a item (fetches all required parameters, etc) before the actual authorization step.
     *
     * @param {RequestContext} context
     * @param {Requester} requester
     * @param done
     */
    init: function (context, requester, done) {
        done(null);
    },

    /**
     * Checks the item, and fetches any parameters that are not already provided.
     *
     * @param {RequestContext} context
     * @param {Requester} requester
     * @param done
     */
    pre: function (context, requester, done) {
        var authVarList = context.auth[context.auth.type],
            params = {};

        params.nonce = params.nonce || randomString(6);
        params.timestamp = _.parseInt(params.timestamp) ||
            // Hawk has this function in their Node distribution, but not in the browsers :/
            (_.isFunction(Hawk.utils.nowSecs) ? Hawk.utils.nowSecs() : Hawk.utils.now());

        authVarList.syncFromObject(params, false, false);
        done(null, true);
    },

    /**
     * Verifies whether the request was successfully authorized after being sent.
     *
     * @param {RequestContext} context
     * @param {Requester} requester
     * @param done
     */
    post: function (context, requester, done) {
        done(null, true);
    },

    /**
     * Computes signature and Auth header for a request.
     *
     * @param {Object} params
     * @param {Object} params.credentials Contains hawk auth credentials, "id", "key" and "algorithm"
     * @param {String} params.nonce
     * @param {String} params.ext Extra data that may be associated with the request.
     * @param {String} params.app Application ID used in Oz authorization protocol
     * @param {String} params.dlg Delegation information (used in the Oz protocol)
     * @param {String} params.user User id
     * @param {String} params.url Complete request URL
     * @param {String} params.method Request method
     *
     * @returns {*}
     */
    computeHeader: function (params) {
        return Hawk.client.header(params.url, params.method, params);
    },

    /**
     * Signs a request.
     *
     * @param {Object} params
     * @param {Request} request
     * @todo - this should be made into ".sign" after the signature calculation is moved out of the SDK.
     */
    sign: function (params, request) {
        var result;

        if (!params || !params.authId || !params.authKey) {
            return request; // Nothing to do if no parameters are present.
        }

        request.removeHeader('Authorization', {ignoreCase: true});
        result = this.computeHeader({
            credentials: {
                id: params.authId,
                key: params.authKey,
                algorithm: params.algorithm
            },
            nonce: params.nonce,
            timestamp: params.timestamp,
            ext: params.extraData,
            app: params.app,
            dlg: params.delegation,
            user: params.user,
            url: request.url.toString(true), // force toString to add a protocol to the URL.
            method: request.method
        });
        request.addHeader({
            key: 'Authorization',
            value: result.field,
            system: true
        });
        return request;
    }
};
