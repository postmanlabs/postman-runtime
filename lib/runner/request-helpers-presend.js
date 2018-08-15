var _ = require('lodash'),
    async = require('async'),
    util = require('./util'),
    sdk = require('postman-collection'),

    createAuthInterface = require('../authorizer/auth-interface'),
    AuthLoader = require('../authorizer/index').AuthLoader,
    ReplayController = require('./replay-controller'),

    DOT_AUTH = '.auth';

module.exports = [
    // Authorization
    function (context, run, done) {
        // validate all stuff. dont ask.
        if (!context.item) { return done(new Error('runtime: nothing to authorize.')); }

        // bail out if there is no auth
        if (!(context.auth && context.auth.type)) { return done(null); }

        // get auth handler
        var auth = context.auth,
            authType = auth.type,
            originalAuth = context.originalItem.getAuth(),
            originalAuthParams = originalAuth && originalAuth.parameters(),
            authHandler = AuthLoader.getHandler(authType),
            authPreHook,
            authInterface,
            authSignHook = function () {
                try {
                    authHandler.sign(authInterface, context.item.request, function (err) {
                        // handle all types of errors in one place, see catch block
                        if (err) { throw err; }

                        done();
                    });
                }
                catch (err) {
                    // handles synchronous and asynchronous errors in auth.sign
                    run.triggers.console(context.coords,
                        'warn',
                        'runtime~' + authType + '.auth: could not sign the request: ' + (err.message || err),
                        err
                    );

                    // swallow the error, we've warned the user
                    done();
                }
            };

        // bail out if there is no matching auth handler for the type
        if (!authHandler) {
            run.triggers.console(context.coords, 'warn', 'runtime: could not find a handler for auth: ' + auth.type);
            return done();
        }

        authInterface = createAuthInterface(auth);

        /**
         * We go through the `pre` request send validation for the auth. In this step one of the three things can happen
         *
         * If the Auth `pre` hook
         * 1. gives a go, we sign the request and proceed to send the request.
         * 2. gives a no go, we don't sign the request, but proceed to send the request.
         * 3. gives a no go, with a intermediate request,
         *      a. we suspend current request, send the intermediate request
         *      b. invoke Auth `init` hook with the response of the intermediate request
         *      c. invoke Auth `pre` hook, and repeat from 1
         */
        authPreHook = function () {
            authHandler.pre(authInterface, function (err, success, request) {
                // there was an error in pre hook of auth
                if (err) {
                    // warn the user
                    run.triggers.console(context.coords,
                        'warn',
                        'runtime~' + authType + '.auth: could not validate the request: ' + (err.message || err),
                        err
                    );

                    // swallow the error, we've warned the user
                    return done();
                }

                // sync all auth system parameters to the original auth
                originalAuthParams && auth.parameters().each(function (param) {
                    param && param.system &&
                        originalAuthParams.upsert({key: param.key, value: param.value, system: true});
                });

                // authHandler gave a go, sign the request
                if (success) { return authSignHook(); }

                // auth gave a no go, but no intermediate request
                if (!request) { return done(); }

                // prepare for sending intermediate request
                var replayController = new ReplayController(context.replayState, run),
                    item = new sdk.Item({request: request});

                // auth handler gave a no go, and an intermediate request.
                // make the intermediate request the response is passed to `init` hook
                replayController.requestReplay(context,
                    item,
                    // marks the auth as source for intermediate request
                    {source: auth.type + DOT_AUTH},
                    function (err, response) {
                        // errors for intermediate requests are passed to request callback
                        // passing it here will add it to original request as well, so don't do it
                        if (err) { return done(); }

                        // pass the response to Auth `init` hook
                        authHandler.init(authInterface, response, function (error) {
                            if (error) {
                                // warn about the err
                                run.triggers.console(context.coords, 'warn', 'runtime~' + authType + '.auth: ' +
                                    'could not initialize auth: ' + (error.message || error), error);

                                // swallow the error, we've warned the user
                                return done();
                            }

                            // schedule back to pre hook
                            authPreHook();
                        });
                    },
                    function (err) {
                        // warn users that maximum retries have exceeded
                        if (err) {
                            run.triggers.console(
                                context.coords, 'warn', 'runtime~' + authType + '.auth: ' + (err.message || err)
                            );
                        }
                        // but don't bubble up the error with the request
                        done();
                    }
                );
            });
        };

        // start the by calling the pre hook of the auth
        authPreHook();
    },

    // File loading
    function (context, run, done) {
        if (!context.item) { return done(new Error('Nothing to resolve files for.')); }

        var triggers = run.triggers,
            cursor = context.coords,
            resolver,
            request,
            mode,
            data;

        resolver = run.options.fileResolver;

        request = context.item.request;

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
                async.eachSeries(_.filter(formdata.all(), {type: 'file'}), function (formparam, callback) {
                    if (!formparam || formparam.disabled) {
                        return callback(); // disabled params will be filtered in body-builder.
                    }

                    util.createReadStream(resolver, formparam.src, function (err, stream) {
                        if (err) {
                            triggers.console(cursor, 'warn',
                                `Form param \`${formparam.key}\`, file load error: ${err.message || err}`);
                            formparam.disabled = true; // set disabled, it will be filtered in body-builder.
                        }
                        else {
                            formparam.value = stream;
                        }
                        callback();
                    });
                }, next);
            },
            // file data
            file: function (filedata, next) {
                util.createReadStream(resolver, filedata.src, function(err, stream) {
                    if (err) {
                        triggers.console(cursor, 'warn', 'Binary file load error: ' + err.message || err);
                        filedata.value = null; // ensure this does not mess with requester
                        delete filedata.content; // @todo - why content?
                    }
                    else {
                        filedata.content = stream;
                    }
                    next();
                });
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
    function (context, run, done) {
        var proxies = run.options.proxies,
            request = context.item.request,

            url;

        if (!request) { return done(new Error('No request to resolve proxy for.')); }

        url = request.url && request.url.toString();

        async.waterfall([
            // try resolving custom proxies before falling-back to system proxy
            function (cb) {
                if (_.isFunction(_.get(proxies, 'resolve'))) {
                    return cb(null, proxies.resolve(url));
                }
                return cb(null, undefined);
            },
            // fallback to system proxy
            function (config, cb) {
                if (config) {
                    return cb(null, config);
                }
                return _.isFunction(run.options.systemProxy) ? run.options.systemProxy(url, cb) : cb(null, undefined);
            }
        ], function (err, config) {
            if (err) {
                run.triggers.console(context.coords, 'warn', 'proxy lookup error: ' + (err.message || err));
            }

            config && (request.proxy = sdk.ProxyConfig.isProxyConfig(config) ? config : new sdk.ProxyConfig(config));
            return done();
        });
    },
    // Certificate lookup + reading from whichever file resolver is provided
    function (context, run, done) {
        var request,
            keyPath,
            certPath,
            fileResolver,

            certificate;

        // A. Check if we have the file resolver
        fileResolver = run.options.fileResolver;

        if (!fileResolver) { return done(); } // No point going ahead

        // B. Ensure we have the request
        request = _.get(context.item, 'request');
        if (!request) { return done(new Error('No request to resolve certificates for.')); }

        // C. See if any cert should be sent, by performing a URL matching
        certificate = run.options.certificates && run.options.certificates.resolveOne(request.url);
        if (!certificate) { return done(); }

        // D. Fetch the paths
        // @todo: check why aren't we reading ca file (why are we not supporting ca file)
        keyPath = _.get(certificate, 'key.src');
        certPath = _.get(certificate, 'cert.src');

        // E. Read from the path, and add the values to the certificate, also associate
        // the certificate with the current request.
        async.mapValues({
            key: keyPath,
            cert: certPath
        }, function (value, key, next) {
            fileResolver.readFile(value, function (err, data) {
                // Swallow the error after triggering a warning message for the user.
                err && run.triggers.console(context.coords, 'warn',
                    `certificate "${key}" load error:  ${(err.message || err)}`);
                next(null, data);
            });
        }, function (err, fileContents) {
            if (err) {
                // Swallow the error after triggering a warning message for the user.
                run.triggers.console(context.coords, 'warn', 'certificate load error: ' + (err.message || err));
                return done();
            }

            if (fileContents) {
                !_.isNil(fileContents.key) && _.set(certificate, 'key.value', fileContents.key);
                !_.isNil(fileContents.cert) && _.set(certificate, 'cert.value', fileContents.cert);

                (fileContents.cert || fileContents.key) && (request.certificate = certificate);
            }
            done();
        });
    }
];
