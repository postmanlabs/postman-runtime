module.exports = {
    /**
     * Initializes a item (fetches all required parameters, etc) before the actual authorization step.
     *
     * @param {Item} item
     * @param {Cursor} cursor
     * @param {Requester} requester
     * @param done
     */
    init: function (item, cursor, requester, done) {
        done(null);
    },

    /**
     * Verifies whether the request has valid basic auth credentials (which is always).
     *
     * @param {Item} item
     * @param {Cursor} cursor
     * @param {Requester} requester
     * @param done
     */
    pre: function (item, cursor, requester, done) {
        done(null, true);
    },

    /**
     * Verifies whether the no auth succeeded. (Which means, does nothing.)
     *
     * @param {Item} item
     * @param {Response} response
     * @param {Cursor} cursor
     * @param {Requester} requester
     * @param done
     */
    post: function (item, cursor, response, requester, done) {
        done(null, true);
    }
};
