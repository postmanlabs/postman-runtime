const _ = require('lodash'),
    http = require('http'),
    http2 = require('http2'),
    crypto = require('crypto'),
    zlib = require('zlib'),
    querystring = require('querystring'),
    enableServerDestroy = require('server-destroy'),
    Hawk = require('postman-request/lib/hawk'),

    server = require('./_servers'),

    DATA_URI_PREFIX = 'data:application/octet-stream;base64,',
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
    OMIT_PREFIXES = ['cf-', 'x-envoy', 'x-b3'],
    BASIC_USERS = {
        postman: 'password',
        testuser: 'testpass'
    },
    HAWK_CREDENTIALS = {
        dh37fgj492je: {
            id: 'dh37fgj492je',
            key: 'werxhqb98rpaxn39848xrunpaw3489ruxnpa98w4rxn',
            algorithm: 'sha256'
        },
        testid: {
            id: 'testid',
            key: 'testkey',
            algorithm: 'sha256'
        }
    };

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
    return _.omitBy(lowerHeaders(req.headers), function (value, key) {
        return ECHO_INTERNAL_HEADERS.includes(key) || OMIT_HEADERS.includes(key) ||
            OMIT_PREFIXES.some(function (prefix) { return key.startsWith(prefix); });
    });
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
            if (Array.isArray(args[key])) {
                args[key].push(value);
            }
            else {
                args[key] = [args[key], value];
            }

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

function parseMultipart (contentType, body) {
    const boundaryMatch = (/boundary=(?:"([^"]+)"|([^;]+))/i).exec(contentType),
        form = {},
        files = {},
        boundary = boundaryMatch && '--' + (boundaryMatch[1] || boundaryMatch[2]),
        text = body.toString('binary');

    if (!boundaryMatch) {
        return { form, files };
    }

    text.split(boundary).forEach(function (part) {
        if (!part || part === '--\r\n' || part === '--') { return; }

        part = part.replace((/^\r\n/), '').replace((/\r\n--$/), '');

        const headerEnd = part.indexOf('\r\n\r\n'),
            rawHeaders = part.slice(0, headerEnd),
            content = part.slice(headerEnd + 4).replace((/\r\n$/), ''),
            nameMatch = (/name="([^"]*)"/i).exec(rawHeaders),
            filenameMatch = (/filename="([^"]*)"/i).exec(rawHeaders);

        if (headerEnd === -1) { return; }

        if (!nameMatch) { return; }

        if (filenameMatch) {
            files[filenameMatch[1]] = DATA_URI_PREFIX + Buffer.from(content, 'binary').toString('base64');

            return;
        }

        if (Object.hasOwn(form, nameMatch[1])) {
            if (Array.isArray(form[nameMatch[1]])) {
                form[nameMatch[1]].push(content);
            }
            else {
                form[nameMatch[1]] = [form[nameMatch[1]], content];
            }

            return;
        }

        form[nameMatch[1]] = content;
    });

    return { form, files };
}

function parseBody (req, body) {
    const contentType = req.headers['content-type'] || '';

    if ((/multipart\/form-data/i).test(contentType)) {
        const parsed = parseMultipart(contentType, body);

        return {
            data: '',
            files: parsed.files,
            form: parsed.form,
            json: Object.keys(parsed.form).length ? parsed.form : null
        };
    }

    if ((/application\/x-www-form-urlencoded/i).test(contentType)) {
        const form = querystring.parse(body.toString());

        return {
            data: '',
            files: {},
            form: form,
            json: Object.keys(form).length ? form : null
        };
    }

    if ((/application\/octet-stream/i).test(contentType)) {
        return {
            data: body,
            files: {},
            form: {},
            json: null
        };
    }

    if ((/application\/json/i).test(contentType)) {
        if (!body.length) {
            return { data: '', files: {}, form: {}, json: null };
        }

        try {
            const json = JSON.parse(body.toString());

            return { data: json, files: {}, form: {}, json: json };
        }
        catch (e) {
            return { data: body.toString(), files: {}, form: {}, json: null };
        }
    }

    if (!contentType && body.length) {
        try {
            JSON.parse(body.toString());

            return {
                data: body,
                files: {},
                form: {},
                json: null
            };
        }
        catch (e) {
            return {
                data: body.toString(),
                files: {},
                form: {},
                json: null
            };
        }
    }

    if (!contentType && !body.length) {
        return {
            data: {},
            files: {},
            form: {},
            json: null
        };
    }

    return {
        data: body.toString(),
        files: {},
        form: {},
        json: null
    };
}

function methodResponse (req, body) {
    return {
        args: queryArgs(req),
        ...parseBody(req, body),
        headers: echoHeaders(req),
        url: originalUrl(req)
    };
}

function verifyBasicAuth (req) {
    const authorization = req.headers.authorization;
    let credentials,
        index;

    if (!authorization || !authorization.startsWith('Basic ')) {
        return false;
    }

    credentials = Buffer.from(authorization.slice(6), 'base64').toString();
    index = credentials.indexOf(':');

    if (index === -1) { return false; }

    return BASIC_USERS[credentials.slice(0, index)] === credentials.slice(index + 1);
}

function md5 (value) {
    return crypto.createHash('md5').update(value).digest('hex');
}

function parseAuthParams (authorization, prefix) {
    const params = {};

    authorization.slice(prefix.length).replace((/(\w+)=(?:"([^"]*)"|([^,\s]+))/g),
        function (match, key, quoted, bare) {
            params[key] = quoted || bare;
        });

    return params;
}

function verifyDigestAuth (req) {
    const authorization = req.headers.authorization;
    let params,
        password,
        uri,
        ha1,
        ha2;

    if (!authorization || !authorization.startsWith('Digest ')) {
        return false;
    }

    params = parseAuthParams(authorization, 'Digest ');
    password = BASIC_USERS[params.username];
    uri = new URL(originalUrl(req)).pathname + new URL(originalUrl(req)).search;
    ha1 = md5(params.username + ':' + params.realm + ':' + password);
    ha2 = md5(req.method + ':' + uri);

    if (!password || params.realm !== 'Users' || params.uri !== uri) {
        return false;
    }

    return params.response === md5([ha1, params.nonce, params.nc, params.cnonce, params.qop, ha2].join(':'));
}

function verifyOAuth1 (req) {
    const authorization = req.headers.authorization,
        parsedUrl = new URL(originalUrl(req)),
        hasOAuthHeader = authorization && authorization.startsWith('OAuth ');

    return Boolean(hasOAuthHeader || parsedUrl.searchParams.get('oauth_signature'));
}

function verifyHawk (req, body) {
    const authorization = req.headers.authorization;
    let params,
        credentials,
        parsedUrl,
        port;

    if (!authorization || !authorization.startsWith('Hawk ')) {
        return false;
    }

    params = parseAuthParams(authorization, 'Hawk ');
    credentials = HAWK_CREDENTIALS[params.id];
    parsedUrl = new URL(originalUrl(req));
    port = parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80);

    if (!credentials) { return false; }

    if (params.hash) {
        const hash = crypto.createHash('sha256');

        hash.update('hawk.1.payload\n');
        hash.update((req.headers['content-type'] || '').split(';')[0].trim().toLowerCase());
        hash.update('\n');
        hash.update(body);
        hash.update('\n');

        if (hash.digest('base64') !== params.hash) {
            return false;
        }
    }

    return params.mac === Hawk.calculateMac(credentials, {
        ts: params.ts,
        nonce: params.nonce,
        method: req.method,
        resource: parsedUrl.pathname + parsedUrl.search,
        host: parsedUrl.hostname,
        port: port,
        hash: params.hash,
        ext: params.ext,
        app: params.app,
        dlg: params.dlg
    });
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

        if (pathname === '/headers') {
            return sendJSON(res, 200, { headers: echoHeaders(req) });
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

        if (pathname === '/redirect-to') {
            const location = parsedUrl.searchParams.get('url');

            if (!location) {
                return sendJSON(res, 400, { status: 400, message: 'No redirect url provided' });
            }

            return redirect(res, location);
        }

        if (pathname.startsWith('/status/')) {
            const status = Number(pathname.split('/')[2]);

            if (!http.STATUS_CODES[status]) {
                return sendJSON(res, 400, {
                    status: 400,
                    message: 'Invalid HTTP Status Code',
                    moreinfo: 'https://www.wikiwand.com/en/List_of_HTTP_status_codes'
                });
            }

            return sendJSON(res, status, { status });
        }

        if (pathname === '/response-headers') {
            const headers = {},
                args = {};

            parsedUrl.searchParams.forEach(function (value, key) {
                if (Object.hasOwn(headers, key)) {
                    headers[key] = Array.isArray(headers[key]) ? headers[key].concat(value) : [headers[key], value];
                }
                else {
                    headers[key] = value;
                }

                args[key] = value;
            });

            return sendJSON(res, 200, args, headers);
        }

        if (pathname === '/gzip') {
            const payload = Buffer.from(JSON.stringify({
                gzipped: true,
                headers: echoHeaders(req),
                method: 'GET'
            }, null, 2), 'utf8');

            res.writeHead(200, {
                'content-encoding': 'gzip',
                'content-type': 'application/json'
            });

            return res.end(zlib.gzipSync(payload));
        }

        if (pathname.startsWith('/delay/')) {
            const seconds = Math.min(Number(pathname.split('/')[2]) || 0, 10);

            return setTimeout(function () {
                sendJSON(res, 200, { delay: String(seconds) });
            }, seconds * 1000);
        }

        if (pathname.startsWith('/bytes/')) {
            const parts = pathname.split('/'),
                value = Number(parts[2]) || 0,
                multiplier = { kb: 1024, mb: 1024 * 1024, gb: 1024 * 1024 * 1024 }[parts[3]] || 1,
                size = Math.min(value * multiplier, 1024 * 1024 * 1024);

            res.writeHead(200, { 'content-type': 'text/plain' });

            return res.end('a'.repeat(size));
        }

        if (pathname === '/type/xml') {
            res.writeHead(200, { 'content-type': 'application/xml; charset=utf-8' });

            return res.end('<?xml version="1.0" encoding="utf-8"?><food><key>Homestyle Breakfast</key>' +
                '<value>950</value></food>');
        }

        if (pathname === '/type/html') {
            res.writeHead(200, { 'content-type': 'application/html; charset=utf-8' });

            return res.end('<!DOCTYPE html><html><head><title>Hello World!</title></head><body>' +
                '<h1>Hello World!</h1></body></html>');
        }

        if (pathname === '/basic-auth') {
            if (!verifyBasicAuth(req)) {
                res.writeHead(401, { 'www-authenticate': 'Basic realm="Users"' });

                return res.end('Unauthorized');
            }

            return sendJSON(res, 200, { authenticated: true });
        }

        if (pathname === '/digest-auth') {
            if (!verifyDigestAuth(req)) {
                res.writeHead(401, {
                    'www-authenticate': 'Digest realm="Users", qop="auth", algorithm="MD5", nonce="md5nonce"'
                });

                return res.end('Unauthorized');
            }

            return sendJSON(res, 200, { authenticated: true });
        }

        if (pathname === '/oauth1') {
            return sendJSON(res, verifyOAuth1(req) ? 200 : 401, verifyOAuth1(req) ? {
                status: 'pass',
                message: 'OAuth-1.0a signature verification was successful'
            } : { error: 'Invalid signature' });
        }

        if (pathname === '/oauth2') {
            return sendJSON(res, req.headers.authorization ? 200 : 401, req.headers.authorization ? {
                authenticated: true
            } : { error: 'Unauthorized' });
        }

        if (pathname === '/auth/hawk') {
            return sendJSON(res, verifyHawk(req, body) ? 200 : 401, verifyHawk(req, body) ? {
                message: 'Hawk Authentication Successful'
            } : { message: 'Hawk Authentication Failed' });
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
