var _ = require('lodash'),
    createItemContext = require('./create-item-context'),

    // total number of replays allowed
    MAX_REPLAY_COUNT = 3,

    ReplayController;

/**
 * Handles replay logic with replayState from context.
 * Makes sure request replays do not go into an infinite loop.
 *
 * @param {ReplayState} replayState
 * @param {Run} run
 *
 * @constructor
 */
ReplayController = function ReplayController (replayState, run) {
    // store state
    this.count = replayState ? replayState.count : 0;
    this.run = run;
};

_.assign(ReplayController.prototype, /** @lends ReplayController.prototype */{
    /**
     * Sends a request in the item. This takes care of limiting the total number of replays for a request.
     *
     * @param {Object} context
     * @param {Request} item
     * @param {Object} desiredPayload a partial payload to use for the replay request
     * @param {Function} success this callback is invoked when replay controller sent the request
     * @param {Function} failure this callback is invoked when replay controller decided not to send the request
     */
    requestReplay: function (context, item, desiredPayload, success, failure) {
        // max retries exceeded
        if (this.count >= MAX_REPLAY_COUNT) {
            return failure(new Error('runtime: maximum intermediate request limit exceeded'));
        }

        // update replay count state
        this.count++;

        // update replay state to context
        context.replayState = this.getReplayState();

        // construct payload for request
        var payload = _.defaults({
            item: item,
            // abortOnError makes sure request command bubbles errors
            // so we can pass it on to the callback
            abortOnError: true
        }, desiredPayload);

        // create item context from the new item
        payload.context = createItemContext(payload, context);

        this.run.immediate('httprequest', payload)
            .done(function (response) {
                success(null, response);
            })
            .catch(success);
    },

    /**
     * Returns a serialized version of current ReplayController
     *
     * @returns {ReplayState}
     */
    getReplayState: function () {
        /**
         * Defines the current replay state of a request.
         *
         * By replay state, we mean the number of requests sent
         * as part of one Collection requests. It can be intermediate requests,
         * or replays of the same collection requests.
         *
         * @typedef {Object} ReplayState
         *
         * @property {Number} count total number of requests, including Collection requests and replays
         */
        return {
            count: this.count
        };
    }
});


module.exports = ReplayController;
