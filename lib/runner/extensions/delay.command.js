var _ = require('lodash');


module.exports = {
    init: function (done) {
        done();
    },

    prototype: {
        /**
         *
         * @param {Function} fn - function to execute
         * @param {Function} next
         * @param {Number=} [time] - in ms
         * @private
         */
        queueDelay: function (fn, next, time) {
            if (_.isFinite(time)) {
                this.queue('delay', {
                    time: time
                }).done(fn);
            }
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
            setTimeout(next, payload.time || 0);
        }
    }
};
