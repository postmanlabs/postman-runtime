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
        strictSSL: _.get(options, 'requester.strictSSL'),
        maxResponseSize: _.get(options, 'requester.maxResponseSize'),
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
        network: _.get(options, 'network', {})
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
    return Requester.create(trace, this.options, callback);
};

module.exports.RequesterPool = RequesterPool;
