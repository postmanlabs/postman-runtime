var _ = require('lodash'),
    async = require('async'),
    requests = require('request'),
    dns = require('dns'),
    Socket = require('net').Socket,

    LOCAL_IPV6 = '::1',
    LOCAL_IPV4 = '127.0.0.1',
    LOCALHOST = 'localhost',
    SOCKET_TIMEOUT = 500,

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

            done = function () {
                !called && callback.apply(this, arguments);
                called = true;
                this.destroy();
            };

        socket.setTimeout(SOCKET_TIMEOUT, done);
        socket.once('connect', done);
        socket.once('error', done);
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
     * @param options
     * @param cb
     */
    setProxy = function(options, cb) {
        if (options.proxyManager && options.proxyManager.getProxyConfiguration) {
            options.proxyManager.getProxyConfiguration(options.request.url, function(err, obj) {
                options.proxy = obj && obj.proxy,
                options.tunnel = obj && obj.tunnel;
                if (err) {
                  return cb(err, options);
                }

                return cb(null, options);
            });
        }

        cb(null, options);
    },

    /**
     * Gets the certificate from the options.certificate
     * And appends it with the options provided
     *
     * @param options
     * @param cb
     */
    setCertificate = function (options, cb) {
        var request = options.request,
            // todo: ensure that the sdk trims the host
            isSSL = _.startsWith(request.url.protocol, 'https'),
            hostname = request.url && _.isFunction(request.url.getHost) && request.url.getHost().toLowerCase(),
            portNumber;
            port = _.get(request, 'url.port');

        if (hostname === LOCALHOST) {
            portNumber = port || (isSSL ? '443' : '80');
            portNumber = _.parseInt(portNumber, 10);
            options.lookup = _.isFinite(portNumber) && lookup.bind(this, portNumber);
        }

        if (!isSSL || !(options.certificateManager && options.certificateManager.getCertificateContents)) {
            return cb(null, options);
        }

        // Get any certificates for this request from the certificate manager
        options.certificateManager.getCertificateContents(hostname + ':' + port,
              function (err, info) {
                  _.extend(options, {
                    key: info && info.key,
                    cert: info && info.pem,
                    passphrase: info && info.passphrase
                  });
                  if (err) {
                      return cb(err, options);
                  }

                  return cb(null, options);
                });
    };

module.exports = function (options, callback) {
    var request = options.request;

    setProxy(options, function(err, options) {
        if (err) {
          return callback(err, options);
        }

        setCertificate(options, function(err, options) {
            if (err) {
                return callback(err, options);
            }

            return requests(options, callback);
        });
    });
};
