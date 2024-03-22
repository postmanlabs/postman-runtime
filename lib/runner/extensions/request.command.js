var _ = require('lodash'),
    sdk = require('postman-collection'),
    createItemContext = require('../create-item-context'),

    /**
     * Resolve variables in item and auth in context.
     *
     * @param {ItemContext} context -
     * @param {Item} [context.item] -
     * @param {RequestAuth} [context.auth] -
     * @param {Object} payload -
     * @param {VariableScope} payload._variables -
     * @param {Object} payload.data -
     * @param {VariableScope} payload.environment -
     * @param {VariableScope} payload.collectionVariables -
     * @param {VariableScope} payload.globals -
     * @param {VariableScope} payload.vaultSecrets -
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
                // @note vault variables are added later
            ],

            hasVaultSecrets = payload.vaultSecrets.values.count() > 0,

            urlObj = context.item.request.url,
            // @note URL string is used to resolve nested variables as URL parser doesn't support them well.
            urlString = urlObj.toString(),
            unresolvedUrlString = urlString,

            vaultVariables,
            vaultUrl,
            item,
            auth;

        if (hasVaultSecrets) {
            // get the vault variables that match the unresolved URL string
            vaultUrl = urlObj.protocol ? urlString : `http://${urlString}`; // force protocol
            vaultVariables = payload.vaultSecrets.__getMatchingVariables(vaultUrl);

            // resolve variables in URL string with initial vault variables
            urlString = sdk.Property.replaceSubstitutions(urlString, [...variableDefinitions, vaultVariables]);

            if (urlString !== unresolvedUrlString) {
                // get the final list of vault variables that match the resolved URL string
                vaultUrl = new sdk.Url(urlString).toString(true);
                vaultVariables = payload.vaultSecrets.__getMatchingVariables(vaultUrl);

                // resolve vault variables in URL string
                // @note other variable scopes are skipped as they are already resolved
                urlString = sdk.Property.replaceSubstitutions(urlString, [vaultVariables]);
            }

            // add vault variables to the list of variable definitions
            variableDefinitions.push(vaultVariables);
        }
        else if (urlString) {
            urlString = sdk.Property.replaceSubstitutions(urlString, variableDefinitions);
        }

        // @todo - no need to sync variables when SDK starts supporting resolution from scope directly
        // @todo - avoid resolving the entire item as this unnecessarily resolves URL
        item = context.item = new sdk.Item(context.item.toObjectResolved(null,
            variableDefinitions, { ignoreOwnVariables: true }));

        // re-parse and update the URL from the resolved string
        urlString && (item.request.url = new sdk.Url(urlString));

        auth = context.auth;

        // resolve variables in auth
        auth && (context.auth = new sdk.RequestAuth(auth.toObjectResolved(null,
            variableDefinitions, { ignoreOwnVariables: true })));
    };

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
