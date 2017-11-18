var _ = require('lodash'),
    sdk = require('postman-collection'),

    createItemContext = require('../create-item-context'),

    /**
     * Resolve variables in item and auth in context.
     *
     * @param {ItemContext} context
     * @param {Item} [context.item]
     * @param {RequestAuth} [context.auth]
     * @param {Object} payload
     * @param {VariableScope} payload._variables
     * @param {VariableScope} payload.data
     * @param {VariableScope} payload.environment
     * @param {VariableScope} payload.collectionVariables
     * @param {VariableScope} payload.globals
     */
    resolveVariables = function (context, payload) {
        if (!context.item) { return; }

        // @todo - resolve variables in a more graceful way

        // @todo - no need to sync variables when SDK starts supporting resolution from scope directly
        context.item = new sdk.Item(context.item.toObjectResolved(null, [payload._variables.syncVariablesTo({}),
            payload.data, payload.environment.syncVariablesTo({}), payload.collectionVariables.syncVariablesTo({}),
            payload.globals.syncVariablesTo({})], {ignoreOwnVariables: true}));

        var item = context.item,
            auth = context.auth;

        // Re-parse the URL, because variables have been resolved now, and things might be moved around
        item.request.url = new (sdk.Url)(item.request.url.toString());

        // resolve variables in auth
        auth && (context.auth = new sdk.RequestAuth(auth.toObjectResolved(null, [payload._variables.syncVariablesTo({}),
            payload.data, payload.environment.syncVariablesTo({}), payload.collectionVariables.syncVariablesTo({}),
            payload.globals.syncVariablesTo({})], {ignoreOwnVariables: true})));
    };

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
                    // nextPayload will be empty for unhandled errors
                    // trigger `response` callback
                    // nextPayload.response will be empty for error flows
                    // the `item` argument is resolved and mutated here
                    nextPayload && this.triggers.response(err, nextPayload.coords, nextPayload.response,
                        nextPayload.request, nextPayload.item, nextPayload.cookies);

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
