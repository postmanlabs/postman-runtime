var _ = require('lodash');


module.exports = {
    init: function (done) {
        done();
    },

    triggers: ['waitStateChange'],

    prototype: {
        /**
         * @param {Function} fn - function to execute
         * @param {Function} next
         * @param {Number=} [time] - in ms
         * @private
         */
        queueDelay: function (fn, next, time) {
            // if the time is a valid and finite time, we queue the delay command
            if (_.isFinite(time)) {
                this.queue('delay', { time: time }).done(fn);
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
         * @param {Function} next
         */
        delay: function (payload, next) {
            this.waiting = true; // set flag
            // trigger the waiting stae change event
            this.triggers.waitStateChange(null, this.state.cursor.current(), true, payload.time || 0, 0);

            setTimeout((function () {
                this.waiting = false; // unset flag
                this.triggers.waitStateChange(null, this.state.cursor.current(), false, 0, payload.time || 0);
                next();
            }).bind(this), payload.time || 0);
        }
    }
};
