var _ = require('lodash'),
    vm = require('vm'),
    backpack = require('../../lib/backpack'),
    uuid = require('node-uuid'),
    Scope = require('./scope').Scope,
    libraries = require('./libraries'),
    PostmanApi = require('./postman-api').PostmanApi,

    NodeHost, // constructor

    /**
     * Default replacements for the sandbox.
     *
     * @todo move this to a more appropriate place
     * @todo we should keep track of set Timeouts and set Intervals, and then clear those before exiting.
     *
     * @param id
     * @param options
     * @param events {Object}
     * @returns {Object}
     */
    replacements = function (id, options, events) {
        return {
            setTimeout: function (fn, ms) {
                return setTimeout(function () {
                    try { return fn.apply(this, arguments); }
                    catch (e) {
                        events.exception(e);
                    }
                }, ms);
            },

            setInterval: function (fn, ms) {
                return setInterval(function () {
                    try { return fn.apply(this, arguments); }
                    catch (e) {
                        events.exception(e);
                    }
                }, ms);
            },

            XMLHttpRequest: function FakeXmlHTTPRequest () { return this; },

            console: (function (cursor) {
                return {
                    log: events.console.bind(events, cursor, 'log'),
                    info: events.console.bind(events, cursor, 'info'),
                    warn: events.console.bind(events, cursor, 'warn'),
                    error: events.console.bind(events, cursor, 'error'),
                    debug: events.console.bind(events, cursor, 'debug')
                };
            }(options.masked && options.masked.cursor || {}))
        };
    };

/**
 * A host instance is like a VM container that can execute scripts in a sandboxed environment.
 *
 * @param {Object} sandbox - an object that is available to the global scope of this host and is constantly updated with
 * changes when done from inside a running script
 *
 * @param {Object} options
 * @param {Array.<String>} options.requires - a set of libraries that are required and is made available to sandbox as
 * globals.
 * @param {Object.<Function>} options.on - events that are triggered when stuff happens inside the sandbox
 * @param {Function=} [options.on.execute]
 * @param {Function=} [options.on.timeout]
 * @param {Function=} [options.on.error]
 * @param {Function=} [options.on.exception]
 * @param {Function} callback - executed when the host is ready to execute scripts
 */
NodeHost = function (sandbox, options, callback) {
    // account for polymorphic nature of options and callback
    if ((callback === undefined) && _.isFunction(options)) {
        callback = options;
        options = null;
    }

    if (!_.isFunction(callback)) { // be strict with the callback
        throw new Error('uvm.constructor() callback parameter missing.');
    }

    options = _.isObject(options) ? _.clone(options) : {};

    _.extend(this, {
        /**
         * @private
         * @type {Object.<Function>}
         */
        on: _.isObject(options.on) ? _.clone(options.on) : {},

        /**
         * @type {String}
         */
        id: uuid.v4(),

        /**
         * @private
         * @type {Array<String>}
         */
        requires: options.requires || []
    });

    callback(null, this);
};

_.extend(NodeHost.prototype, /** @lends NodeHost.prototype */ {

    /**
     * Executes the code, with the given options.
     *
     * @param code {String}
     * @param options {Object}
     * @param options.async {Boolean} If true, the code is treated as asynchronous.
     * @param options.timeout {Boolean} If async, the code can have a timeout as well.
     *                                  (ignored if `options.async` is falsy)
     * @param {Object=} [options.masked]
     * @param options.globals {Boolean} Any globals that need to be passed to the test script.
     * @param callback
     */
    execute: function (code, options, callback) {
        !_.isObject(options) && (options = {});
        var scope,
            errors = [], // todo: fix this the right way
            complete = function () {
                // ensure that the updated globals are pushed back to the event
                if (options.globals) {
                    Object.keys(options.globals).forEach(function (key) {
                        options.globals[key] = scope.object[key];
                    });
                }
                callback(errors.length ? errors[0] : null, options);
            };

        if (!_.isFunction(callback)) {
            throw new Error('uvm.execute() callback parameter is required');
        }

        if (options.async && options.timeout) {
            callback = backpack.timeback(callback, options.timeout, this);
        }

        scope = new Scope();

        // Inject the globals
        _.forOwn(options.globals, function (value, key) {
            scope.replace(key, value);
        });

        // Inject the Postman API
        scope.replace('postman', new PostmanApi(options.masked, options.globals));

        // Inject the libraries
        // @todo - put a warning here when debug logging comes in place
        this.requires.forEach(function (libName) {
            var lib = libraries.requires[libName];
            lib && scope.replace(lib.object, lib.value);
        });

        // Inject scope replacements
        _.forOwn(replacements(this.id, options, this.on), function (value, key) {
            scope.replace(key, value);
        });

        // Handle the "done" callback
        options.async && scope.replace('done', complete);

        // set the start time for execution. required for calculating execution time later
        options.start = Date.now();
        this._run(code, scope, options, errors);

        if (!options.async) {
            // Tests were run synchronously :-O
            complete();
        }
    },

    /**
     * @private
     * @param {String} event
     */
    trigger: function (event) {
        throw new Error('Not implemented: Node Host does not support triggering of event ' + event);
    },

    /**
     * Disposes a NodeHost instance. No-op for now, but once we start using processes, it'll be used to
     * stop the child process and perform other cleanups.
     */
    dispose: function () { return false; },

    /**
     * Runs code. Simple. Sweet. Awesome.
     *
     * @param code {String}
     * @param scope {Scope}
     * @param options
     * @param errors
     * @param options.timeout {Number} Number of milliseconds
     * @private
     */
    _run: function (code, scope, options, errors) {
        var toRun = NodeHost.code(),
            runOptions = {};

        _.has(options, 'timeout') && (runOptions.timeout = options.timeout);

        try {
            vm.runInContext(toRun, _.extend(vm.createContext(), {
                scope: scope,
                code: code,
                on: this.on,
                errors: errors
            }), runOptions);
        }
        catch (e) {
            this.on.exception(e);
        }
    }
});

_.extend(NodeHost, /** @lends NodeHost */ {
    code: function () {
        // @todo: debt
        return '(function(universe) {' +
            // Run SugarJS in its own closure.
            '    (function () {' + libraries.sugarjs + '})();' +
            '    var sandboxedCode;' +
            // try and create an execution function of the code
            '    try {' +
            // add the code to the global definition
            '        scope.globals.push(code);' +
            '        sandboxedCode = Function.apply(universe, scope.globals);' +
            '    }' +
            '    catch (e) {' +
            '        universe.errors.push(e);' +
            '        return;' +
            '    }' +

            '    try {' +
            '        sandboxedCode.apply(scope.object, scope.transferables);' +
            '    }' +
            '    catch (e) {' +
            '        universe.errors.push(e);' +
            '    }' +
            '}(this));';
    }
});


module.exports = NodeHost;
