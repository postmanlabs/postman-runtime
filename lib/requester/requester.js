var requests = require('request'),
    util = require('./util'),
    _ = require('lodash'),
    httpCodes = require('./http-codes'),

    /**
     * Creates a new Requester, which is used to make HTTP(s) requests.
     *
     * @param options
     * @param {Boolean} [options.keepAlive=true] Optimizes HTTP connections by keeping them alive, so that new requests
     * to the same host are made over the same underlying TCP connection.
     * @param {CookieJar} [options.cookieJar] A cookie jar to use with Node requests.
     * @param {FileResolver} {options.fileResolver} An object that provides a function called
     * `createReadStream` which is called when uploading files.
     * @param {Boolean} [options.strictSSL]
     * @param {Boolean} [options.followRedirects=true] If false, returns a 301/302 as the response code instead of following the redirect
     * @note `options.keepAlive` is only supported in Node.
     * @note `options.cookieJar` is only supported in Node.
     * @constructor
     */
    Requester = function (options) {
        this.keepAlive = _.get(options, 'keepAlive') === undefined ? true : options.keepAlive;
        this.cookieJar = _.get(options, 'cookieJar');
        this.timeout = _.has(options, 'timeout') ? options.timeout : undefined;
        this.fileResolver = _.get(options, 'fileResolver');
        this.strictSSL = _.get(options, 'strictSSL');
        this.followRedirects = _.has(options, 'followRedirects') ? options.followRedirects : true;
    };

/**
 * Perform an HTTP request.
 *
 * @param item
 * @param cb
 * @param scope
 */
Requester.prototype.request = function (item, cb, scope) {
    var request = item.request,
        requestOptions = util.getRequestOptions(request, {
            keepAlive: this.keepAlive,
            cookieJar: this.cookieJar,
            timeout: this.timeout,
            fileResolver: this.fileResolver,
            strictSSL: this.strictSSL,
            followRedirects: this.followRedirects
        }),
        startTime = Date.now();

    requests(requestOptions, function (err, res, resBody) {
        if (err) {
            return cb.call(scope || this, err);
        }

        var responseString = (resBody != null && resBody.toString) ? resBody.toString() : resBody;
        if (responseString === '[object ArrayBuffer]') {
            responseString = util.arrayBufferToString(resBody);
        }

        var responseTime = Date.now() - startTime,
            responseJSON = util.jsonifyResponse(res, requestOptions, responseString),
            actualRequest = _.extend(responseJSON.request, {
                id: item.id,
                name: item.name,
                description: item.request.description ? item.request.description.toString() : undefined
            }),
            response = {
                responseBody: responseString,
                responseHeaders: responseJSON.headers,
                responseTime: responseTime,
                responseCode: {
                    code: responseJSON.statusCode,
                    name: httpCodes[responseJSON.statusCode] ? httpCodes[responseJSON.statusCode].name : '',
                    detail: httpCodes[responseJSON.statusCode] ? httpCodes[responseJSON.statusCode].detail: ''
                }
            },
            responseObj = { // @todo get rid of jsonifyResponse
                code: response.responseCode.code,
                header: response.responseHeaders,
                body: responseString,
                stream: resBody,
                cookie: undefined, // @todo get from cookieJar and implement loading/unloading in SDK
                responseTime: responseTime
            };

        cb.call(scope || this, null, response, actualRequest, responseObj, request);
    });
};

module.exports.Requester = Requester;
