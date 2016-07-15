var /**
     * @const
     * @type {string}
     */
    FUNCTION = 'function';

/**
 * Utility functions that are required to be re-used throughout the runner
 * @module Runner~util
 * @private
 *
 * @note Do not put module logic or business logic related functions here. The functions here are purely decoupled and
 * low-level functions.
 */
module.exports = {
    /**
     * This function allows one to call another function by wrapping it within a try-catch block. The first parameter is
     * the function itself, followed by the scope in which this function is to be executed. The third parameter onwards
     * are blindly forwarded to the function being called
     *
     * @param {Function} fn
     * @param {*} ctx
     *
     * @returns {Error} If there was an error executing the function, the error is returned. Note that if the function
     * called here is asynchronous, it's errors will not be returned (for obvious reasons!)
     */
    safeCall: function (fn, ctx) {
        // extract the arguments that are to be forwarded to the function to be called
        var args = Array.prototype.slice.call(arguments, 2);

        try {
            (typeof fn === FUNCTION) && fn.apply(ctx || global, args);
        }
        catch (err) {
            return err;
        }
    },

    /**
     * Execute an array of functions asynchronously
     *
     * @param {Array.<Function>} fns
     * @param {Function} cb
     * @param {Object} [ctx]
     */
    asyncCall: function (fns, cb, ctx) {
        !ctx && (ctx = {});

        // if there are no functions, we simply move next
        if (!Array.isArray(fns)) { return cb.call(ctx); }
        fns = fns.slice(); // clone the array

        var execute = function (err) {
            if (err || !fns.length) { return cb.call(ctx, err); }

            var fn = fns.pop();
            if (typeof fn !== FUNCTION) {
                fn = null;
                return execute();
            }

            try { fn.call(ctx, execute); }
            catch (e) { return cb.call(ctx, e); }
        };

        execute();
    },

    /**
     * Iterates on an array and passes them to a function for asynchronous processing
     *
     * @param {Array} arr
     * @param {Function} fn
     * @param {Function} cb
     * @param {Object} [ctx]
     */
    asyncEach: function (arr, fn, cb, ctx) {
        !ctx && (ctx = {});

        var results, // we do not init this as an array, instead use its "undefined-ness" as a flag for first run
            done = function () {
                cb.apply(ctx, arguments);
                done = null;
            },
            execute,
            next;

        // if there are no functions, we simply move next
        if (!Array.isArray(arr)) {
            return done(null, []);
        }

        arr = arr.slice(); // clone the array

        next = function (err, value) {
            setTimeout(execute.bind(ctx, err, value), 0);
        };

        execute = function (err, value) {
            if (!done) return;

            // the first run is the trigger for tail recursion and as such, we do not need to push value on first
            // run. to check whether this is the first run or not, the results object is left initially to
            // undefined and initialised to array on first run.
            !results && (results = []) || results.push(value);
            if (err || !arr.length) { return done(err, results); }

            var item = arr.shift();

            try { fn.call(ctx, item, next); }
            catch (e) { return done(e, results); }
        };

        execute();
    },

    /**
     * Copies attributes from source object to destination object.
     *
     * @param src
     * @param dest
     *
     * @return {Object}
     */
    syncObject: function (dest, src) {
        // update or add values from src
        for (var skey in src) {
            if (src.hasOwnProperty(skey)) {
                dest[skey] = src[skey];
            }
        }

        // remove values that no longer exist
        for (var dkey in dest) {
            if (dest.hasOwnProperty(dkey) && !src.hasOwnProperty(dkey)) {
                delete dest[dkey];
            }
        }
        return dest;
    }
};
