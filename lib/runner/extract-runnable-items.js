var _ = require('lodash'),
    sdk = require('postman-collection'),
    ItemGroup = sdk.ItemGroup,
    Item = sdk.Item,

    /**
     * Looks for an Item or ItemGroup matching the id on a collection.
     *
     * @param {Collection} collection
     * @param {String} id
     *
     * @returns {Item|ItemGroup|undefined}
     *
     * @todo: Possibly add oneDeepById to sdj.ItemGroup?
     */
    findItemOrGroupById = function (collection, id) {
        var entry,

            /**
             * Iteratee for looking up an element with given id on an item group.
             *
             * @param {ItemGroup} itemGroup
             * @param {String} id
             *
             * @returns {Boolean|undefined}
             */
            idLookup = function (itemGroup, id) {
                if (!itemGroup || !itemGroup.items) { return; }

                // lookup id on own children first
                entry = itemGroup.items.one(id);

                // if a match is found stop search and exit
                if (entry) { return false; }

                // if id does not match any own children start looking up on the grand children
                itemGroup.items.each(function (itemOrGroup) {
                    // some of the children maybe items, skip those
                    if (ItemGroup.isItemGroup(itemOrGroup)) {
                        return idLookup(itemOrGroup, id);
                    }
                });
            };

        idLookup(collection, id);
        return entry;
    },

    /**
     * Looks for an Item or ItemGroup matching the name on a collection.
     *
     * @param {Collection} collection
     * @param {String} name
     *
     * @returns {Item|ItemGroup|undefined}
     */
    findItemOrGroupByName = function (collection, name) {
        var entry,

            /**
             * Iteratee for looking up an element with given name on an item group.
             *
             * @param {ItemGroup} itemGroup
             * @param {String} name
             *
             * @returns {Boolean|undefined}
             */
            nameLookup = function (itemGroup, name) {
                if (!itemGroup || !itemGroup.items) { return; }

                // look for the item or group in own children
                itemGroup.items.each(function (itemOrGroup) {
                    if (itemOrGroup.name === name) { entry = itemOrGroup; return false; }
                });

                // if a match is found on the current level, stop the search and exit
                if (entry) { return false; }

                // continue search from grand children
                itemGroup.items.each(function (itemOrGroup) {
                    // some of the children maybe items
                    if (ItemGroup.isItemGroup(itemOrGroup)) {
                        return nameLookup(itemOrGroup, name);
                    }
                });
            };

        nameLookup(collection, name);
        return entry;
    },

    /**
     * Finds an item or group from a path. The path should be an array of ids from the parent chain.
     *
     * @param {Collection} collection
     * @param {Array<String>} path
     *
     * @returns {Item|ItemGroup}
     */
    findItemOrGroupByPath = function (collection, path) {
        var entryPath = path || [],
            entryNode = collection,
            i,
            lookupLength = entryPath.length;

        // go down the lookup path
        for (i = 0; i < lookupLength && entryNode; i++) {
            entryNode = entryNode.items && entryNode.items.one(entryPath[i]);
        }

        return entryNode;
    },

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
     * Extracts all the items on a collection starting from the entrypoint.
     *
     * @param {Collection} collection
     * @param {Array|String} entrypoint
     * @param {Function} callback
     */
    extractRunnableItems = function (collection, entrypoint, callback) {
        var entryNode;

        // if no entrypoint is specified, flatten the entire collection
        if (!entrypoint) { return callback(null, flattenNode(collection), collection); }

        // if entrypoint is an array, it is a path pointing to the entry
        if (_.isArray(entrypoint)) {
            entryNode = findItemOrGroupByPath(collection, entrypoint);
        }

        // entrypoint needs to be looked up with an id or name
        else {
            // attempt finding entrypoint as id
            entryNode = findItemOrGroupById(collection, entrypoint);

            // if there is no match found, attempt finding entrypoint as a name
            !entryNode && (entryNode = findItemOrGroupByName(collection, entrypoint));
        }

        callback(null, flattenNode(entryNode), entryNode);
    };

module.exports = {
    extractRunnableItems: extractRunnableItems
};
