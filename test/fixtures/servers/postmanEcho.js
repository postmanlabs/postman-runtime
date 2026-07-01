const http = require('http'),
    http2 = require('http2'),
    enableServerDestroy = require('server-destroy'),

    server = require('./_servers'),

    ECHO_INTERNAL_HEADERS = [
        'x-postman-echo-original-url',
        'x-postman-echo-original-protocol',
        'x-postman-echo-original-host'
    ],
    OMIT_HEADERS = [
        'x-real-ip',
        'x-forwarded-for',
        'cdn-loop',
        'true-client-ip',
        'x-forwarded-client-cert',
        'x-request-id'
    ],
    OMIT_PREFIXES = ['cf-', 'x-envoy', 'x-b3'];

let httpServer,
    httpsServer;

function collectBody (req, callback) {
    const chunks = [];

    req.on('data', function (chunk) {
        chunks.push(chunk);
    });

    req.on('end', function () {
        callback(Buffer.concat(chunks));
    });
}

function lowerHeaders (headers) {
    const result = {};

    Object.keys(headers || {}).forEach(function (key) {
        result[key.toLowerCase()] = headers[key];
    });

    return result;
}

function echoHeaders (req) {
    const headers = lowerHeaders(req.headers);

    ECHO_INTERNAL_HEADERS.concat(OMIT_HEADERS).forEach(function (key) {
        delete headers[key];
    });

    Object.keys(headers).forEach(function (key) {
        if (OMIT_PREFIXES.some(function (prefix) { return key.startsWith(prefix); })) {
            delete headers[key];
        }
    });

    return headers;
}

function originalUrl (req) {
    if (req.headers['x-postman-echo-original-url']) {
        return req.headers['x-postman-echo-original-url'];
    }

    const protocol = req.headers['x-postman-echo-original-protocol'] || (req.socket.encrypted ? 'https' : 'http'),
        host = req.headers['x-postman-echo-original-host'] || req.headers.host;

    return protocol + '://' + host + req.url;
}

function queryArgs (req) {
    const parsed = new URL(originalUrl(req)),
        args = {};

    parsed.searchParams.forEach(function (value, key) {
        if (Object.hasOwn(args, key)) {
            args[key] = Array.isArray(args[key]) ? args[key].concat(value) : [args[key], value];

            return;
        }

        args[key] = value;
    });

    return args;
}

function sendJSON (res, status, body, headers) {
    res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', ...headers });
    res.end(JSON.stringify(body));
}

function parseCookies (header) {
    const cookies = {};

    if (!header) { return cookies; }

    header.split(';').forEach(function (cookie) {
        const index = cookie.indexOf('=');

        if (index === -1) { return; }

        cookies[cookie.slice(0, index).trim()] = decodeURIComponent(cookie.slice(index + 1).trim());
    });

    return cookies;
}

function methodResponse (req, body) {
    return {
        args: queryArgs(req),
        data: body.length ? body.toString() : {},
        files: {},
        form: {},
        json: null,
        headers: echoHeaders(req),
        url: originalUrl(req)
    };
}

function redirect (res, location, headers) {
    res.writeHead(302, { location, ...headers });
    res.end();
}

function handle (req, res) {
    collectBody(req, function (body) {
        const parsedUrl = new URL(originalUrl(req)),
            pathname = parsedUrl.pathname.toLowerCase();

        if (pathname === '/') {
            res.writeHead(200, { 'content-type': 'text/plain' });

            return res.end('Okay!');
        }

        if (pathname === '/get') {
            if (req.method === 'HEAD') {
                res.writeHead(200);

                return res.end();
            }

            if (req.method === 'OPTIONS') {
                res.writeHead(200, { allow: 'OPTIONS' });

                return res.end();
            }

            return sendJSON(res, 200, {
                args: queryArgs(req),
                headers: echoHeaders(req),
                url: originalUrl(req)
            }, { 'set-cookie': 'sails.sid=s%3Alocal-echo; Path=/; HttpOnly' });
        }

        if (['/post', '/put', '/patch', '/delete'].includes(pathname)) {
            return sendJSON(res, 200, methodResponse(req, body));
        }

        if (pathname === '/cookies' || pathname === '/cookies/get') {
            return sendJSON(res, 200, { cookies: parseCookies(req.headers.cookie) });
        }

        if (pathname === '/cookies/set') {
            const cookies = [];

            parsedUrl.searchParams.forEach(function (value, key) {
                cookies.push(key + '=' + encodeURIComponent(value) + '; Path=/');
            });

            return redirect(res, '/cookies', { 'set-cookie': cookies });
        }

        if (pathname === '/cookies/delete') {
            const cookies = [];

            parsedUrl.searchParams.forEach(function (value, key) {
                cookies.push(key + '=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT');
            });

            return redirect(res, '/cookies', { 'set-cookie': cookies });
        }

        return sendJSON(res, 404, { status: 404, message: 'Not Found' });
    });
}

module.exports = {
    listen (callback) {
        const options = server.getSSLOptions ? server.getSSLOptions() : {
            key: require('fs').readFileSync(require('path').join(__dirname, '../certificates/server-key.pem')),
            cert: require('fs').readFileSync(require('path').join(__dirname, '../certificates/server-crt.pem'))
        };

        httpServer = http.createServer(handle);
        httpsServer = http2.createSecureServer({ allowHTTP1: true, ...options }, handle);

        enableServerDestroy(httpServer);
        enableServerDestroy(httpsServer);

        httpServer.listen(0, '127.0.0.1', function (err) {
            if (err) { return callback(err); }

            httpsServer.listen(0, '127.0.0.1', function (e) {
                if (e) { return callback(e); }

                module.exports.port = httpServer.address().port;
                module.exports.httpsPort = httpsServer.address().port;
                module.exports.url = 'http://echo-server.lvh.me:' + module.exports.port;
                module.exports.httpsUrl = 'https://echo-server.lvh.me:' + module.exports.httpsPort;

                callback();
            });
        });
    },

    destroy (callback) {
        let pending = 2,
            called = false;

        function done (err) {
            if (called) { return; }
            if (err) {
                called = true;

                return callback(err);
            }
            pending -= 1;
            pending === 0 && callback();
        }

        httpServer && httpServer.destroy(done);
        httpsServer && httpsServer.destroy(done);
    }
};
