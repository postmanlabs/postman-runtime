var _ = require('lodash'),
    createItemContext = require('../create-item-context'),
    { resolveVariables } = require('../util');


module.exports = {
    init: function (done) {
        done();
    },

    triggers: ['response'],

    process: {
        request (payload, next) {
            var abortOnError = _.has(payload, 'abortOnError') ? payload.abortOnError : this.options.abortOnError,

                // helper function to trigger `response` callback anc complete the command
                complete = function (err, nextPayload) {
                    // nextPayload will be empty for unhandled errors
                    // trigger `response` callback
                    // nextPayload.response will be empty for error flows
                    // the `item` argument is resolved and mutated here
                    nextPayload && this.triggers.response(err, nextPayload.coords, nextPayload.response,
                        nextPayload.request, nextPayload.item, nextPayload.cookies, nextPayload.history);

                    // the error is passed twice to allow control between aborting the error vs just
                    // bubbling it up
                    return next(err && abortOnError ? err : null, nextPayload, err);
                }.bind(this),
                context = createItemContext(payload);

            // resolve variables in item and auth
            resolveVariables(context, payload);

            // add context for use, after resolution
            payload.context = context;

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
