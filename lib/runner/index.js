var _ = require('lodash'),
    backpack = require('../backpack'),
    Run = require('./run'),
    sdk = require('postman-collection'),
    ItemGroup = sdk.ItemGroup,
    Item = sdk.Item,
    Runner;

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
     * @param {String} [options.entrypoint] Name or ID of the item-group to be run
     * @param {Object} [options.run] Run-specific options, such as options related to the host
     *
     * @param {Function} callback
     */
    run: function (collection, options, callback) {
        var self = this,
            runOptions = _.merge(_.omit(options, ['environment', 'globals', 'data']), this.options.run);

        callback = backpack.normalise(callback);
        !_.isObject(options) && (options = {});

        Runner.extractRunnableItems(collection, options.entrypoint, function (err, runnableItems, entrypoint) {
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
    },

    /**
     * @private
     *
     * @param {?Collection} collection
     * @param {?String} entrypoint folder/request id or name to begin extraction
     * @param {Function} callback
     * @returns {Object}
     * @todo Add support for accepting groupId as an array of ids/names
     */
    extractRunnableItems: function (collection, entrypoint, callback) {
        var items = [],
            entryNode;

        // if an entrypoint is specified, find the item/item group
        // looks for first node with matching id or name
        if (entrypoint) {
            // @todo: fix this. the check by id should all finish before doing check by name
            collection && collection.oneDeep && (entryNode = collection.oneDeep(entrypoint));
        }

        // no entry point specified, start with the collection
        else { entryNode = collection; }

        // entry point lookup did not find anything
        if (!entryNode) {
            callback(null, items);
            return;
        }

        // accumulate all items in order if entry point is a collection/folder
        ItemGroup.isItemGroup(entryNode) ?
            // @todo: Possibly add mapItem to sdk.ItemGroup?
            entryNode.forEachItem(function (item) { items.push(item); }) :
            // push item, if entry point is a request
            Item.isItem(entryNode) && items.push(entryNode);

        callback(null, items, entryNode);
    }
});

module.exports = Runner;
