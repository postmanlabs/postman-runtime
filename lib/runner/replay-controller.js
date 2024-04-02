var _ = require('lodash'),
    createItemContext = require('./create-item-context'),
    sdk = require('postman-collection'),

    // total number of replays allowed
    MAX_REPLAY_COUNT = 3,

    ReplayController,

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
                _.get(payload, '_variables.values', []),
                _.get(payload, 'data', []),
                _.get(payload, 'environment.values', []),
                _.get(payload, 'collectionVariables.values', []),
                _.get(payload, 'globals.values', [])
            // @note vault variables are added later
            ],
            vaultValues = _.get(payload, 'vaultSecrets.values'),

            hasVaultSecrets = vaultValues ? vaultValues.count() > 0 : false,

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

/**
 * Handles replay logic with replayState from context.
 * Makes sure request replays do not go into an infinite loop.
 *
 * @param {ReplayState} replayState -
 * @param {Run} run -
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
     * @param {Object} context -
     * @param {Request} item -
     * @param {Object} desiredPayload a partial payload to use for the replay request
     * @param {Function} success this callback is invoked when replay controller sent the request
     * @param {Function} failure this callback is invoked when replay controller decided not to send the request
     */
    requestReplay (context, item, desiredPayload, success, failure) {
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

        resolveVariables(payload.context, payload);

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
    getReplayState () {
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
