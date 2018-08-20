var /**
     * @const
     * @type {string}
     */
    FUNCTION = 'function',

    /**
     * @const
     * @type {string}
     */
    STRING = 'string';

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
     * @param dest
     * @param src
     *
     * @return {Object}
     */
    syncObject: function (dest, src) {
        var prop;

        // update or add values from src
        for (prop in src) {
            if (src.hasOwnProperty(prop)) {
                dest[prop] = src[prop];
            }
        }

        // remove values that no longer exist
        for (prop in dest) {
            if (dest.hasOwnProperty(prop) && !src.hasOwnProperty(prop)) {
                delete dest[prop];
            }
        }
        return dest;
    },

    createReadStream: function (resolver, fileSrc, callback) {
        // bail out if resolver not found.
        if (!resolver) {
            return callback(new Error('file resolver not supported'));
        }

        // bail out if resolver is not supported.
        if (typeof resolver.stat !== FUNCTION || typeof resolver.createReadStream !== FUNCTION) {
            return callback(new Error('file resolver interface mismatch'));
        }

        // bail out if file source is invalid or empty string.
        if (!fileSrc || typeof fileSrc !== STRING) {
            return callback(new Error('invalid or missing file source'));
        }

        // check for the existence of the file before creating read stream.
        resolver.stat(fileSrc, function(err, stats) {
            if (err) {
                // overwrite `ENOENT: no such file or directory` error message. Most likely the case.
                err.code === 'ENOENT' && (err.message = `"${fileSrc}", no such file`);
                return callback(err);
            }

            // check for a valid file.
            if (stats && typeof stats.isFile === FUNCTION && !stats.isFile()) {
                return callback(new Error(`"${fileSrc}", is not a file`));
            }

            // check read permissions for user.
            // octal `400` signifies 'user permissions'. [4 0 0] -> [u g o]
            // `4` signifies 'read permission'. [4] -> [1 0 0] -> [r w x]
            if (stats && !(stats.mode & 0o400)) {
                return callback(new Error(`"${fileSrc}", read permission denied`));
            }

            // @note Handle all the errors before `createReadStream` to avoid listening on stream error event.
            //       listening on error requires listening on end event as well. which will make this sync.
            // @note In form-data mode stream error will be handled in postman-request but bails out ongoing request.
            callback(null, resolver.createReadStream(fileSrc));
        });
    }
};
