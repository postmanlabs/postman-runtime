var SshClient = require('ssh2'),
    _ = require('../../../postman-collection/lib/util').lodash,
    ProxyConfigList = require('postman-collection').ProxyConfigList,
    net = require('net'),
    fs = require('fs'),
    EventEmitter = require('events').EventEmitter,

    HIGHEST_POSSIBLE_PORT = 65535,
    LOCALHOST = '127.0.0.1',
    DEFAULT_LOCAL_PORT = 0,

    SshTunnelAgent;

/**
 * Tunnel Agent is responsible for managining and starting new SSH tunnels, it can establish tunnel
 * between mutiple SSH hosts and can can route the request to correct host by matching the against
 * url.
 *
 * @constructor
 * @extends Events
 * @param {ProxyConfigList} proxyConfigList
 */
SshTunnelAgent = function SshTunnelAgent (proxyConfigList) {
    this.proxyConfigList = _.assign({}, proxyConfigList);
    this.mapping = [];
    this.readyTunnelCount = 0;
    this.failedTunnelCount = 0;
    this.reporter = new EventEmitter();
};

_.assign(SshTunnelAgent.prototype, {
    isReady: function (status) {
        status ? this.readyTunnelCount++ : this.failedTunnelCount++;
        if (this.readyTunnelCount + this.failedTunnelCount === this.proxyConfigList.count()) {
            this.reporter.emit('ready', this.readyTunnelCount);
        }
    },

    /**
     * Given a sshconfig creates a single new tunnel between postman-runtime and ssh host.
     *
     * @param {SshConfig} sshConfig config related to ssh connection establishment and authentication
     * @return {SshClient}
     */
    createTunnel: function (sshConfig) {
        var sshc = new SshClient(),
            self = this;

        sshc.connect({
            host: sshConfig.auth.host,
            port: sshConfig.auth.port,
            username: sshConfig.auth.username,
            // eslint-disable-next-line security/detect-non-literal-fs-filename
            privateKey: fs.readFileSync(sshConfig.auth.privateKeyPath)
        });

        sshc.on('error', function(err) {
            var error = new Error('error establishing tunnel for host: ' + sshConfig.auth.host + err.message);

            self.reporter.emit('tunnelError', error);
            self.isReady(false);
        });

        sshc.on('ready', function () {
            var update = {config: sshConfig, client: sshc};

            !_.includes(self.mapping, update) && self.mapping.push(update);
            self.isReady(true);
        });

        return sshc;
    },

    // Helper function to modify proxies to listen on local port.
    setLocalProxy: function(scope, localport) {
        this.proxyConfigList.all().forEach(function (pc) {
            pc.host = LOCALHOST;
            pc.port = localport;
            scope.options.proxies.upsert(pc);
        });
    },

    // Helper function to destroy streams once they are closed.
    closeSock: function(sock, stream) {
        sock.destroy();
        stream.destroy();
    },

    /**
     * Forwards a messages on to some another configured port on ssh host. There could be a http proxy running on '
     * this port, or maybe something else in any case the traffic would be forearded to this port once it
     * reacher ssh host.
     *
     * @param {SshClient} sshClient
     * @param {SshConfig} sshConfig
     * @param {Socket} sock
     */
    forward: function (sshClient, sshConfig, sock) {
        var self = this,
            host = sshConfig.auth.host;

        sshClient.forwardOut('', sock.localPort, sshConfig.auth.host, sshConfig.proxyPort, function(err, stream) {
            if (err) {
                self.reporter.emit('tunnelError', new Error('request cannot be tunneled to host: ' + host +
                        ', ' + err.message));
                self.closeSock(sock, stream);

                return;
            }

            sock.pipe(stream).pipe(sock);

            sock.on('error', function(err) {
                self.reporter.emit('tunnelError', new Error('connection was closed with errors for tunnel host: ' +
                        host + ', ' + err.message));
                self.closeSock(sock, stream);
            });

            stream.on('error', function(err) {
                self.reporter.emit('tunnelError', new Error('connection was closed with errors for tunnel host: ' +
                        host + ', ') + err.message);
                self.closeSock(sock, stream);
            });
        });
    },

    /**
     * Given a proxy list creates and starts different ssh tunnels based on proxy list.
     *
     * @param {ProxyConfigList} proxyConfigList list of proxies
     * @param {Number} localport port listening locally for requests and forwarding them through tunnel
     * @param {Object} scope
     * @param {Function} cb callback function that will be called once all the tunnels are
     * initialised or some error occurred
     *
     */

    start: function (proxyConfigList, localport, scope, cb) {
        var self = this,
            sshConfigList;


        self.proxyConfigList = (ProxyConfigList.isProxyConfigList(proxyConfigList)) ?
            proxyConfigList : (_.isArray(proxyConfigList) && new ProxyConfigList({}, proxyConfigList));

        sshConfigList = self.proxyConfigList.map(function (proxyConfig) {
            return proxyConfig.sshTunnelConfig;
        }, self);

        // locally listen on a port, if provided port value is not valid pass 0 and a random pprt will be assigned
        (_.isInteger(localport) && (localport >= 0) && (localport <= HIGHEST_POSSIBLE_PORT)) ?
            localport : (localport = DEFAULT_LOCAL_PORT);

        self.setLocalProxy(scope, localport);

        self.localServer = net.createServer(function(sock) {
            // resolve proxyconfig to be used based on the request url
            var url = scope.currentReq,
                client,
                sshConfig,
                error,
                pc = self.proxyConfigList.resolve(url);

            // if proxy cannot be resolved
            if (pc) {
                sshConfig = _.filter((_.uniq(self.mapping)), ['config', pc.sshTunnelConfig]);
                client = _.isEmpty(sshConfig) ? false : _.head(sshConfig).client;
                error = new Error('Can not resolve proxy for: ' + url);

                client ? self.forward(client, pc.sshTunnelConfig, sock) :
                    (self.emit('tunnel', error) || sock.destroy());
            }
            else {
                self.reporter.emit('tunnelError', new Error('Cannot resolve proxy for : ' + url));
                sock.destroy();
            }
        });

        // local tcp server listening for requests to be tunneled
        self.localServer.listen(localport, function (err) {
            if (err) {
                return cb(err);
            }
            _.forEach(sshConfigList, function (sshConfig) {
                return self.createTunnel(sshConfig);
            });

            self.reporter.on('ready', function(readyCount) {
                if (readyCount === 0) {
                    const err = new Error('No tunnels can be established');

                    return cb(err);
                }

                return cb(null);
            });
        });
    },

    close: function () {
        var self = this;

        if (self.localServer) {
            self.localServer.close(function () {
                self.mapping.forEach(function (mapping) {
                    mapping.client.end();
                });
            });
        }
    },

    getItem: function(scope) {
        var coords = scope.state.cursor.current();

        return (scope.state.items[coords.position]);
    }
});

module.exports = {
    SshTunnelAgent: SshTunnelAgent
};
