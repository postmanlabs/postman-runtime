var _ = require('lodash'),
    async = require('async'),
    backpack = require('../backpack'),
    Cursor = require('./cursor'),
    Instruction = require('./instruction'),

    Run; // constructor

/**
 * The run object is the primary way to interact with a run in progress. It allows controlling the run (pausing,
 * starting, etc) and holds references to the helpers, such as requesters and authorizer.
 *
 * @param state
 * @param options
 *
 * @property {Requester} requester
 * @constructor
 */
Run = function PostmanCollectionRun (state, options) { // eslint-disable-line func-name-matching
    _.assign(this, /** @lends Run.prototype */ {
        /**
         * @private
         * @type {Object}
         * @todo: state also holds the host for now (if any).
         */
        state: _.assign({
            cursors: {}
        }, state),

        /**
         * @private
         * @type {Object}
         */
        pools: {},

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

_.assign(Run.prototype, {
    // eslint-disable-next-line jsdoc/check-param-names
    /**
     * @param {String} action
     * @param {Object} [payload]
     * @param {*} [args...]
     */
    queue: function (action, payload) {
        // extract the arguments that are to be forwarded to the processor
        return this._schedule(action, payload, _.slice(arguments, 2), false);
    },

    // eslint-disable-next-line jsdoc/check-param-names
    /**
     * @param {String} action
     * @param {Object} [payload]
     * @param {*} [args...]
     */
    interrupt: function (action, payload) {
        // extract the arguments that are to be forwarded to the processor
        return this._schedule(action, payload, _.slice(arguments, 2), true);
    },

    // eslint-disable-next-line jsdoc/check-param-names
    /**
     * Suspends current instruction and executes the given instruction.
     *
     * This method explicitly chooses not to handle errors, to allow the caller to catch errors and continue execution
     * without terminating the instruction queue. However, it is up to the caller to make sure errors are handled,
     * or it will go unhandled.
     *
     * @param {String} action
     * @param {Object} payload
     * @param {*} [args...]
     */
    immediate: function (action, payload) {
        var scope = this,
            instruction = this.getPool((payload.coords || payload.context.coords).ref)
                .create(action, payload, _.slice(arguments, 2));

        // we directly execute this instruction instead od queueing it.
        setTimeout(function () {
            // we do not have callback, hence we send _.noop. we could have had made callback in .execute optional, but
            // that would suppress design-time bugs in majority use-case and hence we avoided the same.
            instruction.execute(_.noop, scope);
        }, 0);

        return instruction;
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

        var timeback = callback;

        if (_.isFinite(_.get(this.options, 'timeout.global'))) {
            timeback = backpack.timeback(callback, this.options.timeout.global, this, function () {
                _.invokeMap(this.pools, 'clear');
            });
        }

        // invoke all the initialiser functions one after another and if it has any error then abort with callback.
        async.series(_.map(Run.initialisers, function (initializer) {
            return initializer.bind(this);
        }.bind(this)), function (err) {
            if (err) { return callback(err); }

            // save the normalised callbacks as triggers
            this.triggers = callback;

            // @todo set concurrency default in newman run options
            for (var i = 0, cursor; i < _.get(this.options, 'concurrency', 1); i++) {
                // get a cursor for this process
                cursor = this.getCursor().current();

                // trigger start only once for the entire run
                if (i === 0) { this.triggers.start(null, cursor); }

                // queue the iteration command on start
                this.queue('waterfall', {
                    coords: cursor,
                    static: true,
                    start: true
                });

                this._process(cursor.ref, timeback);
            }
        }.bind(this));
    },

    /**
     * @private
     * @param {Object|Cursor} cursor
     * @return {Item}
     */
    resolveCursor: function (cursor) {
        if (!cursor || !Array.isArray(this.state.items)) { return; }

        return this.state.items[cursor.position];
    },

    /**
     * @private
     * @param {String} [pid]
     * @return {Cursor}
     */
    getCursor: function (pid) {
        var cursor;

        if (pid) {
            // return the existing cursor for a specific process
            cursor = this.state.cursors[pid];
        }
        else {
            // create a new cursor for the process
            cursor = Cursor.create(this.state.items.length, this.state.data.length);
            this.state.cursors[cursor.ref] = cursor;
            // create a new pool of instructions associated to the cursor
            this.pools[cursor.ref] = Instruction.pool(Run.commands);
        }

        return cursor;
    },

    /**
     * @private
     * @param {String} pid
     * @return {InstructionPool}
     */
    getPool: function (pid) {
        return this.pools[pid];
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
        var pool = this.getPool((payload.coords || payload.cursor).ref),
            instruction = pool.create(action, payload, args);

        // based on whether the immediate flag is set, add to the top or bottom of the instruction queue.
        (immediate ? pool.unshift : pool.push)(instruction);

        return instruction;
    },

    _process: function (pid, callback) {
        // extract the command from the queue
        var instruction = this.getPool(pid).shift(),
            cursor = this.getCursor(pid).current();

        // if there is nothing to process, return
        if (!instruction) {
            delete this.pools[cursor.ref];
            // if no pool has any more instructions, exit
            if (!_.size(this.pools)) {
                return callback(null, cursor);
            }

            return;
        }

        instruction.execute(function (err) {
            return err ? callback(err, cursor) : this._process(pid, callback); // process recursively
        }, this);
    }
});

_.assign(Run, {
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
    'httprequest.command': require('./extensions/http-request.command'),
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
    _.has(extension, 'triggers') && _.isArray(extension.triggers) && _.forEach(extension.triggers, function (name) {
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
