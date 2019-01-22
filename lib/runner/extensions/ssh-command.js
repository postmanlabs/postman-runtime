var SshTunnelAgent = require('../ssh-tunnel-agent').SshTunnelAgent,
    _ = require('lodash'),
    Sdk = require('postman-collection');

module.exports = {
    init: function (done) {
        this.tunnelAgent = new SshTunnelAgent();
        done();
    },

    triggers: ['sshTunnel'],

    process: {
        startTunnel: function (payload, next) {
            var self = this,
                tunnelAgent = self.tunnelAgent,
                proxyConfigs,
                proxies,
                proxyConfigList;

            Sdk.ProxyConfigList.isProxyConfigList(payload.proxies) && (proxies = payload.proxies.all());

            // filters out ssh Tunneling proxies.
            // eslint-disable-next-line lodash/matches-prop-shorthand
            proxyConfigs = _.filter(proxies, function(proxy) {
                return Sdk.SshConfig.isSshConfig(proxy.sshTunnelConfig) &&
                    (proxy.sshTunnelConfig.enablePortForwarding === true);
            });

            proxyConfigList = proxyConfigs ? new Sdk.ProxyConfigList({}, proxyConfigs) : [];

            if (_.isEmpty(proxyConfigs)) {
                return next();
            }

            /**
             *  if there's is even one proxyconfig with ssh tunneling option enabled start tunnel(s).
             *  when port provided is 0 a random availiable port will be choosen to listen on.
             */
            tunnelAgent.start(proxyConfigList, 0, self, function (err, reporter) {
                var error = null;

                if (err) {
                    tunnelAgent.close(self);
                    error = err;
                }

                error ? self.triggers.sshTunnel(error) :
                    self.triggers.sshTunnel(error, reporter);

                return next(null);
            });
        }
    }
};
