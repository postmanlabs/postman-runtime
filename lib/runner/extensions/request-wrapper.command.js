var _ = require('lodash');

module.exports = {
    init: function (done) {
        done();
    },

    triggers: ['response'],

    process: {
        requestWrapper: function (payload, next) {
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

            this.immediate('request', payload)
                .done(complete)
                .catch(function (err, nextPayload) {
                    complete(nextPayload, err);
                });
        }
    }
};
