var _ = require('lodash'),

    // total number of replays allowed
    MAX_REPLAY_COUNT = 3,

    ReplayController;

/**
 * Handles replay logic with. Makes sure request replays do not go into an infinite loop.
 * 
 * @param {ReplayState} replayState
 * @param {Run} run
 */
ReplayController = function ReplayController (replayState, run) {
    // store state
    this.count = replayState ? replayState.count : 1;
    this.run = run;
};

_.assignIn(ReplayController.prototype, {
    /**
     * Sends a request in the item. This takes care of limiting the total number of replays for a request.
     * 
     * @param {Object} context
     * @param {Request} item
     * @param {Boolean} waitForResponse if true, callback waits for request to complete
     * @param {Function} success this callback is invoked when replay controller sent the request
     * @param {Function} failure this callback is invoked when replay controller decided not to send the request
     */
    requestReplay: function (context, item, waitForResponse, success, failure) {
        // max retries exceeded
        if (this.count >= MAX_REPLAY_COUNT) {
            return failure();
        }

        // update replay count state
        this.count++;

        // update replay state to context
        context.replayState = this.getReplayState();

        // set item parent 
        !item.parent() && item.setParent(context.originalItem);

        // construct payload for request
        var payload = {
            item: item,
            environment: context.environment,
            globals: context.globals,
            data: context.data,
            coords: context.coords,
            // abortOnError makes sure request command bubbles errors
            // so we can pass it on to the callback
            abortOnError: true,
            // @todo: need a new identifier for replay vs intermediate request?
            auth: waitForResponse ? null : context.auth,
            replayState: context.replayState
        };

        // if waitForResponse is true, current execution waits for the response
        // callback is invoked only after the response is received
        if (waitForResponse) {
            this.run.immediate('request', payload)
                .done(function (response) {
                    success(null, response);
                })
                .catch(function (err) {
                    success(err);
                });
        }

        // or schedule a request and continue with current queue
        else {
            this.run.interrupt('request', payload);
            success();
        }
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
