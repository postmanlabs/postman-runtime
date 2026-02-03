var _ = require('lodash'),
    backpack = require('../backpack'),
    Run = require('./run'),
    extractRunnableItems = require('./extract-runnable-items').extractRunnableItems,

    Runner,

    defaultTimeouts = {
        global: 3 * 60 * 1000, // 3 minutes
        request: Infinity,
        script: Infinity
    };

/**
 * @typedef {runCallback}
 * @property {Function} [done]
 * @property {Function} [error]
 * @property {Function} [success]
 */

/**
 * @constructor
 *
 * @param {Object} [options] -
 */
Runner = function PostmanCollectionRunner (options) { // eslint-disable-line func-name-matching
    this.options = _.assign({}, options);
};

_.assign(Runner.prototype, {
    /**
     * Prepares `run` config by combining `runner` config with given run options.
     *
     * @param {Object} [options] -
     * @param {Object} [options.timeout] -
     * @param {Object} [options.timeout.global] -
     * @param {Object} [options.timeout.request] -
     * @param {Object} [options.timeout.script] -
     */
    prepareRunConfig (options) {
        // combine runner config and make a copy
        var runOptions = _.merge(_.omit(options,
            ['environment', 'globals', 'vaultSecrets', 'data']), this.options.run) || {};

        // Ensure we have a default value for max invokable nested requests
        !runOptions.maxInvokableNestedRequests && (runOptions.maxInvokableNestedRequests = 10);

        // start timeout sanitization
        !runOptions.timeout && (runOptions.timeout = {});

        _.mergeWith(runOptions.timeout, defaultTimeouts, function (userTimeout, defaultTimeout) {
            // non numbers, Infinity and missing values are set to default
            if (!_.isFinite(userTimeout)) { return defaultTimeout; }

            // 0 and negative numbers are set to Infinity, which only leaves positive numbers
            return userTimeout > 0 ? userTimeout : Infinity;
        });

        return runOptions;
    },

    /**
     * Runs a collection or a folder.
     *
     * @param {Collection} collection -
     * @param {Object} [options] -
     * @param {Array.<Item>} options.items -
     * @param {Array.<Object>}  [options.data] -
     * @param {Object} [options.globals] -
     * @param {Object} [options.environment] -
     * @param {Object} [options.vaultSecrets] - Vault Secrets
     * @param {Object} [options.nestedRequest] - State and options used for nested request set by parent request
     * @param {Number} [options.nestedRequest.rootCursor] - The cursor of the root request that spun up this
     * nested request runner. This is recursively passed down to keep track of which execution started the chain
     * and modify cursors for all nested req events for reporters built on top of postman-runtime.
     * @param {Number} [options.nestedRequest.rootItem] - The root item that spawned this nested request.
     * Used by vault to get consent for root request and determine whether vault access check was performed even once
     * throughout the chain. And by request resolver bridge to receive any stored metadata like name/location of
     * the request being resolved
     * @param {Number} [options.nestedRequest.hasVaultAccess] - Mutated and set by any nested or parent request
     * to indicate whether vault access check has been performed.
     * @param {Number} [options.nestedRequest.invocationCount] - The number of requests currently accummulated
     * by the nested request chain.
     * @param {Object} [options.requester] - Options specific to the requester
     * @param {Function} [options.script.requestResolver] - Resolver that receives an id from
     * pm.execution.runRequest and returns the JSON for the request collection.
     * Should return a postman-collection compatible collection JSON with `item` containing the request to run,
     * `variable` array containing list of request-specific-collection variables and `event` with scripts to execute.
     * @param {Number} [options.maxInvokableNestedRequests] - The maximum number of nested requests
     * that a script can invoke, combined in total and recursively nested
     * @param {Number} [options.iterationCount] -
     * @param {CertificateList} [options.certificates] -
     * @param {ProxyConfigList} [options.proxies] -
     * @param {Object} [options.entrypoint] -
     * @param {String} [options.entrypoint.execute] ID of the item-group to be run.
     * Can be Name if `entrypoint.lookupStrategy` is `idOrName`
     * @param {String} [options.entrypoint.lookupStrategy=idOrName] strategy to lookup the entrypoint [idOrName, path]
     * @param {Array<String>} [options.entrypoint.path] path to lookup
     * @param {Object} [options.run] Run-specific options, such as options related to the host
     * @param {Object} [options.secretResolvers] - Object mapping source types to resolver configs.
     * Each resolver config may have:
     *   - {String} id - (Required) Unique identifier for the resolver (same as secret.source.type)
     *   - {String} name - (Required) Human-readable name for the resolver
     *   - {Function} resolver - (Required) Function(secret, context) that returns resolved value or Promise
     *   - {Number} [timeout=5000] - (Optional) Timeout in milliseconds (default: 5000)
     *   - {Number} [retryCount=0] - (Optional) Number of retry attempts on failure (default: 0)
     *
     * @param {Function} callback -
     */
    run (collection, options, callback) {
        var self = this,
            runOptions = this.prepareRunConfig(options);

        callback = backpack.normalise(callback);
        !_.isObject(options) && (options = {});

        // @todo make the extract runnables interface better defined and documented
        // - give the ownership of error to each strategy lookup functions
        // - think about moving these codes into an extension command prior to waterfall
        // - the third argument in callback that returns control, is ambiguous and can be removed if error is controlled
        //   by each lookup function.
        // - the interface can be further broken down to have the "flattenNode" action be made common and not be
        //   required to be coded in each lookup strategy
        //
        // serialise the items into a linear array based on the lookup strategy provided as input
        extractRunnableItems(collection, options.entrypoint, function (err, runnableItems, entrypoint) {
            if (err || !runnableItems) {
                return callback(err || new Error('Error fetching run items'));
            }

            // Bail out only if: abortOnError is set and the returned entrypoint is invalid
            if (options.abortOnError && !entrypoint) {
                // eslint-disable-next-line @stylistic/js/max-len
                return callback(new Error(`Unable to find a folder or request: ${_.get(options, 'entrypoint.execute')}`));
            }

            // ensure data is an array
            !_.isArray(options.data) && (options.data = [{}]);

            // get iterationCount from data if not set
            if (!runOptions.iterationCount) {
                runOptions.iterationCount = options.data.length;
            }

            return callback(null, (new Run({
                items: runnableItems,
                data: options.data,
                environment: options.environment,
                globals: _.has(options, 'globals') ? options.globals : self.options.globals,
                vaultSecrets: options.vaultSecrets,
                // Used for nested request executions
                nestedRequest: options.nestedRequest,
                // @todo Move to item level to support Item and ItemGroup variables
                collectionVariables: collection.variables,
                localVariables: options.localVariables,
                certificates: options.certificates,
                proxies: options.proxies,
                secretResolvers: options.secretResolvers
            }, runOptions)));
        });
    }
});

_.assign(Runner, {
    /**
     * Expose Run instance for testability
     *
     * @type {Run}
     */
    Run
});

module.exports = Runner;
