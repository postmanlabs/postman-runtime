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
     * common `state` is passed to track pendingEntries and found items.
     *
     * @param {ItemGroup} itemGroup
     * @param {Object} state
     * @param {Array<string>} state.pendingEntries
     * @param {Array<Item|ItemGroup>} state.items
     * @param {Object} state.reference
     * @returns {Object}
     */
    findItemsFromEntries = function (itemGroup, state) {
        var key,
            index,
            entry;

        itemGroup.items.each(function (item) {
            // bail out if all entries are found.
            if (!state.pendingEntries.length) { return false; }

            // search for item's name or id in pendingEntries.
            entry = item.name;
            index = state.pendingEntries.indexOf(entry);

            // search by id if item name not found.
            if (index === -1) {
                entry = item.id;
                index = state.pendingEntries.indexOf(entry);
            }

            if (index !== -1) {
                // remove founded entry from the pendingEntries,
                // this will also allow supporting multiple entries with same name/id.
                state.pendingEntries.splice(index, 1);

                // get entry index in the provided `entries`.
                key = state.reference[entry].shift();

                // store `item` with the same key as of its index in the list of entries,
                // this helps to easily access the item in the order of entries.
                state.items[key.toString()] = item;
            }

            // recursive call to lookup nested entries.
            item.items && findItemsFromEntries(item, state);
        });

        return state;
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
     * Finds multiple items or groups on a collection with the matching ids or names.
     * runnable items will be ordered in the same order as of entries.
     *
     * @param {Collection} collection
     * @param {Object} options
     * @param {Array<String>} options.execute
     * @param {Function} callback
     */
    multiEntry = function (collection, options, callback) {
        var entries = options.execute,
            runnableItems = [],
            state,
            key,
            i,
            ii;

        if (!Array.isArray(entries) || !entries.length) {
            return callback(null, []);
        }

        // initialize the state to be passed as reference in `findItemsFromEntries`.
        state = {
            // copy entries, otherwise it will affect the reference also.
            pendingEntries: entries.slice(),
            items: {},
            reference: {}
        };

        // create an object with entries as key and array of its index(s) as value.
        // used to get entry key for `state.items`, helps to support multiple items with same name.
        for (i = 0, ii = entries.length; i < ii; i++) {
            key = entries[i];
            !state.reference[key] && (state.reference[key] = []);
            state.reference[key].push(i);
        }

        // recursive lookup to find all entries and build the state.
        state = findItemsFromEntries(collection, state);

        // bail out if any of the given entry is not found.
        if (state.pendingEntries && state.pendingEntries.length) {
            return callback(null, []);
        }

        // extract runnable items, nested entries will also be extracted.
        for (i = 0, ii = entries.length; i < ii; i++) {
            runnableItems = runnableItems.concat(flattenNode(state.items[i.toString()]));
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
