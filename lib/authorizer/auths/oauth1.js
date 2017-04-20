module.exports = {
    /**
     * Initializes a item (fetches all required parameters, etc) before the actual authorization step.
     *
     * @param {Item} item
     * @param {Run} run
     * @param {Requester} requester
     * @param done
     */
    init: function (item, run, requester, done) {
        done(null);
    },

    /**
     * Checks whether fetching of any parameters is necessary for the given {@link Item}.
     *
     * @param {Item} item
     * @param {Run} run
     * @param {Requester} requester
     * @param done
     */
    pre: function (item, run, requester, done) {
        done(null, true);
    },

    /**
     * Verifies whether the request was successfully authorized after being sent.
     *
     * @param {Item} item
     * @param {Response} response
     * @param {Run} run
     * @param {Requester} requester
     * @param done
     */
    post: function (item, response, run, requester, done) {
        done(null, true);
    },

    /**
     * Signs a request based on the authentication parameters.
     *
     * @param {Item} item
     * @param {Run} run
     * @param callback
     */
    sign: function (item, run, callback) {
        item.request = item.request.authorize();
        callback(null);
    }
}
