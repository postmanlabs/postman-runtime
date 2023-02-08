const server = require('./_servers'),
    fs = require('fs'),
    path = require('path'),
    url = require('url'),
    jwtServer = server.createHTTPServer();

jwtServer.on('/cert', function (req, res) {
    const query = url.parse(req.url, true).query;

    res.writeHead(200, { 'content-type': 'text/plain' });
    res.end(fs.readFileSync(path.join(__dirname, query.filepath), 'utf8'));
});

module.exports = jwtServer;
