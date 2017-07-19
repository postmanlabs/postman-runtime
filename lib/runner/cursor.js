var _ = require('lodash'),
    uuid = require('uuid'),
    Cursor;

/**
 * @param {Number} [length=0]
 * @param {Number} [cycles=1]
 * @param {Number} [position=0]
 * @param {Number} [iteration=0]
 * @param {String} [ref]
 * @constructor
 */
Cursor = function RunCursor (length, cycles, position, iteration, ref) {

    this.length = Cursor.validate(length, 0);
    this.position = Cursor.validate(position, 0, this.length);

    this.cycles = Cursor.validate(cycles, 1, 1);
    this.iteration = Cursor.validate(iteration, 0, this.cycles);

    this.ref = ref || uuid.v4();
};

_.assign(Cursor.prototype, {
    /**
     *
     *
     * @param {Object} state
     * @param {Number} [state.length=0]
     * @param {Number} [state.cycles=1]
     * @param {Number} [state.position=0]
     * @param {Number} [state.iteration=0]
     * @param {String} [state.ref]
     * @param {Function} [callback] - receives `(err:Error, coords:Object, previous:Object)`
     * @param {Object} [scope]
     */
    load: function (state, callback, scope) {
        !state && (state = {});
        (state instanceof Cursor) && (state = state.current());

        this.reset(state.length, state.cycles, state.position, state.iteration, state.ref, callback, scope);
    },

    /**
     * Update length and cycle bounds
     *
     * @param {Number} [length=0]
     * @param {Number} [cycles=1]
     * @param {Number} [position=0]
     * @param {Number} [iteration=0]
     * @param {String} [ref]
     * @param {Function} [callback] - receives `(err:Error, coords:Object, previous:Object)`
     * @param {Object} [scope]
     */
    reset: function (length, cycles, position, iteration, ref, callback, scope) {
        var coords = _.isFunction(callback) && this.current();

        // validate parameter defaults
        _.isNil(length) && (length = this.length);
        _.isNil(cycles) && (cycles = this.cycles);
        _.isNil(position) && (position = this.position);
        _.isNil(iteration) && (iteration = this.iteration);
        _.isNil(ref) && (ref = this.ref);

        // use the constructor to set the values
        Cursor.call(this, length, cycles, position, iteration, ref);

        // send before and after values to the callback
        return coords && callback.call(scope || this, null, this.current(), coords);
    },

    /**
     * Update length and cycle bounds
     *
     * @param {Number} [length=0]
     * @param {Number} [cycles=1]
     * @param {Function} [callback] - receives `(err:Error, coords:Object, previous:Object)`
     * @param {Object} [scope]
     */
    bounds: function (length, cycles, callback, scope) {
        var coords = _.isFunction(callback) && this.current();

        // validate parameter defaults
        _.isNil(length) && (length = this.length);
        _.isNil(cycles) && (cycles = this.cycles);

        // use the constructor to set the values
        Cursor.call(this, length, cycles, this.position, this.iteration);

        return coords && callback.call(scope || this, null, this.current(), coords);
    },

    /**
     * Set everything to minimum dimension
     *
     * @param {Function} [callback] - receives `(err:Error, coords:Object, previous:Object)`
     * @param {Object} [scope]
     */
    zero: function (callback, scope) {
        var coords = _.isFunction(callback) && this.current();

        this.position = 0;
        this.iteration = 0;

        // send before and after values to the callback
        return coords && callback.call(scope || this, null, this.current(), coords);
    },

    /**
     * Set everything to mnimum dimension
     *
     * @param {Function} [callback] - receives `(err:Error, coords:Object, previous:Object)`
     * @param {Object} [scope]
     */
    clear: function (callback, scope) {
        var coords = _.isFunction(callback) && this.current();

        this.position = 0;
        this.iteration = 0;
        this.cycles = 1;
        this.length = 0;

        return coords && callback.call(scope || this, null, this.current(), coords);
    },

    /**
     * Seek to a specified Cursor
     *
     * @param {Number} [position]
     * @param {Number} [iteration]
     * @param {Function} [callback] - receives `(err:Error, changed:Boolean, coords:Object, previous:Object)`
     * @param {Object} [scope]
     */
    seek: function (position, iteration, callback, scope) {
        var coords = _.isFunction(callback) && this.current();

        // if null or undefined implies use existing seek position
        _.isNil(position) && (position = this.position);
        _.isNil(iteration) && (iteration = this.iteration);

        // make the pointers stay within boundary
        if ((position >= this.length) || (iteration >= this.cycles) || (position < 0) || (iteration < 0) ||
            isNaN(position) || isNaN(iteration)) {
            return coords &&
                callback.call(scope || this, new Error('runcursor: seeking out of bounds: ' + [position, iteration]));
        }

        // floor the numbers
        position = ~~position;
        iteration = ~~iteration;

        // set the new positions
        this.position = Cursor.validate(position, 0, this.length);
        this.iteration = Cursor.validate(iteration, 0, this.cycles);

        // finally execute the callback with the seek position
        return coords && callback.call(scope || this, null, this.hasChanged(coords), this.current(), coords);
    },

    /**
     * Seek one forward
     *
     * @param {Function} [callback] - receives `(err:Error, changed:Boolean, coords:Object, previous:Object)`
     * @param {Object} [scope]
     */
    next: function (callback, scope) {
        var position = this.position,
            iteration = this.iteration,

            coords;

        // increment position
        position += 1;

        // check if we need to increment cycle
        if (position >= this.length) {
            // set position to 0 and increment iteration
            position = 0;
            iteration += 1;

            if (iteration >= this.cycles) {
                coords = _.isFunction(callback) && this.current();
                coords.eof = true;
                return coords && callback.call(scope || this, null, false, coords, coords);
            }

            coords && (coords.cr = true);
        }

        // finally handover the new coordinates to seek function
        return this.seek(position, iteration, callback, scope);
    },

    /**
     * Tentative Cursor status, if we do `.next()`
     * @param {Object} coords
     *
     * @returns {Object}
     */
    whatnext: function (coords) {
        var base = {
                ref: this.ref,
                length: this.length,
                cycles: this.cycles
            },
            position,
            iteration;

        if (!_.isObject(coords)) {
            return _.assign(base, {eof: true, bof: true, empty: this.empty()});
        }
        if (!this.length) {
            return _.assign(base, {eof: true, bof: true, empty: true});
        }

        position = coords.position;
        iteration = coords.iteration;

        // increment position
        position += 1;

        // check if we need to increment cycle
        if (position >= this.length) {
            // set position to 0 and increment iteration
            position = 0;
            iteration += 1;

            if (iteration >= this.cycles) {
                return _.assign(base, {
                    position: this.length - 1,
                    iteration: iteration - 1,
                    eof: true
                });
            }

            return _.assign(base, {
                position: position,
                iteration: iteration,
                cr: true
            });
        }

        return _.assign(base, {position: position, iteration: iteration});
    },

    /**
     * Check whether current position and iteration is not as the same specified
     * @param {Object} coords
     * @returns {Boolean}
     */
    hasChanged: function (coords) {
        return _.isObject(coords) && !((this.position === coords.position) && (this.iteration === coords.iteration));
    },

    /**
     * Current Cursor state
     * @returns {Object}
     */
    current: function () {
        return {
            position: this.position,
            iteration: this.iteration,
            length: this.length,
            cycles: this.cycles,
            empty: this.empty(),
            eof: this.eof(),
            bof: this.bof(),
            cr: this.cr(),
            ref: this.ref
        };
    },

    /**
     * Is the current position going to trigger a new iteration on `.next`?
     * @returns {Boolean}
     */
    cr: function () {
        return !this.length || (this.position >= this.length);
    },

    /**
     * @returns {Boolean}
     */
    eof: function () {
        return !this.length || (this.position >= this.length) && (this.iteration >= this.cycles);
    },

    /**
     * @returns {Boolean}
     */
    bof: function () {
        return !this.length || ((this.position === 0) && (this.iteration === 0));
    },

    /**
     * @returns {Boolean}
     */
    empty: function () {
        return !this.length;
    },

    /**
     * @returns {Object}
     */
    valueOf: function () {
        return this.current();
    },

    clone: function () {
        return new Cursor(this.length, this.cycles, this.position, this.iteration);
    }
});

_.assign(Cursor, {
    /**
     * @param {Number} [length=0]
     * @param {Number} [cycles=1]
     * @param {Number} [position=0]
     * @param {Number} [iteration=0]
     * @param {String} [ref]
     *
     * @returns {Number}
     */
    create: function (length, cycles, position, iteration, ref) {
        return new Cursor(length, cycles, position, iteration, ref);
    },

    /**
     * @param {Object|Cursor} obj
     * @param {Object} [bounds]
     * @param {Number} [bounds.length]
     * @param {Number} [bounds.cycles]
     *
     * @returns {Cursor}
     */
    box: function (obj, bounds) {
        // already a Cursor, do nothing
        if (obj instanceof Cursor) {
            bounds && obj.bounds(bounds.length, bounds.cycles);
            return obj;
        }

        // nothing to box, create a blank Cursor
        if (!_.isObject(obj)) { return new Cursor(bounds && bounds.length, bounds && bounds.cycles); }

        // load Cursor values from object
        return new Cursor((bounds || obj).length, (bounds || obj).cycles, obj.position, obj.iteration, obj.ref);
    },

    /**
     * @private
     *
     * @param {Number} num
     * @param {Number} min [description]
     * @param {Number} [max]
     *
     * @returns {Number}
     */
    validate: function (num, min, max) {
        if (typeof num !== 'number' || num < min) {
            return min;
        }
        if (num === Infinity) {
            return _.isNil(max) ? min : max;
        }

        return num;
    }
});

module.exports = Cursor;
