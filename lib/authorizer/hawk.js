var _ = require('lodash'),
    Hawk = require('hawk');

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
     * Checks the item, and fetches any parameters that are not already provided.
     * Sanitizes the auth parameters if needed.
     *
     * @param {RequestAuth} auth
     * @param done
     */
    pre: function (auth, done) {
        done(null, true);
    },

    /**
     * Verifies whether the request was successfully authorized after being sent.
     *
     * @param {RequestAuth} auth
     * @param {Response} response
     * @param done
     */
    post: function (auth, response, done) {
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
     * @param {RequestAuth} auth
     * @param {Request} request
     * @param done
     */
    sign: function (auth, request, done) {
        var result,
            params = auth.parameters().toObject();

        if (!params || !params.authId || !params.authKey) {
            return request; // Nothing to do if no parameters are present.
        }

        params.nonce = params.nonce || _.randomString(6);
        params.timestamp = _.parseInt(params.timestamp) ||
            // Hawk has this function in their Node distribution, but not in the browsers :/
            (_.isFunction(Hawk.utils.nowSecs) ? Hawk.utils.nowSecs() : Hawk.utils.now());

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
        done();
    }
};
