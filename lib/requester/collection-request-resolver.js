const uuid = require('uuid'),
    PostmanCollection = require('postman-collection').Collection;

module.exports = function collectionRequestResolver (requestId, requestResolverBridge, callback) {
    if (!requestResolverBridge) {
        // TODO: This could be running in the postman cli, do we throw an error while this functionality isn't
        // implemented or do we error out and stop execution. Because this will currently stop execution.
        return callback(new Error('pm.execution.runRequest(...) is not supported in this environment'));
    }

    requestResolverBridge(requestId, (err, requestItem) => {
        if (err) {
            return callback(err);
        }

        return callback(null,
            new PostmanCollection({
                info: {
                    _postman_id: uuid.v4(),
                    name: 'Placeholder Collection with Single Request for execution inside runner',
                    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
                },
                item: [requestItem]
            }));
    });
};
