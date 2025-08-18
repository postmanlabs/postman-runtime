const uuid = require('uuid'),
    PostmanCollection = require('postman-collection').Collection;

module.exports = function resolveCollectionRequest (requestId, requestResolverBridge, callback) {
    if (!requestResolverBridge) {
        return callback(('Could not resolve request from pm.execution.runRequest(...)'));
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
