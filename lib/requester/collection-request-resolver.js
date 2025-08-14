const PostmanRequest = require('postman-collection').Request;

module.exports = function resolveCollectionRequest (requestId, callback) {
    const mockedCollectionRequest = new PostmanRequest({
        method: 'GET',
        header: [],
        url: {
            raw: 'https://postman-echo.com/get',
            protocol: 'https',
            host: ['postman-echo', 'com'],
            path: ['get']
        }
    });

    return callback(null, mockedCollectionRequest);
};
