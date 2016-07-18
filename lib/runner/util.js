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
