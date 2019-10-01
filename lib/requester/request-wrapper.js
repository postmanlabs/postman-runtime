var _ = require('lodash'),
    async = require('async'),
    requests = require('postman-request'),

    /**
     * Sets the Proxy and tunnel to the options
     *
     * @param request
     * @param options
     * @param cb
     */
    setProxy = function (request, options, cb) {
        var proxyConfig;

        if ((proxyConfig = _.get(request, 'proxy'))) {
            options.proxy = proxyConfig.getProxyUrl(request.url);
            // TODO: Use tri-state var for tunnel in SDK and update here
            // for now determine the tunnel value from the URL unless explicitly set to true
            options.tunnel = proxyConfig.tunnel ? true : _.startsWith(request.url, 'https://');
        }

        // if proxy is not set, postman-request implicitly fallbacks to proxy
        // environment variables. To opt-out of this, set `ignoreProxyEnvironmentVariables`
        // requester option.
        // Setting proxy to `false` opt out of the implicit proxy configuration
        // of the other environment variables.
        if (!options.proxy && options.ignoreProxyEnvironmentVariables) {
            options.proxy = false;
        }

        cb(null, request, options);
    },

    /**
     * Gets the certificate from the options.certificate
     * And appends it with the options provided
     *
     * @param request
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
            pfx: _.get(certificate, 'pfx.value'),
            key: _.get(certificate, 'key.value'),
            cert: _.get(certificate, 'cert.value'),
            passphrase: certificate.passphrase
        });
        cb(null, options);
    };

// Enable support for extending root CAs.
// Refer: https://github.com/postmanlabs/postman-request/pull/35
// @todo trigger console warning (using callback) if not enabled.
requests.enableNodeExtraCACerts();

module.exports = function (request, options, onStart, callback) {
    var req = {};

    async.waterfall([
        function (next) {
            setProxy(request, options, next);
        },
        function (request, options, next) {
            setCertificate(request, options, next);
        }
    ], function (err, options) {
        if (err) { return callback(err); }

        var request = requests(options, callback);

        // todo: this is a hack to ensure that we can abort requests from the app before they're complete.
        req.abort = request.abort.bind(request);

        // emit responseStart event
        request.on('response', onStart);
    });

    return req;
};
