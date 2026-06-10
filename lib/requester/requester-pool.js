var _ = require('lodash'),
    Requester = require('./requester').Requester,
    RequestCookieJar = require('postman-request').jar,

    STRING = 'string',
    FUNCTION = 'function',

    RequesterPool; // fn

RequesterPool = function (options, callback) {
    var self = this,
        extendedRootCA,
        fileResolver = options && options.fileResolver;

    _.assign((self.options = {}), {
        timeout: _.min([
            _.get(options, 'timeout.request'),
            _.get(options, 'timeout.global')
        ]), // validated later inside requester
        timings: _.get(options, 'requester.timings', true),
        verbose: _.get(options, 'requester.verbose', false),
        keepAlive: _.get(options, 'requester.keepAlive', true),
        agents: _.get(options, 'requester.agents'), // http(s).Agent instances
        cookieJar: _.get(options, 'requester.cookieJar'), // default set later in this constructor
        disableCookies: _.get(options, 'requester.disableCookies', false),
        strictSSL: _.get(options, 'requester.strictSSL'),
        maxResponseSize: _.get(options, 'requester.maxResponseSize'),
        protocolVersion: _.get(options, 'requester.protocolVersion'),
        agentIdleTimeout: _.get(options, 'requester.agentIdleTimeout', 60 * 1000), // 60 seconds
        // @todo drop support in v8
        useWhatWGUrlParser: _.get(options, 'requester.useWhatWGUrlParser', false),
        insecureHTTPParser: _.get(options, 'requester.insecureHTTPParser'),
        followRedirects: _.get(options, 'requester.followRedirects', true),
        followOriginalHttpMethod: _.get(options, 'requester.followOriginalHttpMethod'),
        maxRedirects: _.get(options, 'requester.maxRedirects'),
        implicitCacheControl: _.get(options, 'requester.implicitCacheControl', true),
        implicitTraceHeader: _.get(options, 'requester.implicitTraceHeader', true),
        systemHeaders: _.get(options, 'requester.systemHeaders', {}),
        removeRefererHeaderOnRedirect: _.get(options, 'requester.removeRefererHeaderOnRedirect'),
        ignoreProxyEnvironmentVariables: _.get(options, 'ignoreProxyEnvironmentVariables'),
        network: _.get(options, 'network', {}),
        maxHeaderSize: _.get(options, 'requester.maxHeaderSize', 131072), // 128KB
        sslKeyLogFile: _.get(options, 'requester.sslKeyLogFile')
    });

    // create a cookie jar if one is not provided
    if (!self.options.cookieJar) {
        self.options.cookieJar = RequestCookieJar();
    }

    if (fileResolver && typeof fileResolver.readFile === FUNCTION &&
        typeof (extendedRootCA = _.get(options, 'requester.extendedRootCA')) === STRING) {
        // eslint-disable-next-line security/detect-non-literal-fs-filename
        fileResolver.readFile(extendedRootCA, function (err, caCerts) {
            if (err) {
                // @todo trigger console error
            }
            else {
                // set extendedRootCA option
                self.options.extendedRootCA = caCerts;
            }

            return callback();
        });
    }
    else {
        return callback();
    }
};

RequesterPool.prototype.create = function (trace, callback) {
    var options = this.options;

    // Per-partition cookie jar override (set by http-request.command via
    // Run#getCookieJarFor in perPartitionCookieJar mode). Shallow-merge
    // into a copy — the pool's shared options object must never be
    // mutated per request. The jar reference is frozen here, at requester
    // creation: a request in flight when its partition is recycled keeps
    // writing to the old (dead) jar instead of the recycled partition's
    // fresh one.
    if (trace && trace.cookieJar) {
        options = _.defaults({ cookieJar: trace.cookieJar }, options);
    }

    return Requester.create(trace, options, callback);
};

module.exports.RequesterPool = RequesterPool;
