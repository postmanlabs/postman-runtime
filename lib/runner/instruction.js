/**
 * An instruction is a self contained piece of information that can be created and then later be executed. {@link Run}
 * instance uses this as the values of the `Run.next` queue.
 *
 * @module  Run~Instructions
 */
var _ = require('lodash'),
    util = require('./util'),
    Timings = require('./timings'),

    pool; // function

/**
 * Create a new instruction pool
 *
 * @param {Object.<Function>} processors - hash of all command processor functions
 * @returns {InstructionPool}
 */
pool = function (processors) {
    !_.isObject(processors) && (processors = {});

    /**
     * Create a new instruction to be executed later
     * @constructor
     *
     * @param {Function} processor - the function that will be executed later. the processor function is passed parameter in
     * the following format `(args..., payload:Object, next:Function)`
     * @param {String} name - name of the instruction. this is useful for later lookup of the `processor` function when
     * deserialising this object
     * @param {Object} [payload] - a **JSON compatible** object that will be forwarded as the 2nd last parameter to the
     * processor.
     * @param {Array} [args] - all the arguments that needs to be passed to the processor is in this array
     *
     * @example
     * var inst = Instruction.create(function (arg1, payload, next) {
     *         console.log(payload);
     *         next(null, 'hello-on-execute with ' + arg1);
     *     }, 'sample-instruction', {
     *         payloadData1: 'value'
     *     }, ['one-arg']);
     *
     * // now, when we do execute, the result will be a console.log of payload and message will be as expected
     * instance.execute(function (err, message) {
     *     console.log(message);
     * });
     *
     */
    var Instruction = function (name, payload, args) {
        var processor = processors[name];

        if (!_.isString(name) || !_.isFunction(processor)) {
            throw new Error('run-instruction: invalid construction');
        }

        // ensure that payload is an object so that data storage can be done. also ensure arguments is an array
        !_.isObject(payload) && (payload = {});
        !_.isArray(args) && (args = []);

        _.extend(this, /** @lends Instruction.prototype */ {
            /**
             * @type {String}
             */
            action: name,
            /**
             * @type {Object}
             */
            payload: payload,
            /**
             * @type {Array}
             */
            in: args,
            /**
             * @type {Timings}
             */
            timings: Timings.create(),
            /**
             * @private
             * @type {Function}
             */
            _processor: processor
        });

        // record the timing when this instruction was created
        this.timings.record('created');
    };

    /**
     * Shortcut to `new Instruction(...);`
     *
     * @param {Function} processor
     * @param {String} name
     * @param {Object} [payload]
     * @param {Array} [args]
     *
     * @returns {Instruction}
     */
    Instruction.create = function (processor, name, payload, args) {
        return new Instruction(processor, name, payload, args);
    };

    /**
     * Store all thenable items
     *
     * @type {Array}
     */
    Instruction._queue = [];

    /**
     * Executes an instruction with previously saved payload and arguments
     *
     * @param {Function} callback
     * @param {*} [scope]
     *
     * @todo: use timeback and control it via options sent during pool creation as an option
     */
    Instruction.prototype.execute = function(callback, scope) {
        !scope && (scope = this);

        var args = _.clone(this.in),
            sealed = false,

            doneAndSpread = function (args) {
                if (sealed) {
                    console.log('__postmanruntime_fatal_debug: instruction.execute callback called twice');
                    return;
                }
                sealed = true;
                Array.prototype.unshift.call(args, scope);
                setTimeout(callback.bind.apply(callback, args), 0);
            };

        // add two additional arguments at the end of the arguments saved - i.e. the payload and a function to asyncronously
        // call the callback
        args.push(this.payload, function (err) {
            this.timings.record('end');

            // in case it errored, we do not process any thenables
            if (!err) { // @todo - to be decided whether this remains the behaviour post .catch
                // call all the `then` stuff and then the main callback
                _.isArray(this._done) && _.invoke(this._done, _.apply, scope, _.tail(arguments));

            }

            return doneAndSpread(arguments);
        }.bind(this));

        this.timings.record('start');

        // run the processor in a try block to avoid causing stalled runs
        try {
            this._processor.apply(scope, args);
        }
        catch (e) {
            doneAndSpread([e]);
        }
    };

    Instruction.prototype.done = function (callback) {
        (this._done || (this._done = [])).push(callback);
    };

    Instruction.clear = function () {
        _.each(Instruction._queue, function (instruction) {
            delete instruction._done;
        });
        Instruction._queue.length = 0;
    };

    Instruction.shift = function () {
        return Instruction._queue.shift.apply(Instruction._queue, arguments);
    };

    Instruction.unshift = function () {
        return Instruction._queue.unshift.apply(Instruction._queue, arguments);
    };

    Instruction.push = function () {
        return Instruction._queue.push.apply(Instruction._queue, arguments);
    };

    return Instruction;
};

module.exports = {
    pool: pool
};
