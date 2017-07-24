var _ = require('lodash'),
    async = require('async'),
    requests = require('postman-request'),
    dns = require('dns'),
    Socket = require('net').Socket,

    LOCAL_IPV6 = '::1',
    LOCAL_IPV4 = '127.0.0.1',
    LOCALHOST = 'localhost',
    SOCKET_TIMEOUT = 500,

    S_CONNECT = 'connect',
    S_ERROR = 'error',
    S_TIMEOUT = 'timeout',

    /**
     * Tries to make a TCP connection to the given host and port. If successful, the connection is immediately
     * destroyed.
     *
     * @param host
     * @param port
     * @param callback
     */
    connect = function (host, port, callback) {
        var socket = new Socket(),
            called,

            done = function (type) {
                if (!called) {
                    callback(type === S_CONNECT ? null : true);
                    called = true;
                    this.destroy();
                }
            };

        socket.setTimeout(SOCKET_TIMEOUT, done.bind(socket, S_TIMEOUT));
        socket.once('connect', done.bind(socket, S_CONNECT));
        socket.once('error', done.bind(socket, S_ERROR));
        socket.connect(port, host);
        socket = null;
    },

    /**
     * Override DNS lookups in Node, to handle localhost as a special case.
     * Chrome tries connecting to IPv6 by default, so we try the same thing.
     *
     * @param port
     * @param hostname
     * @param options
     * @param callback
     */
    lookup = function (port, hostname, options, callback) {
        if (hostname !== LOCALHOST) {
            return dns.lookup(hostname, options, callback);
        }

        async.waterfall([
            function (next) {
                // Try checking if we can connect to IPv6 localhost ('::1')
                connect(LOCAL_IPV6, port, function (err) {
                    next(null, !err);
                });
            },
            function (result, next) {
                return next(null, result ? LOCAL_IPV6 : LOCAL_IPV4, result ? 6 : 4);
            }
        ], function (err, ip, family) {
            callback(null, ip, family);
        });
    },

    /**
     * Sets the Proxy and tunnel to the options
     *
     * @param request
     * @param options
     * @param cb
     */
    setProxy = function(request, options, cb) {
        var proxyConfig;

        if ((proxyConfig = _.get(request, 'proxy'))) {
            options.proxy = proxyConfig.getProxyUrl(request.url);
            // TODO: Use tri-state var for tunnel in SDK and update here
            // for now determine the tunnel value from the URL unless explicitly set to true
            options.tunnel = proxyConfig.tunnel ? true : _.startsWith(request.url, 'https://');
        }
        cb(null, request, options);
    },

    /**
     * Gets the certificate from the options.certificate
     * And appends it with the options provided
     *
     * @param options
     * @param cb
     */
    setCertificate = function (request, options, cb) {
        var certificate,
            isSSL = _.startsWith(request.url.protocol, 'https'),
            hasCertificate = request.certificate;

        // exit if protocol is not https
        // or both certificateManager and certificateList are missing
        if (!isSSL || !hasCertificate) {
            return cb(null, options);
        }

        certificate = request.certificate;

        if (!certificate) { return cb(null, options); }

        _.assign(options, {
            key: _.get(certificate, 'key.value'),
            cert: _.get(certificate, 'cert.value'),
            passphrase: certificate.passphrase
        });
        cb(null, options);
    };

module.exports = function (request, options, callback) {
    var hostname = request.url && _.isFunction(request.url.getHost) && request.url.getHost().toLowerCase(),
        isSSL = _.startsWith(request.url.protocol, 'https'),
        port = _.get(request, 'url.port'),
        portNumber,

        req = {};

    if (hostname === LOCALHOST) {
        portNumber = port || (isSSL ? '443' : '80');
        portNumber = _.parseInt(portNumber, 10);
        options.lookup = _.isFinite(portNumber) && lookup.bind(this, portNumber);
    }


    async.waterfall([
        function (next) {
            setProxy(request, options, next);
        },
        function (request, options, next) {
            setCertificate(request, options, next);
        }
    ], function (err, options) {
        var request = requests(options, callback);

        // todo: this is a hack to ensure that we can abort requests from the app before they're complete.
        req.abort = request.abort.bind(request);
    });

    return req;
};
