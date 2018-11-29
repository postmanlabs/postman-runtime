var _ = require('lodash'),
    Requester = require('./requester').Requester,
    RequestCookieJar = require('postman-request').jar,
    RequesterPool; // fn

RequesterPool = function (options) {
    _.assign((this.options = {}), {
        timeout: _.min([
            _.get(options, 'timeout.request'),
            _.get(options, 'timeout.global')
        ]), // validated later inside requester
        keepAlive: _.get(options, 'requester.keepAlive', true),
        cookieJar: _.get(options, 'requester.cookieJar'), // default set later in this constructor
        strictSSL: _.get(options, 'requester.strictSSL'),
        followRedirects: _.get(options, 'requester.followRedirects', true),
        followOriginalHttpMethod: _.get(options, 'requester.followOriginalHttpMethod'),
        maxRedirects: _.get(options, 'requester.maxRedirects'),
        removeRefererHeaderOnRedirect: _.get(options, 'requester.removeRefererHeaderOnRedirect'),
        network: _.get(options, 'network', {})
    });

    // create a cookie jar if one is not provided
    if (!this.options.cookieJar) {
        this.options.cookieJar = RequestCookieJar();
    }
};

RequesterPool.prototype.create = function (trace, callback) {
    return Requester.create(trace, this.options, callback);
};

module.exports.RequesterPool = RequesterPool;
