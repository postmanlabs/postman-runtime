/**
 * An instruction is a self contained piece of information that can be created and then later be executed. {@link Run}
 * instance uses this as the values of the `Run.next` queue.
 *
 * @module  Run~Instructions
 */
var _ = require('lodash'),
    Timings = require('./timings'),

    arrayProtoSlice = Array.prototype.slice,
    arrayProtoUnshift = Array.prototype.unshift,

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
     *
     * @constructor
     *
     * @param {String} name - name of the instruction. this is useful for later lookup of the `processor` function when
     * deserialising this object
     * @param {Object} [payload] - a **JSON compatible** object that will be forwarded as the 2nd last parameter to the
     * processor.
     * @param {Array} [args] - all the arguments that needs to be passed to the processor is in this array
     * @private
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

        _.assign(this, /** @lends Instruction.prototype */ {
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
    Instruction.prototype.execute = function (callback, scope) {
        !scope && (scope = this);

        var params = _.clone(this.in),
            sealed = false,

            doneAndSpread = function (err) {
                if (sealed) {
                    console.error('__postmanruntime_fatal_debug: instruction.execute callback called twice');

                    return;
                }
                sealed = true;
                this.timings.record('end');

                var args = arrayProtoSlice.call(arguments);

                arrayProtoUnshift.call(args, scope);

                if (err) { // in case it errored, we do not process any thenables
                    _.isArray(this._catch) && _.invokeMap(this._catch, _.apply, scope, arguments);
                }
                else {
                    // call all the `then` stuff and then the main callback
                    _.isArray(this._done) && _.invokeMap(this._done, _.apply, scope, _.tail(arguments));
                }

                setTimeout(callback.bind.apply(callback, args), 0);
            }.bind(this);

        // add two additional arguments at the end of the arguments saved - i.e. the payload and a function to call the
        // callback asynchronously
        params.push(this.payload, doneAndSpread);

        this.timings.record('start');

        // run the processor in a try block to avoid causing stalled runs
        try {
            this._processor.apply(scope, params);
        }
        catch (e) {
            doneAndSpread(e);
        }
    };

    Instruction.prototype.done = function (callback) {
        (this._done || (this._done = [])).push(callback);

        return this;
    };

    Instruction.prototype.catch = function (callback) {
        (this._catch || (this._catch = [])).push(callback);

        return this;
    };

    Instruction.clear = function () {
        _.forEach(Instruction._queue, function (instruction) {
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
