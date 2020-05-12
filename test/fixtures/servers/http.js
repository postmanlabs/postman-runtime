const _ = require('lodash'),
    server = require('./_servers'),
    httpServer = server.createHTTPServer();

/**
 * Converts raw request headers to array of key-value object.
 *
 * [ 'User-Agent', 'PostmanRuntime' ] -> [{key: 'User-Agent', value: 'PostmanRuntime'}]
 *
 * @param {String[]} rawHeaders - raw request headers
 * @returns {Object[]}
 */
function parseRawHeaders (rawHeaders) {
    return _(rawHeaders).chunk(2).map(([key, value]) => {
        return {key, value};
    }).value();
}

httpServer.on('/', function (req, res) {
    res.writeHead(200, {'content-type': 'text/plain'});
    res.end('Okay!');
});

httpServer.on('/headers', function (req, res) {
    res.writeHead(200, {'content-type': 'application/json'});
    res.end(JSON.stringify(parseRawHeaders(req.rawHeaders)));
});

httpServer.on('/cookies', function (req, res) {
    res.writeHead(200, {'content-type': 'application/json'});
    res.end(JSON.stringify(parseRawHeaders(req.rawHeaders)));
});

httpServer.on('/proxy', function (req, res) {
    var proxyHeader = Boolean(req.headers['x-postman-proxy']);

    res.writeHead(200, {'content-type': 'text/plain'});
    res.end(`Hello Postman!!\nproxy-header:${proxyHeader}`);
});

httpServer.on('/multi-valued-headers', function (req, res) {
    res.setHeader('x-pm-test', ['one', 'two']); // adds a duplicate header to the response
    res.end('Okay!');
});

httpServer.on('/custom-reason', function (req, res) {
    res.writeHead(400, 'Some Custom Reason');
    res.end();
});

module.exports = httpServer;
