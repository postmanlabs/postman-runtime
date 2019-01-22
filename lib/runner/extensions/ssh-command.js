var SshTunnelAgent = require('../ssh-tunnel-agent').SshTunnelAgent,
    tunnelAgent = new SshTunnelAgent(),
    _ = require('lodash'),
    Sdk = require('postman-collection');

module.exports = {
    init: function (done) {
        this.tunnelAgent = tunnelAgent;
        done();
    },

    triggers: ['sshTunnel'],

    process: {
        startTunnel: function (payload, next) {
            var self = this,
                proxyConfigs,
                proxies,
                proxyConfigList;

            Sdk.ProxyConfigList.isProxyConfigList(payload.proxies) && (proxies = payload.proxies.all());

            // filter outs ssh Tunneling proxies.
            proxyConfigs = _.filter(proxies, function(proxy) {
                return ((Sdk.SshConfig.isSshConfig(proxy.sshTunnelConfig) &&
                    proxy.sshTunnelConfig.enablePortForwarding === true));
            });

            proxyConfigList = proxyConfigs ? new Sdk.ProxyConfigList({}, proxyConfigs) : [];

            // eslint-disable-next-line no-negated-condition
            if (!_.isEmpty(proxyConfigs)) {
                tunnelAgent.start(proxyConfigList, 8191, self, function (err) {
                    var error;

                    if (err) {
                        tunnelAgent.close(self);
                        error = err;
                    }

                    error ? self.triggers.sshTunnel(error, self.reporter) :
                        self.triggers.sshTunnel(null, self.reporter);

                    return next(null);
                });
            }
            else {
                return next(null);
            }
        }
    }
};
