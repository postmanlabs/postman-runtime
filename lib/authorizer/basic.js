module.exports = {
    /**
     * Initializes a item (fetches all required parameters, etc) before the actual authorization step.
     *
     * @param {Item} item
     * @param {Cursor} cursor
     * @param {Requester} requester
     * @param done
     * @todo - add support for prompting a user for basic auth credentials if not already provided
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
     * Verifies whether the basic auth succeeded.
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
