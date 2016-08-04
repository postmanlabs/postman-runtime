var _ = require('lodash'),
    async = require('async'),
    requests = require('request'),
    dns = require('dns'),
    Socket = require('net').Socket,

    LOCAL_IPV6 = '::1',
    LOCAL_IPV4 = '127.0.0.1',

    /**
     * Tries to make a TCP connection to the given host and port. If successful, the connection is immediately
     * destroyed.
     *
     * @param host
     * @param port
     * @param callback
     */
    connect = function (host, port, callback) {
        var socket = new Socket();

        socket.once('connect', function () {
            socket.destroy();
            callback();
        });

        socket.once('error', callback);
        socket.connect(port, host);
    },

    /**
     * Override DNS lookups in Node, to handle localhost as a special case.
     * Chrome tries connecting to IPv6 by default, so we try the same thing.
     *
     * @param request
     * @param hostname
     * @param options
     * @param callback
     */
    lookup = function (request, hostname, options, callback) {
        if (hostname !== 'localhost') {
            return dns.lookup(hostname, options, callback);
        }
        var port = _.get(request, 'url.port');

        if (!port) {
            port = _.startsWith(request.url.protocol, 'https') ? '443' : '80';
        }
        port = _.parseInt(port, 10);

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
    };

module.exports = function (requestOptions, callback, request) {
    requestOptions.lookup = lookup.bind(this, request);

    return requests(requestOptions, callback);
};
