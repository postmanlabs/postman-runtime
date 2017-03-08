var _ = require('lodash'),
    async = require('async'),
    sdk = require('postman-collection');

module.exports = [
    // Variable resolution
    function (payload, done) {
        if (!payload.item) { return done(new Error('Nothing to resolve variables for.')); }

        payload.unresolved = payload.item;
        // @todo - resolve variables in a more graceful way
        // @todo - no need to sync vatiables when SDK starts supporting resolution from scope directly
        payload.item = new sdk.Item(payload.item.toObjectResolved(null,
            [payload.data, payload.environment.syncVariablesTo({}), payload.globals.syncVariablesTo({})]));
        // todo: call before variable resolution triggers on the run object
        done();
    },

    // Authorization
    function (payload, done) {
        if (!payload.item) { return done(new Error('Nothing to authorize.')); }

        var item = payload.item;
        // Re-parse the URL, because variables have been resolved now, and things might be moved around
        item.request.url = new (sdk.Url)(item.request.url.toString());

        // perform the actual signature additions etc
        item.request = item.request.authorize();
        done();
    },

    // File loading
    function (payload, done) {
        if (!payload.item) { return done(new Error('Nothing to resolve files for.')); }

        var triggers = this.triggers,
            cursor = payload.coords,
            sourceReadable,
            resolver,
            request,
            mode,
            data;

        resolver = _.get(this.options, 'fileResolver') ||
            // todo: remove this once apps give the options correctly
            _.get(this.options, 'requester.fileResolver');

        // this has changed a bit from the old implementation, a bug is fixed.
        sourceReadable = resolver && _.isFunction(resolver.createReadStream);

        request = _.get(payload, 'item.request');

        if (!request) { return done(new Error('No request to send.')); }

        // todo: add helper functions in the sdk to do this cleanly for us
        mode = _.get(request, 'body.mode');
        data = _.get(request, ['body', mode]);

        // if there is no mode specified, or no data for the specified mode we cannot resolve anything!
        // @note that if source is not readable, there is no point reading anything, yet we need to warn that file
        // upload was not done. hence we will have to proceed even without an unreadable source
        if (!data) { // we do not need to check `mode` here since false mode returns no `data`
            return done();
        }

        // in this block, we simply use async.waterfall to ensure that all form of file reading is async. essentially,
        // we first determine the data mode and based on it pass the waterfall functions.
        async.waterfall([async.constant(data), {
            // form data parsing simply "enriches" all form parameters having file data type by replacing / setting the
            // value as a read stream
            formdata: function (formdata, next) {
                // ensure that we only process the file type
                async.eachSeries(_.filter(formdata.all(), {type: 'file'}), function (formparam, next) {
                    var stream;

                    try {
                        sourceReadable && formparam.src && (stream = resolver.createReadStream(formparam.src));
                    }
                        // eslint-disable-next-line no-empty
                    catch (e) { } // we do not need to forward error here since next line we throw warning

                    if (!stream) { // lack of stream also determines lack of `formparam.src` and source being readable
                        triggers.console(cursor, 'warn', 'unable to load form file for upload: "' + formparam.src + '"');
                        // @todo - do enabled: false instead of removing it
                        formdata.remove(formparam); // remove from list since it will interfere with requester
                    }
                    // otherwise, replace the value with stream for making it usable in requester
                    else {
                        formparam.value = stream;
                    }
                    next();
                }, next);
            },
            // file data
            file: function (filedata, next) {
                var stream;

                try {
                    sourceReadable && filedata.src && (stream = resolver.createReadStream(filedata.src));
                }
                    // eslint-disable-next-line no-empty
                catch (e) { }

                if (!stream) {
                    triggers.console(cursor, 'warn', 'unable to load raw file for upload: "' + filedata.src + '"');
                    filedata.value = null; // ensure this does not mess with requester
                    delete filedata.content; // @todo - why content?
                }
                // stream is valid, so replace the value in data
                else {
                    // @todo: why is this not `value` like formdata. it would have made it easy to pass through
                    // a common logic
                    filedata.content = stream;
                }

                next();
            }
        }[mode] || async.constant()], function (err) {
            // just as a precaution, show the error in console. each resolver anyway should handle their own console
            // warnings.
            // @todo - get cursor here.
            err && triggers.console(cursor, 'warn', 'file data resolution error: ' + (err.message || err));
            done(null); // absorb the error since a console has been trigerred
        });
    },
    // Proxy lookup
    function (payload, done) {
        var request = _.get(payload, 'item.request'),
            url,
            proxies,
            proxyConfig;

        if (!request) { return done(new Error('No request to resolve proxy for.')); }

        url = request.url && request.url.toString();
        proxies = this.options.proxies;

        if (_.isFunction(_.get(proxies, 'resolve'))) {
            proxyConfig = proxies.resolve(url);
            proxyConfig && (request.proxy = proxyConfig);
        }
        done();
    },
    // Certificate lookup + reading from whichever file resolver is provided
    function (payload, done) {
        var keyPath,
            certPath,
            request,
            fileResolver,

            certificate;

        // A. Check if we have the file resolver
        fileResolver = _.get(this.options, 'fileResolver') ||
            // todo: remove this once apps give the options correctly
            _.get(this.options, 'requester.fileResolver');

        if (!fileResolver) { return done(); }  // No point going ahead

        // B. Ensure we have the request
        request = _.get(payload, 'item.request');
        if (!request) { return done(new Error('No request to resolve proxy for.')); }

        // C. See if any cert should be sent, by performing a URL matching
        certificate = this.options.certificates && this.options.certificates.resolveOne(request.url);
        if (!certificate) { return done(); }

        // D. Fetch the paths
        keyPath = _.get(certificate, 'key.src');
        certPath = _.get(certificate, 'cert.src');

        // E. Read from the path, and add the values to the certificate, also associate
        // the certificate with the current request.
        async.mapValues({
            key: keyPath,
            cert: certPath
        }, function (value, key, cb) {
            fileResolver.readFile(value, cb);
        }, function (err, fileContents) {
            if (err) { return done(err); }

            _.set(certificate, 'key.value', fileContents.key);
            _.set(certificate, 'cert.value', fileContents.cert);

            request.certificate = certificate;
            done();
        });
    }
];
