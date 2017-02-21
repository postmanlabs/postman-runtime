var _ = require('lodash'),
    backpack = require('../backpack'),
    Run = require('./run'),
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

_.assignIn(Runner.prototype, {
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
     * @param {Array} [options.data]
     * @param {String} [options.entrypoint] Name or ID of the item-group to be run
     * @param {Object} [options.run] Run-specific options, such as options related to the host
     *
     * @param {Function} callback
     */
    run: function (collection, options, callback) {
        var runOptions = _.merge(_.omit(options, ['environment', 'globals', 'data']), this.options.run);

        callback = backpack.normalise(callback);
        !_.isObject(options) && (options = {});

        return callback(null, (new Run({
            items: Runner.extractRunnableItems(collection, options.entrypoint),
            data: Runner.normaliseIterationData(options.data, options.iterationCount),
            environment: options.environment,
            globals: _.has(options, 'globals') ? options.globals : this.options.globals
        }, runOptions)));
    }
});

_.assignIn(Runner, {
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
     * @param {Collection} collection
     * @param {String} groupId
     * @returns {Array}
     */
    extractRunnableItems: function (collection, groupId) {
        var items = [],
            group = !groupId && collection; // if a group id is unspecified, the collection is our group

        // if group id is provided, we try and check if we can find it in the collection
        !group && collection.forEachItemGroup(function (itemGroup) {
            // @todo: fix this. the check by id should all finish before doing check by name
            (itemGroup.id === groupId || itemGroup.name === groupId) && (group = itemGroup);
        });

        // accumulate all items in the collection/group in order
        group && group.forEachItem(function (item) {
            items.push(item);
        });

        return items;
    }
});

module.exports = Runner;
