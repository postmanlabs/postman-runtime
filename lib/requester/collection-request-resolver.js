const PostmanCollection = require('postman-collection').Collection;

module.exports = function resolveCollectionRequest (requestId, callback) {
    const mockedCollectionRequest = new PostmanCollection({
        info: {
            _postman_id: '5086184c-6c2e-4023-ab7a-9eb25debc5c4',
            name: 'Sample Collection with Single Request',
            schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
            _exporter_id: '26070771'
        },
        item: [
            {
                name: 'Sample Request',
                event: [
                    {
                        listen: 'prerequest',
                        script: {
                            exec: ['console.log("Log from nested request")'],
                            type: 'text/javascript',
                            packages: {}
                        }
                    }
                ],
                request: {
                    method: 'GET',
                    header: [],
                    url: {
                        raw: 'https://postman-echo.com/get',
                        protocol: 'https',
                        host: ['postman-echo', 'com'],
                        path: ['get']
                    }
                },
                response: []
            }
        ]
    });

    return callback(null, mockedCollectionRequest);
};
