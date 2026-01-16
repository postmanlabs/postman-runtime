var _ = require('lodash'),
    createItemContext = require('../create-item-context'),
    { resolveVariables } = require('../util'),
    { resolveSecrets } = require('../resolve-secrets');


module.exports = {
    init: function (done) {
        done();
    },

    triggers: ['response'],

    process: {
        request (payload, next) {
            var self = this,
                abortOnError = _.has(payload, 'abortOnError') ? payload.abortOnError : this.options.abortOnError,
                secretResolver = payload.secretResolver,

                // helper function to trigger `response` callback and complete the command
                complete = function (err, nextPayload) {
                    // nextPayload will be empty for unhandled errors
                    // trigger `response` callback
                    // nextPayload.response will be empty for error flows
                    // the `item` argument is resolved and mutated here
                    nextPayload && self.triggers.response(err, nextPayload.coords, nextPayload.response,
                        nextPayload.request, nextPayload.item, nextPayload.cookies, nextPayload.history);

                    // the error is passed twice to allow control between aborting the error vs just
                    // bubbling it up
                    return next(err && abortOnError ? err : null, nextPayload, err);
                },

                continueWithRequest = function () {
                    var context = createItemContext(payload);

                    // resolve variables in item and auth
                    resolveVariables(context, payload);

                    // add context for use, after resolution
                    payload.context = context;

                    // we do not queue `httprequest` instruction here,
                    // queueing will unblock the item command to prepare for the next `event` instruction
                    // at this moment request is not fulfilled, and we want to block it
                    self.immediate('httprequest', payload)
                        .done(function (nextPayload, err) {
                            // change signature to error first
                            complete(err, nextPayload);
                        })
                        .catch(complete);
                };

            // resolve secrets first before variable substitution
            if (secretResolver) {
                resolveSecrets(payload, secretResolver, function (err) {
                    if (err) {
                        console.warn('Secret resolution failed with an error:', err.message);
                    }

                    continueWithRequest();
                });
            }
            else {
                continueWithRequest();
            }
        }
    }
};
