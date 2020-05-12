const server = require('./_servers'),
    redirectServer = server.createRedirectServer();

// This will be called on final redirect
redirectServer.on('finally', function (req, res) {
    var data = '';

    req.on('data', function (d) {
        data += d;
    });

    req.once('end', function () {
        res.writeHead(200, {connection: 'close'});
        res.end(data);
    });

    // reset hits
    this.hits = [];
});

module.exports = redirectServer;
