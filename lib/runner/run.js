var _ = require('lodash'),
    async = require('async'),

    util = require('./util'),
    backpack = require('../backpack'),
    Instruction = require('./instruction'),
    Run; // constructor

Run = function PostmanCollectionRun (state, options) {
    _.extend(this, /** @lends Run.prototype */ {
        /**
         * @private
         * @type {Object}
         * @todo: state also holds the host for now (if any).
         */
        state: _.extend({}, state),
        /**
         * @private
         * @type {InstructionPool}
         */
        pool: Instruction.pool(Run.commands),
        /**
         * @private
         * @type {Object}
         */
        stack: {},
        /**
         * @private
         * @type {Object}
         */
        options: options || {}
    });
};

_.extend(Run.prototype, {
    /**
     * @param {String} action
     * @param {Object} [payload]
     * @param {*} [args...]
     */
    queue: function (action, payload) {
        // extract the arguments that are to be forwarded to the processor
        return this._schedule(action, payload, _.slice(arguments, 2), false);
    },

    /**
     * @param {String} action
     * @param {Object} [payload]
     * @param {*} [args...]
     */
    interrupt: function (action, payload) {
        // extract the arguments that are to be forwarded to the processor
        return this._schedule(action, payload, _.slice(arguments, 2), true);
    },

    /**
     * @param {Function|Object} callback
     */
    start: function (callback) {
        // @todo add `when` parameter to backpack.normalise
        callback = backpack.normalise(callback, Object.keys(Run.triggers));

        // cannot start run if it is already running
        if (this.triggers) {
            return callback(new Error('run: already running'));
        }

        _.isFinite(_.get(this.options, 'timeout.global')) &&
            backpack.timeback(callback, this.options.timeout.global, this, function () {
                this.pool.clear();
            });

        // invoke all the initialiser functions one after another and if it has any error then abort with callback.
        async.series(_.map(Run.initialisers, function (initializer) {
            return initializer.bind(this);
        }.bind(this)), function (err) {
            if (err) { return callback(err); }

            // save the normalised callbacks as triggers
            this.triggers = callback;
            this.triggers.start(null, this.state.cursor.current()); // @todo may throw error if cursor absent
            this._process(callback);
        }.bind(this));
    },

    /**
     * @private
     *
     * @param {String} action
     * @param {Object} [payload]
     * @param {Array} [args]
     * @param {Boolean} [immediate]
     */
    _schedule: function (action, payload, args, immediate) {
        var instruction = this.pool.create(action, payload, args);
        // based on whether the immediate flag is set, add to the top or bottom of the instruction queue.
        return (this.pool[immediate ? 'unshift' : 'push'](instruction), instruction);
    },

    _process: function (callback) {
        // extract the command from the queue
        var instruction = this.pool.shift();

        // if there is nothing to process, exit
        if (!instruction) {
            this._traceEnd(); // end the trace before exiting function
            return callback(null, this.state.cursor.current());
        }

        // ensure that the trace is started
        this._trace(instruction);
        instruction.execute(function (err) {
            if (err) {
                this._traceEnd(err);
                return callback(err, this.state.cursor.current());
            }

            this._process(callback); // process recursively if stop is not called
        }, this);
    },

    _trace: function () {},
    _traceEnd: function () {
        delete this.triggers;
    }
});

_.extend(Run, {
    /**
     * Stores all events that runner triggers
     *
     * @type {Object}
     */
    triggers: {
        start: true
    },

    /**
     * stores all execution commands
     * @enum {Function}
     *
     * @note commands are loaded by flattening the modules in the `./commands` directory
     */
    commands: {},

    /**
     * Functions executed with commands on start
     * @type {Array}
     */
    initialisers: []
});

// commands are loaded by flattening the modules in the `./commands` directory
Run.commands = _.transform({
    'control.command': require('./extensions/control.command'),
    'event.command': require('./extensions/event.command'),
    'request.command': require('./extensions/request.command'),
    'waterfall.command': require('./extensions/waterfall.command'),
    'item.command': require('./extensions/item.command'),
    'delay.command': require('./extensions/delay.command')
}, function (all, extension) {
    // extract the prototype from the command interface
    _.has(extension, 'prototype') && _.forOwn(extension.prototype, function (value, prop) {
        if (Run.prototype.hasOwnProperty(prop)) {
            throw new Error('run: duplicate command prototype extension ' + prop);
        }
        Run.prototype[prop] = value;
    });

    // put the triggers in a box
    _.has(extension, 'triggers') && _.isArray(extension.triggers) && _.each(extension.triggers, function (name) {
        name && (Run.triggers[name] = true);
    });

    // we add the processors to the processor list
    _.has(extension, 'process') && _.forOwn(extension.process, function (command, name) {
        if (!_.isFunction(command)) { return; }
        if (all.hasOwnProperty(name)) {
            throw new Error('run: duplicate command processor ' + name);
        }
        // finally add the command function to the accumulator
        all[name] = command;
    });

    // add the initialisation functions
    _.has(extension, 'init') && _.isFunction(extension.init) && Run.initialisers.push(extension.init);
});

module.exports = Run;
