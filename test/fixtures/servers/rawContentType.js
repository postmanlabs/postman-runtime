const server = require('./_servers'),
    httpServer = server.createHTTPServer();

/**
 * Parse raw form-data content
 *
 * @param {String} raw
 * @returns {Array}
 *
 * Reference: https: //tools.ietf.org/html/rfc7578
 *
 * @example
 * --boundary
 * Content-Disposition: form-data; name="foo"
 * Content-Type: text/plain
 *
 * bar
 * --boundary
 *
 * returns -> [{name: 'foo', contentType: 'text/plain'}]
 */
function parseRaw (raw) {
    raw = raw.split('\r\n');
    var boundary = raw[0],
        result = [],
        data,
        match,
        i,
        ii;

    for (i = 0, ii = raw.length; i < ii; i++) {
        if (raw[i] !== boundary) { continue; }

        data = {};
        match = (/\sname="(.*?)"/).exec(raw[++i]);
        match && (data.name = match[1]);

        match = (/^Content-Type:\s(.*)$/).exec(raw[++i]);
        match && (data.contentType = match[1]);

        Object.keys(data).length && result.push(data);
    }

    return result;
}

httpServer.on('/', function (req, res) {
    var rawBody = '';

    req.on('data', function (chunk) {
        rawBody += chunk.toString(); // decode buffer to string
    }).on('end', function () {
        res.writeHead(200, {
            'Content-Type': 'application/json',
            'Connection': 'close'
        });
        res.end(JSON.stringify(parseRaw(rawBody)));
    });
});


module.exports = httpServer;
