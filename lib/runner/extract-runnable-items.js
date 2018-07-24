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
     * Finds items based on multiple ids or names provided.
     *
     * @param {ItemGroup} itemGroup - Composite list of Item or ItemGroup.
     * @param {Object} entrypointSubset - Entry-points reference passed across multiple recursive calls.
     * @param {Boolean} _continueAccumulation - Flag used to decide whether to accumulate items or not.
     * @param {Array<String>} _accumulatedItems - Found Items or ItemGroups.
     * @returns {Object}
     */
    findItemsOrGroups = function (itemGroup, entrypointSubset, _continueAccumulation, _accumulatedItems) {
        if (!itemGroup || !itemGroup.items) { return; }

        !_accumulatedItems && (_accumulatedItems = []);

        var match;

        itemGroup.items.each(function (item) {
            // bail out if all entry-points are found.
            if (!Object.keys(entrypointSubset).length) { return false; }

            // lookup for item.id in entrypointSubset and if not found, lookup by item.name.
            if (!(match = entrypointSubset[item.id] && item.id)) {
                match = entrypointSubset[item.name] && item.name;
            }

            if (match) {
                // only accumulate items which are not previously got tracked from its parent entrypoint.
                _continueAccumulation && _accumulatedItems.push(item);

                // delete looked-up entrypoint.
                delete entrypointSubset[match];
            }

            // recursive call to find nested entry-points. To make sure all provided entry-points got tracked.
            // _continueAccumulation flag will be `false` for children if their parent entrypoint is found.
            return findItemsOrGroups(item, entrypointSubset, !match, _accumulatedItems);
        });

        return _accumulatedItems;
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

    lookupByMultipleIdOrName = function (collection, options, callback) {
        var entrypoints = options.execute,
            entrypointLookup = {},
            runnableItems = [],
            items,
            i,
            ii;

        if (!(Array.isArray(entrypoints) && entrypoints.length)) {
            return callback(null, []);
        }

        // add temp reference for faster lookup of entry-point name/id.
        // entry-points with same name/id will be ignored.
        for (i = 0, ii = entrypoints.length; i < ii; i++) {
            entrypointLookup[entrypoints[i]] = true;
        }

        items = findItemsOrGroups(collection, entrypointLookup, true);

        // at this point of time, we should have traversed all items mentioned in entrypoint and created a linear
        // subset of items. However, if post that, we still have items remaining in lookup object, that implies that
        // extra items were present in user input and corresponding items for those do not exist in collection. As such
        // we need to bail out if any of the given entry-point is not found.
        if (Object.keys(entrypointLookup).length) {
            return callback(null, []);
        }

        // extract runnable items from the searched items.
        for (i = 0, ii = items.length; i < ii; i++) {
            runnableItems = runnableItems.concat(flattenNode(items[i]));
        }

        callback(null, runnableItems, collection);
    },

    lookupStrategyMap = {
        path: lookupByPath,
        idOrName: lookupByIdOrName,
        multipleIdOrName: lookupByMultipleIdOrName
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
