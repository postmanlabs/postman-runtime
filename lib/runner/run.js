var _ = require('lodash'),
    async = require('async'),
    backpack = require('../backpack'),
    Instruction = require('./instruction'),

    Run; // constructor

/**
 * The run object is the primary way to interact with a run in progress. It allows controlling the run (pausing,
 * starting, etc) and holds references to the helpers, such as requesters and authorizer.
 *
 * @param {Object} state -
 * @param {Object} options -
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
        state: _.assign({}, state),

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

_.assign(Run.prototype, {
    // eslint-disable-next-line jsdoc/check-param-names
    /**
     * @param {String} action -
     * @param {Object} [payload] -
     */
    queue (action, payload) {
        // extract the arguments that are to be forwarded to the processor
        return this._schedule(action, payload, _.slice(arguments, 2), false);
    },

    // eslint-disable-next-line jsdoc/check-param-names
    /**
     * @param {String} action -
     * @param {Object} [payload] -
     */
    interrupt (action, payload) {
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
     * @param {String} action -
     * @param {Object} payload -
     */
    immediate (action, payload) {
        var scope = this,
            instruction = this.pool.create(action, payload, _.slice(arguments, 2));

        // we directly execute this instruction instead od queueing it.
        setTimeout(function () {
            // we do not have callback, hence we send _.noop. we could have had made callback in .execute optional, but
            // that would suppress design-time bugs in majority use-case and hence we avoided the same.
            instruction.execute(_.noop, scope);
        }, 0);

        return instruction;
    },

    /**
     * @param {Function|Object} callback -
     */
    start (callback) {
        // @todo add `when` parameter to backpack.normalise
        callback = backpack.normalise(callback, Object.keys(Run.triggers));

        // cannot start run if it is already running
        if (this.triggers) {
            return callback(new Error('run: already running'));
        }

        var timeback = callback;

        if (_.isFinite(_.get(this.options, 'timeout.global'))) {
            timeback = backpack.timeback(callback, this.options.timeout.global, this, function () {
                this.pool.clear();
            });
        }

        // invoke all the initialiser functions one after another and if it has any error then abort with callback.
        async.series(_.map(Run.initialisers, function (initializer) {
            return initializer.bind(this);
        }.bind(this)), function (err) {
            if (err) { return callback(err); }

            // save the normalised callbacks as triggers
            this.triggers = callback;
            this.triggers.start(null, this.state.cursor.current()); // @todo may throw error if cursor absent
            this._process(timeback);
        }.bind(this));
    },

    /**
     * @private
     * @param {Object|Cursor} cursor -
     * @return {Item}
     */
    resolveCursor (cursor) {
        if (!cursor || !Array.isArray(this.state.items)) { return; }

        return this.state.items[cursor.position];
    },

    /**
     * @private
     *
     * @param {String} action -
     * @param {Object} [payload] -
     * @param {Array} [args] -
     * @param {Boolean} [immediate] -
     */
    _schedule (action, payload, args, immediate) {
        var instruction = this.pool.create(action, payload, args);

        // based on whether the immediate flag is set, add to the top or bottom of the instruction queue.
        (immediate ? this.pool.unshift : this.pool.push)(instruction);

        return instruction;
    },

    _process (callback) {
        // extract the command from the queue
        var instruction = this.pool.shift();

        // if there is nothing to process, exit
        if (!instruction) {
            callback(null, this.state.cursor.current());

            return;
        }

        instruction.execute(function (err) {
            return err ? callback(err, this.state.cursor.current()) : this._process(callback); // process recursively
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
     *
     * @enum {Function}
     *
     * @note commands are loaded by flattening the modules in the `./commands` directory
     */
    commands: {},

    /**
     * Functions executed with commands on start
     *
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
    if (_.has(extension, 'prototype')) {
        _.forOwn(extension.prototype, function (value, prop) {
            if (Object.hasOwnProperty.call(Run.prototype, prop)) {
                throw new Error('run: duplicate command prototype extension ' + prop);
            }
            Run.prototype[prop] = value;
        });
    }

    // put the triggers in a box
    if (_.has(extension, 'triggers') && _.isArray(extension.triggers)) {
        _.forEach(extension.triggers, function (name) {
            name && (Run.triggers[name] = true);
        });
    }

    // we add the processors to the processor list
    if (_.has(extension, 'process')) {
        _.forOwn(extension.process, function (command, name) {
            if (!_.isFunction(command)) { return; }
            if (Object.hasOwnProperty.call(all, name)) {
                throw new Error('run: duplicate command processor ' + name);
            }
            // finally add the command function to the accumulator
            all[name] = command;
        });
    }

    // add the initialisation functions
    _.has(extension, 'init') && _.isFunction(extension.init) && Run.initialisers.push(extension.init);
});

module.exports = Run;
