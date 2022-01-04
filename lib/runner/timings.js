/**
 * All timing related functions within the runner is maintained in this module. Things like recording time with label,
 * computing elapsed time between two labels, etc all go in here.
 *
 * @module Run~Timer
 */
var /**
     * @const
     * @type {string}
     */
    NUMBER = 'number',
    Timings; // constructor

/**
 * An instance of a timer can record times with a label associated with it.
 *
 * @constructor
 * @private
 * @param {Object.<Number>} records create the timer instance with one or more labels and their timestamp.
 */
Timings = function Timings (records) {
    // eslint-disable-next-line guard-for-in
    for (var prop in records) {
        this[prop] = parseInt(records[prop], 10);
    }
};

/**
 * Create a new instance of timer. Equivalent to doing new {@link Timer}(records:Object.<Number>);
 *
 * @param {Object.<Number>} records -
 * @returns {Timings}
 */
Timings.create = function (records) {
    return new Timings(records);
};

/**
 * Record the current time with the label specified.
 *
 * @param {String} label -
 * @returns {Number}
 *
 * @example
 * var t = new Timings();
 * t.record('start');
 *
 * console.log(t.toObject()); // logs {start: 1246333 }
 */
Timings.prototype.record = function (label) {
    return (this[label] = Date.now());
};


/**
 * Serialise a timing instance to an Object that can then be later used as a source to recreate another timing instance.
 *
 * @returns {Object.<Number>}
 */
Timings.prototype.toObject = function () {
    var obj = {},
        prop;

    for (prop in this) {
        if (typeof this[prop] === NUMBER) {
            obj[prop] = this[prop];
        }
    }

    return obj;
};

module.exports = Timings;
