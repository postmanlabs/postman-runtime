var _ = require('lodash');

module.exports = {
    init: function (done) {
        done();
    },

    triggers: ['waitStateChange'],

    prototype: {
        /**
         * @param {Function} fn - function to execute
         * @param {Object} options
         * @param {String} options.source
         * @param {Number} options.time
         * @param {Object} options.cursor
         * @param {Function} next
         * @private
         */
        queueDelay: function (fn, options, next) {
            var time = _.isFinite(options.time) ? parseInt(options.time, 10) : 0;

            // if the time is a valid and finite time, we queue the delay command
            if (time > 0) {
                this.queue('delay', {
                    cursor: options.cursor,
                    source: options.source,
                    time: time
                }).done(fn);
            }
            // otherwise, we do not delay and simply execute the function that was supposed to be called post delay
            else {
                fn();
            }

            next();
        }
    },

    process: {
        /**
         * @param {Object} payload
         * @param {Number} payload.time
         * @param {Object} payload.cursor
         * @param {String} payload.source
         * @param {Function} next
         */
        delay: function (payload, next) {
            var cursor = payload.cursor || this.state.cursor.current();

            this.waiting = true; // set flag
            // trigger the waiting stae change event
            this.triggers.waitStateChange(null, cursor, true, payload.time, payload.source);

            setTimeout((function () {
                this.waiting = false; // unset flag
                this.triggers.waitStateChange(null, cursor, false, payload.time, payload.source);
                next();
            }).bind(this), payload.time || 0);
        }
    }
};
