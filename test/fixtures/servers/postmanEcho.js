var url = require('url'),
    server = require('./_servers'),
    httpServer = server.createHTTPServer();

function parseCookies (header) {
    var cookies = {};

    if (!header) {
        return cookies;
    }

    header.split(';').forEach(function (cookie) {
        var index = cookie.indexOf('=');

        if (index === -1) {
            return;
        }

        cookies[cookie.slice(0, index).trim()] = decodeURIComponent(cookie.slice(index + 1).trim());
    });

    return cookies;
}

function sendJSON (res, body, headers) {
    res.writeHead(200, Object.assign({
        'content-type': 'application/json; charset=utf-8'
    }, headers));

    res.end(JSON.stringify(body));
}

httpServer.on('/get', function (req, res) {
    sendJSON(res, {
        args: url.parse(req.url, true).query,
        headers: req.headers,
        url: 'http://' + req.headers.host + req.url
    }, {
        'set-cookie': 'sails.sid=s%3Alocal-echo; Path=/; HttpOnly'
    });
});

httpServer.on('/cookies', function (req, res) {
    sendJSON(res, {
        cookies: parseCookies(req.headers.cookie)
    });
});

httpServer.on('/cookies/set', function (req, res) {
    var query = url.parse(req.url, true).query,
        cookies = Object.keys(query).map(function (key) {
            return key + '=' + encodeURIComponent(query[key]) + '; Path=/';
        });

    res.writeHead(302, {
        location: '/cookies',
        'set-cookie': cookies
    });
    res.end();
});

module.exports = httpServer;
