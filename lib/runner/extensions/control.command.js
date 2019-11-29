var _ = require('lodash'),
    util = require('../util'),
    backpack = require('../../backpack');

module.exports = {
    /**
     * All the events that this extension triggers
     * @type {Array}
     */
    triggers: ['pause', 'resume', 'abort'],

    prototype: /** @lends Run.prototype */ {
        /**
         * Pause a run
         *
         * @param {Function} callback
         */
        pause: function (callback) {
            callback = backpack.ensure(callback, this);

            if (this.paused) { return callback && callback(new Error('run: already paused')); }

            // schedule the pause command as an interrupt and flag that the run is pausing
            this.paused = true;
            _.forOwn(this.state.cursors, function (cursor) {
                this.interrupt('pause', {
                    coords: cursor.current()
                }, callback);
            }.bind(this));
        },

        /**
         * Resume a paused a run
         *
         * @param {Function} callback
         */
        resume: function (callback) {
            callback = backpack.ensure(callback, this);

            if (!this.paused) { return callback && callback(new Error('run: not paused')); }

            // set flag that it is no longer paused and fire the stored callback for the command when it was paused
            this.paused = false;
            setTimeout(function () {
                _.over(this.__resume).apply(this);
                delete this.__resume;
                this.triggers.resume(null);
            }.bind(this), 0);

            callback && callback();
        },

        /**
         * Aborts a run
         *
         * @param {boolean} [summarise=true]
         * @param {function} callback
         */
        abort: function (summarise, callback) {
            if (_.isFunction(summarise) && !callback) {
                callback = summarise;
                summarise = true;
            }

            _.forOwn(this.state.cursors, function (cursor) {
                this.interrupt('abort', {
                    summarise: summarise,
                    coords: cursor.current()
                }, callback);
            }.bind(this));

            _.isArray(this.__resume) && _.over(this.__resume).apply(this);
        }
    },

    process: /** @lends Run.commands */ {
        pause: function (userback, payload, next) {
            if (!this.__resume) { this.__resume = []; }

            // tuck away the command completion callback in the run object so that it can be used during resume
            this.__resume.push(next.bind(this, null));

            // wait to trigger the callback until all cursors have been paused
            if (this.__resume.length !== _.size(this.state.cursors)) {
                return;
            }

            // trigger the secondary callbacks
            this.triggers.pause(null);

            // execute the userback sent as part of the command and do so in a try block to ensure it does not hamper
            // the process tick
            var error = util.safeCall(userback, this);

            // if there is an error executing the userback, then and only then raise the error (which stops the run)
            if (error) {
                return next(error);
            }
        },

        /**
         * @param {Function} userback
         * @param {Object} payload
         * @param {Boolean} payload.summarise
         * @param {Function} next
         */
        abort: function (userback, payload, next) {
            // clear instruction pool and as such there will be nothing next to execute
            this.getPool(payload.coords.ref).clear();

            // wait until all pools have been cleared, then trigger abort
            this.__aborted = (this.__aborted || 0) + 1;
            if (this.__aborted === _.size(this.pools)) {
                this.triggers.abort(null);

                // execute the userback sent as part of the command and do so in a try block
                // to ensure it does not hamper the process tick
                backpack.ensure(userback, this) && userback();
            }

            next(null);
        }
    }
};
