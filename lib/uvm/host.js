var _ = require('lodash'),
    vm = require('vm'),
    fs = require('fs'),
    joinPath = require('path').join,
    backpack = require('../../lib/backpack'),
    uuid = require('node-uuid'),
    requireCache = require('./vm-require'),
    libraries = require('./libraries'),

    sandboxClientCode = {
        scope: fs.readFileSync(joinPath(__dirname, 'scope.js')),
        postman: fs.readFileSync(joinPath(__dirname, 'postman-api.js')),
        execute: fs.readFileSync(joinPath(__dirname, 'vm-execute.js'))
    },

    NodeHost; // constructor

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
        var errors = [], // todo: fix this the right way
            complete = function (scope) {
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

        // set the start time for execution. required for calculating execution time later
        options.start = Date.now();
        options.done = complete;
        this._run(code, options, errors);
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
    _run: function (code, options, errors) {
        var toRun = NodeHost.code(),
            runOptions = {};

        _.has(options, 'timeout') && (runOptions.timeout = options.timeout);

        try {
            vm.runInContext(toRun, _.extend(vm.createContext(), {
                code: code,
                __sugarjs: libraries.sugarjs,
                __masked: options.masked,
                __globals: options.globals,
                __require: requireCache,
                __async: options.async,
                __done: options.done,
                // These objects are removed from the cache before running user code
                __delete: [
                    '__masked',
                    '__require',
                    '__cursor'
                ],
                requires: libraries.requires,
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
        return sandboxClientCode.scope + sandboxClientCode.postman + sandboxClientCode.execute;
    }
});


module.exports = NodeHost;
