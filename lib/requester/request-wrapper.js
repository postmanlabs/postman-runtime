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

    ERROR_INVALID_FILE_PATH = 'Invalid path to certificate files',

    CertificateList = require('postman-collection').CertificateList,

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
     * @param options
     * @param cb
     */
    setProxy = function(options, cb) {
        var url = _.get(options, 'request.url'),
            proxyConfig = {};

        if (url && options.proxyList) {
            _.isFunction(url.toString) && (url = url.toString());
            _.isFunction(options.proxyList.resolve) && (proxyConfig = options.proxyList.resolve(url));
            if(proxyConfig) {
              options.proxy = proxyConfig.server.toString(),
              options.tunnel = proxyConfig.tunnel;
              _.set(options, 'request._._postman_proxy', proxyConfig);
              _.set(options, 'request.proxy', proxyConfig);
            }
            return cb(null, options);
        }
        cb(null, options);
    },

    /**
     * Resolves the content of a certificate from the file system,
     * using the current file resolver.
     *
     * @param certificate The certificate to resolve
     * @param resolver The file resolver to use
     * @param cb Callback once resolve is done
     */
    resolveCertificateContents = function(certificate, resolver, cb) {
        var keyPath = _.get(certificate, 'key.src'),
            certPath = _.get(certificate, 'cert.src'),
            keyData,
            certData;

        if (!_.isString(keyPath) || !_.isString(certPath)) {
            cb(ERROR_INVALID_FILE_PATH);
        }

        async.waterfall([
            function (next) {
                resolver.readFile(keyPath, next);
            },
            function (keyData, next) {
              resolver.readFile(certPath, function (err, certData) {
                  next(err, keyData, certData)
              });
            }
        ], function (err, keyData, certData) {
            cb(err, {
                key: keyData.toString(),
                cert: certData.toString(),
                passphrase: certificate.passphrase
            });
        });
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
            isSSL = _.startsWith(request.url.protocol, 'https');

        if (!isSSL) {
            return cb(null, options);
        }

        if (_.get(options, 'certificateManager.getCertificateContents')) {
          console.warn('Using certificateManager with requester options is deprecated, use CertificateList instead.');
          // Get any certificates for this request from the certificate manager
          return options.certificateManager.getCertificateContents(request.url.getRemote(),
             function (err, info) {
                 _.assign(options, {
                     key: info && info.key,
                     cert: info && info.pem,
                     passphrase: info && info.passphrase
                 });
                 _.set(options, 'request._._postman_certificate', _.pick(info, ['pemPath', 'keyPath']));
                 return cb(err, options);
               });
        }

        if (options.certificateList && CertificateList.isCertificateList(options.certificateList)) {
            var certificate = options.certificateList.resolveOne(request.url);

            if (_.isEmpty(certificate)) {
                return cb(null, options);
            }

            return resolveCertificateContents(certificate, options.fileResolver, function (err, info) {
                if (err) {
                    return cb(null, options);
                }
                _.extend(options, {
                    key: info && info.key,
                    cert: info && info.cert,
                    passphrase: info && info.passphrase
                });
                _.set(options, 'request.certificate', certificate);
                return cb(null, options);
            });
        }

        return cb(null, options);
    };

module.exports = function (options, callback) {
    var request = options.request,
        hostname = request.url && _.isFunction(request.url.getHost) && request.url.getHost().toLowerCase(),
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
            setProxy(options, next);
        },
        function (options, next) {
            setCertificate(options, next);
        }
    ], function (err, options) {
        var request = requests(options, callback);

        // todo: this is a hack to ensure that we can abort requests from the app before they're complete.
        req.abort = request.abort.bind(request);
    });

    return req;
};
