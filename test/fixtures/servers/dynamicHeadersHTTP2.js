const server = require('./_servers'),
    httpServer = server.createHTTP2Server();


httpServer.on('request', (req, res) => {
    const headerSizeInBytes = parseInt(req.url.split('/').at(-1), 10);

    let headers = { header: 'a'.repeat(headerSizeInBytes - 6 - 2 - 2) };

    res.writeHead(200, headers);
    res.end('Headers sent dynamically based on the URL.');
});


module.exports = httpServer;
