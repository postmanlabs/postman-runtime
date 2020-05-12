const server = require('./_servers'),
    redirectServer = server.createRedirectServer();

// This will be called on final redirect
redirectServer.on('finally', function (req, res) {
    res.writeHead(200, {'content-type': 'application/json'});
    res.end(JSON.stringify(this.hits));

    // reset hits
    this.hits = [];
});

module.exports = redirectServer;
