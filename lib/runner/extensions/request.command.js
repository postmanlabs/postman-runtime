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
     * @param {Object} payload.data
     * @param {VariableScope} payload.environment
     * @param {VariableScope} payload.collectionVariables
     * @param {VariableScope} payload.globals
     */
    resolveVariables = function (context, payload) {
        if (!(context.item && context.item.request)) { return; }

        // @todo - resolve variables in a more graceful way
        var variableDefinitions = [
                // extract the variable list from variable scopes
                // @note: this is the order of precedence for variable resolution - don't change it
                payload._variables.values,
                payload.data,
                payload.environment.values,
                payload.collectionVariables.values,
                payload.globals.values
            ],
            urlString = context.item.request.url.toString(),
            item,
            auth;

        // @todo - no need to sync variables when SDK starts supporting resolution from scope directly
        // @todo - avoid resolving the entire item as this unnecessarily resolves URL
        item = context.item = new sdk.Item(context.item.toObjectResolved(null,
            variableDefinitions, {ignoreOwnVariables: true}));

        auth = context.auth;

        // resolve variables in URL string
        if (urlString) {
            // @note this adds support resolving nested variables as URL parser doesn't support them well.
            urlString = sdk.Property.replaceSubstitutions(urlString, variableDefinitions);

            // Re-parse the URL from the resolved string
            item.request.url = new sdk.Url(urlString);
        }

        // resolve variables in auth
        auth && (context.auth = new sdk.RequestAuth(auth.toObjectResolved(null,
            variableDefinitions, {ignoreOwnVariables: true})));
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
