var sdk = require('postman-collection'),
    ItemGroup = sdk.ItemGroup,
    Item = sdk.Item,

    DEFAULT_LOOKUP_STRATEGY = 'idOrName',
    INVALID_LOOKUP_STRATEGY_ERROR = 'runtime~extractRunnableItems: Invalid entrypoint lookupStrategy',

    /**
     * Accumulate all items in order if entry point is a collection/folder.
     * If an item is passed returns an array with that item.
     *
     * @param {ItemGroup|Item} node
     *
     * @returns {Array<Item>}
     *
     * @todo: Possibly add mapItem to sdk.ItemGroup?
     */
    flattenNode = function (node) {
        var items = [];

        // bail out
        if (!node) { return items; }

        if (ItemGroup.isItemGroup(node)) {
            node.forEachItem(function (item) { items.push(item); });
        }
        else if (Item.isItem(node)) {
            items.push(node);
        }

        return items;
    },

    /**
     * Finds an item or item group based on id or name.
     *
     * @param {ItemGroup} itemGroup
     * @param {?String} match
     *
     * @returns {Item|ItemGroup|undefined}
     */
    findItemOrGroup = function (itemGroup, match) {
        if (!itemGroup || !itemGroup.items) { return; }

        var matched;

        // lookup match on own children
        itemGroup.items.each(function (itemOrGroup) {
            if (itemOrGroup.id === match || itemOrGroup.name === match) {
                matched = itemOrGroup;
                return false; // exit the loop
            }
        });

        // if there is no match on own children, start lookup on grand children
        !matched && itemGroup.items.each(function (itemOrGroup) {
            matched = findItemOrGroup(itemOrGroup, match);
            if (matched) { return false; } // exit the loop
        });

        return matched;
    },


    /**
     * Finds an item or group from a path. The path should be an array of ids from the parent chain.
     *
     * @param {Collection} collection
     * @param {Object} options
     * @param {String} options.execute
     * @param {?Array<String>} [options.path]
     * @param {Function} callback
     */
    lookupByPath = function (collection, options, callback) {
        var lookupPath,
            lastMatch = collection,
            lookupOptions = options || {},
            i,
            ii;

        // path can be empty, if item/group is at the top level
        lookupPath = lookupOptions.path || [];

        // push execute id to the path
        options.execute && (lookupPath.push(options.execute));

        // go down the lookup path
        for (i = 0, ii = lookupPath.length; (i < ii) && lastMatch; i++) {
            lastMatch = lastMatch.items && lastMatch.items.one(lookupPath[i]);
        }

        callback && callback(null, flattenNode(lastMatch), lastMatch);
    },

    /**
     * Finds an item or group on a collection with a matching id or name.
     *
     * @param {Collection} collection
     * @param {Object} options
     * @param {String} [options.execute]
     * @param {Function} callback
     */
    lookupByIdOrName = function (collection, options, callback) {
        var match = options.execute,
            matched;

        if (!match) { return callback(null, []); }

        // do a recursive lookup
        matched = findItemOrGroup(collection, match);

        callback(null, flattenNode(matched), matched);
    },

    /**
     * Utility function called recursively to find `multiEntry`.
     *
     * @param {ItemGroup} itemGroup
     * @param {Boolean} includeItem
     */
    multiEntryUtil = function (itemGroup, includeItem) {
        let self = this;

        itemGroup.items.each(function (item) {
            if (self.reference[item.id] || self.reference[item.name]) {
                self.found++;
                // push item to state if includeItem is true
                includeItem && self.items.push(item);
                // recursive call to find nested entry-points.
                // set includeItem to false for children, since current item is added already.
                item.items && multiEntryUtil.call(self, item, false);
            }
            else if (item.items) {
                multiEntryUtil.call(self, item, true);
            }
            // bail out if all entry-points are found.
            if (self.found === self.totalEntrypoints) { return false; }
        });
    },

    /**
     * Finds multiple items or groups on a collection with the matching ids or names.
     *
     * @param {Collection} collection
     * @param {Object} options
     * @param {Array<String>} options.execute
     * @param {Function} callback
     */
    multiEntry = function (collection, options, callback) {
        var entrypoints = options.execute,
            runnableItems = [],
            state,
            i,
            ii;

        if (!Array.isArray(entrypoints) || !entrypoints.length) {
            return callback(null, []);
        }

        // initialize state used to call `findMultiEntry`.
        state = {
            totalEntrypoints: entrypoints.length,
            entrypoints: entrypoints,
            found: 0,
            items: [],
            reference: {}
        };

        // add temp reference for faster access of entry-point name/id.
        entrypoints.forEach(function (entry) {
            state.reference[entry] = true;
        });

        multiEntryUtil.call(state, collection, true);

        // bail out if any of the given endpoint is not found.
        if (state.found !== state.totalEntrypoints) {
            return callback(null, []);
        }

        // extract runnable items from the searched items.
        for (i = 0, ii = state.items.length; i < ii; i++) {
            runnableItems = runnableItems.concat(flattenNode(state.items[i]));
        }

        callback(null, runnableItems, collection);
    },

    lookupStrategyMap = {
        path: lookupByPath,
        idOrName: lookupByIdOrName,
        multiEntry: multiEntry
    },

    /**
     * Extracts all the items on a collection starting from the entrypoint.
     *
     * @param {Collection} collection
     * @param {?Object} [entrypoint]
     * @param {String} [entrypoint.execute] id of item or group to execute (can be name when used with `idOrName`)
     * @param {Array<String>} [entrypoint.path] path leading to the item or group selected (only for `path` strategy)
     * @param {String} [entrypoint.lookupStrategy=idOrName] strategy to use for entrypoint lookup [idOrName, path]
     * @param {Function} callback
     */
    extractRunnableItems = function (collection, entrypoint, callback) {
        var lookupFunction,
            lookupStrategy;

        // if no entrypoint is specified, flatten the entire collection
        if (!entrypoint) { return callback(null, flattenNode(collection), collection); }

        lookupStrategy = entrypoint.lookupStrategy || DEFAULT_LOOKUP_STRATEGY;

        // lookup entry using given strategy
        (lookupFunction = lookupStrategyMap[lookupStrategy]) ?
            lookupFunction(collection, entrypoint, callback) :
            callback(new Error(INVALID_LOOKUP_STRATEGY_ERROR)); // eslint-disable-line callback-return
    };

module.exports = {
    extractRunnableItems: extractRunnableItems
};
