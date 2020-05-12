const server = require('./_servers'),
    httpServer = server.createHTTPServer();

httpServer.on('/redirect', function (req, res) {
    res.writeHead(301, {
        'Location': httpServer.url + '/query?q={("*")}'
    });
    res.end();
});

httpServer.on('/relative_redirect', function (req, res) {
    res.writeHead(301, {
        'Location': '/query?q={("*")}'
    });
    res.end();
});

httpServer.on('/query', function (req, res) {
    res.writeHead(200);
    res.end(JSON.stringify({
        url: req.url
    }));
});

module.exports = httpServer;
