var _ = require('lodash'),
    backpack = require('../backpack'),
    Run = require('./run'),
    extractRunnableItems = require('./extract-runnable-items').extractRunnableItems,

    DEFAULT_GLOBAL_TIMEOUT = 3 * 60 * 1000, // 3 minutes
    Runner,

    /**
     * Converts any non finite values and 0 or negative values to Infinity.
     *
     * @param {Number} ms
     *
     * @returns {Number}
     */
    sanitizeTimeout = function (ms) {
        return (_.isFinite(ms) && ms > 0) ? ms : Infinity;
    },

    /**
     * Sanitizes `timeout` `options` if any on the options object.
     *
     * @param {Object} [timeoutOptions]
     *
     * @returns {Object|undefined}
     */
    sanitizeTimeouts = function (timeoutOptions) {
        if (!timeoutOptions) { return; }

        _.forEach(timeoutOptions, function (value, key) {
            timeoutOptions[key] = sanitizeTimeout(value);
        });

        return timeoutOptions;
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
 * @param {Object} [options]
 */
Runner = function PostmanCollectionRunner (options) {
    this.options = _.assign({}, options);
};

_.assign(Runner.prototype, {
    /**
     * Runs a collection or a folder.
     *
     * @param {Collection} collection
     * @param {Object} [options]
     * @param {Array.<Item>} options.items
     * @param {Array.<Object>}  [options.data]
     * @param {Object} [options.globals]
     * @param {Object} [options.environment]
     * @param {Number} [options.iterationCount]
     * @param {CertificateList} [options.certificates]
     * @param {ProxyConfigList} [options.proxies]
     * @param {Array} [options.data]
     * @param {Object} [options.entrypoint]
     * @param {String} [options.entrypoint.execute] ID of the item-group to be run.
     * Can be Name if `entrypoint.lookupStrategy` is `idOrName`
     * @param {String} [options.entrypoint.lookupStrategy=idOrName] strategy to lookup the entrypoint [idOrName, path]
     * @param {Array<String>} [options.entrypoint.path] path to lookup
     * @param {Object} [options.run] Run-specific options, such as options related to the host
     *
     * @param {Function} callback
     */
    run: function (collection, options, callback) {
        var self = this,
            runOptions = _.merge({timeout: {
                global: DEFAULT_GLOBAL_TIMEOUT,
                script: 0,
                request: 0
            }}, _.omit(options, ['environment', 'globals', 'data']), this.options.run);

        callback = backpack.normalise(callback);
        !_.isObject(options) && (options = {});

        sanitizeTimeouts(runOptions.timeout);

        extractRunnableItems(collection, options.entrypoint, function (err, runnableItems, entrypoint) {
            if (err || !runnableItems) { return callback(new Error('Error fetching run items')); }

            // Bail out only if: abortOnError is set and the returned entrypoint is invalid
            if (options.abortOnError && !entrypoint) {
                return callback(new Error(`Unable to find a folder or request: ${options.entrypoint}`));
            }


            return callback(null, (new Run({
                items: runnableItems,
                data: Runner.normaliseIterationData(options.data, options.iterationCount),
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
    Run: Run,

    /**
     * @private
     *
     * @param {Array} data
     * @param {Number} length
     * @returns {Array}
     */
    normaliseIterationData: function (data, length) {
        !_.isArray(data) && (data = [{}]);
        ((length < 1) || !_.isFinite(length)) && (length = data.length);

        // if the iteration count is greater than the length of data, we repeat the last item in data. here, we are
        // using a for-loop so that we do not have excessive spatial complexity
        if (length > data.length) {
            for (var i = data.length, filler = data[i - 1]; i < length; i++) {
                data[i] = filler;
            }
        }

        // just to be sure that there are no extra items in array, we match the lengths and return the data
        data.length = length;
        return data;
    }
});

module.exports = Runner;
