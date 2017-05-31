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
     * Checks the item, and fetches any parameters that are not already provided.
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
     * Verifies whether the request was successfully authorized after being sent.
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
