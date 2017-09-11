var _ = require('lodash');

module.exports = {
    init: function (done) {
        done();
    },

    triggers: ['response'],

    process: {
        request: function (payload, next) {
            var abortOnError = _.has(payload, 'abortOnError') ? payload.abortOnError : this.options.abortOnError,
                complete = function (nextPayload, err) {
                    this.triggers.response(
                        err,
                        nextPayload.coords,
                        nextPayload.response,
                        nextPayload.request,
                        payload.item,
                        nextPayload.cookies
                    );
                    next(err && abortOnError ? err : null, nextPayload, err);
                }.bind(this);

            // we do not queue `httpRequest` instruction here,
            // queueing will unblock the item command to prepare for the next `event` instruction
            // at this moment request is not fulfilled, and we want to block it
            this.immediate('httpRequest', payload)
                .done(complete)
                .catch(function (err, nextPayload) {
                    complete(nextPayload, err);
                });
        }
    }
};
