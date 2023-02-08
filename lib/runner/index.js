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
        var runOptions = _.merge(_.omit(options, ['environment', 'globals', 'data']), this.options.run) || {};

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
     * @param {Number} [options.iterationCount] -
     * @param {CertificateList} [options.certificates] -
     * @param {ProxyConfigList} [options.proxies] -
     * @param {Object} [options.entrypoint] -
     * @param {String} [options.entrypoint.execute] ID of the item-group to be run.
     * Can be Name if `entrypoint.lookupStrategy` is `idOrName`
     * @param {String} [options.entrypoint.lookupStrategy=idOrName] strategy to lookup the entrypoint [idOrName, path]
     * @param {Array<String>} [options.entrypoint.path] path to lookup
     * @param {Object} [options.run] Run-specific options, such as options related to the host
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
                // eslint-disable-next-line max-len
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
                // @todo Move to item level to support Item and ItemGroup variables
                collectionVariables: collection.variables,
                certificates: options.certificates,
                proxies: options.proxies
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
