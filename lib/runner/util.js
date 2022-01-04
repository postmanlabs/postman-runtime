var /**
     * @const
     * @type {string}
     */
    FUNCTION = 'function',

    /**
     * @const
     * @type {string}
     */
    STRING = 'string',

    createReadStream; // function

/**
 * Create readable stream for given file as well as detect possible file
 * read issues.
 *
 * @param {Object} resolver - External file resolver module
 * @param {String} fileSrc - File path
 * @param {Function} callback - Final callback
 *
 * @note This function is defined in the file's root because there is a need to
 * trap it within closure in order to append the stream clone functionalities.
 * This ensures lesser footprint in case we have a memory leak.
 */
createReadStream = function (resolver, fileSrc, callback) {
    var readStream;

    // check for the existence of the file before creating read stream.
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    resolver.stat(fileSrc, function (err, stats) {
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
        // listening on error requires listening on end event as well. which will make this sync.
        // @note In form-data mode stream error will be handled in postman-request but bails out ongoing request.
        // eslint-disable-next-line security/detect-non-literal-fs-filename
        readStream = resolver.createReadStream(fileSrc);

        // We might have to read the file before making the actual request
        // e.g, while calculating body hash during AWS auth or redirecting form-data params
        // So, this method wraps the `createReadStream` function with fixed arguments.
        // This makes sure that we don't have to pass `fileResolver` to
        // internal modules (like auth plugins) for security reasons.
        readStream.cloneReadStream = function (callback) {
            // eslint-disable-next-line security/detect-non-literal-fs-filename
            return createReadStream(resolver, fileSrc, callback);
        };

        callback(null, readStream);
    });
};

/**
 * Utility functions that are required to be re-used throughout the runner
 *
 * @module Runner~util
 * @private
 *
 * @note Do not put module logic or business logic related functions here.
 * The functions here are purely decoupled and low-level functions.
 */
module.exports = {
    /**
     * This function allows one to call another function by wrapping it within a try-catch block.
     * The first parameter is the function itself, followed by the scope in which this function is to be executed.
     * The third parameter onwards are blindly forwarded to the function being called
     *
     * @param {Function} fn -
     * @param {*} ctx -
     *
     * @returns {Error} If there was an error executing the function, the error is returned.
     * Note that if the function called here is asynchronous, it's errors will not be returned (for obvious reasons!)
     */
    safeCall (fn, ctx) {
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
     * @param {Object} dest -
     * @param {Object} src -
     *
     * @return {Object}
     */
    syncObject (dest, src) {
        var prop;

        // update or add values from src
        for (prop in src) {
            if (Object.hasOwnProperty.call(src, prop)) {
                dest[prop] = src[prop];
            }
        }

        // remove values that no longer exist
        for (prop in dest) {
            if (Object.hasOwnProperty.call(dest, prop) && !Object.hasOwnProperty.call(src, prop)) {
                delete dest[prop];
            }
        }

        return dest;
    },

    /**
     * Create readable stream for given file as well as detect possible file
     * read issues. The resolver also attaches a clone function to the stream
     * so that the stream can be restarted any time.
     *
     * @param {Object} resolver - External file resolver module
     * @param {Function} resolver.stat - Resolver method to check for existence and permissions of file
     * @param {Function} resolver.createReadStream - Resolver method for creating read stream
     * @param {String} fileSrc - File path
     * @param {Function} callback -
     *
     */
    createReadStream (resolver, fileSrc, callback) {
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

        // now that things are sanitized and validated, we transfer it to the
        // stream reading utility function that does the heavy lifting of
        // calling there resolver to return the stream
        return createReadStream(resolver, fileSrc, callback);
    }
};
