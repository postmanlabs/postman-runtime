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
 * A lazy, forward-only iteration-data source for bounded memory over large data
 * sets: an async-iterable of row objects (one per iteration) that also exposes
 * `length` (the total iteration count, known up front). The runner pulls one row
 * per iteration, never buffering the whole set, and calls the iterator's
 * `return()` on teardown to release the source. Nothing dataset-specific — any
 * consumer can build one, e.g. the dataset SDK's `iterationSource(result, count)`.
 * Serial-only; parallel runs must pass an array instead.
 *
 * `length` is required unless an explicit `iterationCount` is given, since the
 * runner needs the count before the first pull; a source supplying neither is
 * rejected rather than silently collapsing to a single iteration. An explicit
 * `iterationCount` wins over `length`.
 *
 * The runner awaits one row per iteration and does no batching of its own, so a
 * source backed by a network or a database is expected to buffer internally.
 *
 * A pull has no timeout and happens inside the `waterfall` instruction, so a
 * stalled source stalls the run — and since `Run#abort` is queued as an interrupt,
 * it cannot take effect until that instruction settles, leaving `timeout.global`
 * as the only way out. A source is expected to bound its own waits.
 *
 * @typedef {AsyncIterable} IterationDataSource
 * @property {Number} length - total iteration count, known up front
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
     * @param {Array.<Object>|IterationDataSource} [options.data] - Iteration
     *   data: either a materialised array (one object per iteration) or a
     *   streaming {@link IterationDataSource}.
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
     * @param {Array} [options.nestedRequest.callStack] - The current stack of nested request item ids
     * used to enforce max nested depth. Internally set and used.
     * @param {Object} [options.requester] - Options specific to the requester
     * @param {Function} [options.script.requestResolver] - Resolver that receives an id from
     * pm.execution.runRequest and returns the JSON for the request collection.
     * Should return a postman-collection compatible collection JSON with `item` containing the request to run,
     * `variable` array containing list of request-specific-collection variables and `event` with scripts to execute.
     * @param {Number} [options.maxInvokableNestedRequests] - The maximum nested depth
     * that a script can invoke via pm.execution.runRequest
     * @param {Number} [options.iterationCount] -
     * @param {CertificateList} [options.certificates] -
     * @param {ProxyConfigList} [options.proxies] -
     * @param {Object} [options.entrypoint] -
     * @param {String} [options.entrypoint.execute] ID of the item-group to be run.
     * Can be Name if `entrypoint.lookupStrategy` is `idOrName`
     * @param {String} [options.entrypoint.lookupStrategy=idOrName] strategy to lookup the entrypoint [idOrName, path]
     * @param {Array<String>} [options.entrypoint.path] path to lookup
     * @param {Object} [options.run] Run-specific options, such as options related to the host
     * @param {Function} [options.secretResolver] - Function({ secrets, url }, callback) that resolves secrets.
     * Receives: secrets (array of { scopeName, scope, variable, context }), url (request URL without query).
     * Callback is (err, result).
     * On fatal error: callback(err) — request execution stops.
     * On success: callback(null, result) where result is Array<{ resolvedValue?: string,
     *  error?: Error, allowedInScript?: boolean }>;
     * result[i] corresponds to secrets[i].
     * resolvedValue: resolved string (undefined if failed/skipped).
     * error: Error when resolution failed for particular secret.
     * allowedInScript: if true, value is exposed to scripts via pm.environment/pm.variables;
     *       if false/undefined, masked from scripts. Runtime applies values.
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

            // Streaming iteration data: a lazy source (an async-iterable with a
            // known `length`) instead of a materialised array. We keep the
            // runner's length-based machinery — the row count is known up front —
            // and pull rows one per iteration. Parallel runs need random
            // cross-partition access, so they are not supported here (callers
            // buffer to an array for parallel).
            if (options.data && typeof options.data[Symbol.asyncIterator] === 'function') {
                if (runOptions.customParallelIterations || runOptions.maxConcurrency > 1) {
                    return callback(new Error('streaming iteration data is not supported with parallel iterations'));
                }

                // `length` is the one part of the contract that cannot be recovered
                // lazily — the cursor is bounded before the first row is pulled. An
                // untagged source would otherwise run a single iteration and report
                // success, so reject it instead of silently dropping the rest.
                if (!runOptions.iterationCount &&
                    !(_.isInteger(options.data.length) && options.data.length >= 0)) {
                    return callback(new Error('streaming iteration data requires a numeric `length`, ' +
                        'or an explicit `iterationCount`'));
                }

                // leave options.data as the async-iterable source; the runner pulls from it
            }
            else {
                // ensure data is an array
                !_.isArray(options.data) && (options.data = [{}]);
            }

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
                secretResolver: options.secretResolver
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
