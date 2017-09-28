var _ = require('lodash');

module.exports = {
    init: function (done) {
        done();
    },

    triggers: ['response'],

    process: {
        request: function (payload, next) {
            var abortOnError = _.has(payload, 'abortOnError') ? payload.abortOnError : this.options.abortOnError,

                // helper function to trigger `response` callback anc complete the command
                complete = function (err, nextPayload) {
                    // trigger `response` callback
                    // nextPayload.response will be empty for error flows
                    this.triggers.response(
                        err,
                        nextPayload.coords,
                        nextPayload.response,
                        nextPayload.request,
                        // this `item` is resolved and mutated here
                        nextPayload.item,
                        nextPayload.cookies
                    );

                    // the error is passed twice to allow control between aborting the error vs just
                    // bubbling it up
                    return next(err && abortOnError ? err : null, nextPayload, err);
                }.bind(this);

            // we do not queue `httprequest` instruction here,
            // queueing will unblock the item command to prepare for the next `event` instruction
            // at this moment request is not fulfilled, and we want to block it
            this.immediate('httprequest', payload)
                .done(function (nextPayload, err) {
                    // change signature to error first
                    complete(err, nextPayload);
                })
                .catch(complete);
        }
    }
};
