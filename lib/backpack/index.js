var _ = require('lodash'),
    meetExpectations,
    backpack;

/**
 * ensure the specified keys are functions in subject
 *
 * @param {Object} subject -
 * @param {Array} expectations -
 * @param {Array=} [defaults] -
 * @returns {Object}
 */
meetExpectations = function (subject, expectations, defaults) {
    // provided that the subject is an object, we meet expectations that the keys in array must be a function
    // eslint-disable-next-line lodash/prefer-lodash-chain
    _.isObject(subject) && _.union(defaults, expectations).forEach(function (expect) {
        !_.isFunction(subject[expect]) && (subject[expect] = _.noop);
    });

    return subject;
};

module.exports = backpack = {
    /**
     * Ensures that the given argument is a callable.
     *
     * @param {*} arg -
     * @param {Object=} ctx -
     * @returns {boolean|*}
     */
    ensure (arg, ctx) {
        return (typeof arg === 'function') && (ctx ? arg.bind(ctx) : arg) || undefined;
    },

    /**
     * accept the callback parameter and convert it into a consistent object interface
     *
     * @param {Function|Object} cb -
     * @param {Array} expect -
     * @returns {Object}
     *
     * @todo - write tests
     */
    normalise (cb, expect) {
        if (_.isFunction(cb) && cb.__normalised) {
            return meetExpectations(cb, expect);
        }

        var userback, // this var will be populated and returned
            // keep a reference of all initial callbacks sent by user
            callback = (_.isFunction(cb) && cb) || (_.isFunction(cb && cb.done) && cb.done),
            callbackError = _.isFunction(cb && cb.error) && cb.error,
            callbackSuccess = _.isFunction(cb && cb.success) && cb.success;

        // create master callback that calls these user provided callbacks
        userback = _.assign(function (err) {
            // if common callback is defined, call that
            callback && callback.apply(this, arguments);

            // for special error and success, call them if they are user defined
            if (err) {
                callbackError && callbackError.apply(this, arguments);
            }
            else {
                // remove the extra error param before calling success
                callbackSuccess && callbackSuccess.apply(this, (Array.prototype.shift.call(arguments), arguments));
            }
        }, _.isPlainObject(cb) && cb, { // override error, success and done
            error: function () {
                return userback.apply(this, arguments);
            },
            success: function () {
                // inject null to arguments and call the main callback
                userback.apply(this, (Array.prototype.unshift.call(arguments, null), arguments));
            },
            done: function () {
                return userback.apply(this, arguments);
            },
            __normalised: true
        });

        return meetExpectations(userback, expect);
    },

    /**
     * Convert a callback into a function that is called multiple times and the callback is actually called when a set
     * of flags are set to true
     *
     * @param {Array} flags -
     * @param {Function} callback -
     * @param {Array} args -
     * @param {Number} ms -
     * @returns {Function}
     */
    multiback (flags, callback, args, ms) {
        var status = {},
            sealed;

        // ensure that the callback times out after a while
        callback = backpack.timeback(callback, ms, null, function () {
            sealed = true;
        });

        return function (err, flag, value) {
            if (sealed) { return; } // do  not proceed of it is sealed
            status[flag] = value;

            if (err) { // on error we directly call the callback and seal subsequent calls
                sealed = true;
                status = null;
                callback.call(status, err);

                return;
            }

            // if any flag is not defined, we exit. when all flags hold a value, we know that the end callback has to be
            // executed.
            for (var i = 0, ii = flags.length; i < ii; i++) {
                if (!Object.hasOwn(status, flags[i])) { return; }
            }

            sealed = true;
            status = null;
            callback.apply(status, args);
        };
    },

    /**
     * Ensures that a callback is executed within a specific time.
     *
     * @param {Function} callback -
     * @param {Number=} [ms] -
     * @param {Object=} [scope] -
     * @param {Function=} [when] - function executed right before callback is called with timeout. one can do cleanup
     * stuff here
     * @returns {Function}
     */
    timeback (callback, ms, scope, when) {
        ms = Number(ms);

        // if np callback time is specified, just return the callback function and exit. this is because we do need to
        // track timeout in 0ms
        if (!ms) {
            return callback;
        }

        var sealed = false,
            irq = setTimeout(function () { // irq = interrupt request
                sealed = true;
                irq = null;
                when && when.call(scope || this);
                callback.call(scope || this, new Error('callback timed out'));
            }, ms);

        return function () {
            // if sealed, it means that timeout has elapsed and we accept no future callback
            if (sealed) { return undefined; }

            // otherwise we clear timeout and allow the callback to be executed. note that we do not seal the function
            // since we should allow multiple callback calls.
            irq && (irq = clearTimeout(irq));

            return callback.apply(scope || this, arguments);
        };
    }
};
