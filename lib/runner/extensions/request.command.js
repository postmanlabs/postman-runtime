var _ = require('lodash'),
    async = require('async'),
    sdk = require('postman-collection'),
    Requester = require('../../requester').Requester,

    /**
     * Takes a list for Form-data parameters, and "resolve"s them.
     *
     * @param request
     * @param resolver
     * @param triggers
     * @param {Function} triggers.exception
     * @param callback
     */
    resolveFiles = function (request, resolver, triggers, cursor, callback) {
        var mode = _.get(request, 'body.mode'),
            sourceReadable = _.isFunction(resolver && resolver.createReadStream),
            data = mode && _.get(request, 'body.' + mode);

        // if there is no mode specified, or no data for the specified mode we cannot resolve anything!
        // @note that if source is not readable, there is no point reading anything, yet we need to warn that file
        // upload was not done. hence we will have to proceed even without an unreadable source
        if (!data) { // we do not need to check `mode` here since false mode returns no `data`
            return callback(null, request);
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
                        // @todo - get cursor here.
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
            err && triggers.console({}, 'warn', 'file data resolution error: ' + (err.message || err));
            callback(null, request); // absorb the error since a console has been trigerred
        });
    };

module.exports = {
    init: function (done) {
        var timeout = _.min([
            _.get(this.options, 'timeout.request'),
            _.get(this.options, 'timeout.global')
        ]);


        // @todo - remove this when requester creation is offloaded to runner
        if (this.options.requester && this.options.requester.external === true) {
            this.requester = this.options.requester.instance;
            // Just so we don't break the App, pull the file resolver out of the requester
            this.options.fileResolver = _.get(this.requester, 'fileResolver');
            return done();
        }

        !_.isFinite(timeout) && (timeout = undefined);

        // @todo: get requester options and maybe store per-protocol requester
        !this.requester && (this.requester = new Requester(_.merge(this.options.requester, {
            timeout: timeout || undefined
        })));

        done();
    },

    triggers: ['beforeRequest', 'request'],

    process: {
        /**
         * @param {Object} payload
         * @param {Item} payload.item
         * @param {Object} payload.data
         * @param {Object} payload.globals
         * @param {Object} payload.environment
         * @param {Cursor} payload.coords
         * @param {Function} next
         *
         * @todo  validate payload
         */
        request: function (payload, next) {
            // @todo - resolve variables in a more graceful way
            var item = new sdk.Item(payload.item.toObjectResolved(null,
                [payload.data, payload.environment, payload.globals])),

                abortOnError = _.has(payload, 'abortOnError') ? payload.abortOnError : this.options.abortOnError,
                self = this;

            async.waterfall([
                // Process any authentication helpers in the request.
                function (cb) {
                    // Re-parse the URL, because variables have been resolved now, and things might be moved around
                    item.request.url = new (sdk.Url)(item.request.url.toString());
                    cb(null, item.request.authorize());
                },
                // Handle file resolution
                function (request, cb) {
                    var resolver = _.get(self.options, 'fileResolver') ||
                        // todo: remove this once apps give the options correctly
                        _.get(self.options, 'requester.fileResolver');
                    resolveFiles(request, resolver, self.triggers, payload.coords, cb);
                },
                // Send the request
                function (request, cb) {
                    var xhr,
                        aborted;

                    item.request = request;

                    // Trigger the beforeRequest callback
                    self.triggers.beforeRequest(null, payload.coords, item.request, payload.item, {
                        abort: function () {
                            !aborted && xhr && xhr.abort();
                            aborted = true;
                        }
                    });

                    if (aborted) {
                        return cb(new Error('runtime: request aborted'));
                    }

                    xhr = self.requester.request(item, cb, self);
                }
            ], function (err, legacyResponse, legacyRequest, response) {
                err = err || null;

                this.triggers.request(err, payload.coords, new sdk.Response(response),
                    item.request, payload.item,
                    // todo: remove these asap
                    legacyResponse, legacyRequest);

                next((err && abortOnError) ? err : null, {
                    response: response,
                    request: item.request,
                    legacyResponse: legacyResponse,
                    legacyRequest: legacyRequest
                }, err);
            }.bind(this));
        }
    }
};
