var util;

util = {
    /**
     * Generate one UUIDv4
     * @returns {String}
     */
    uuid: function () {
        var d = global.Date.now();
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = (d + global.Math.random() * 16) % 16 | 0;
            d = global.Math.floor(d / 16);
            return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
        });
    },

    /**
     * Cleaner way to attach event to any DOM element with a detach function returned;
     *
     * @param {Object} el
     * @param {String} name
     * @param {Function} fn
     * @param {Function} unfn
     * @returns {Function}
     */
    attach: function (el, name, fn, unfn) {
        el.addEventListener(name, fn);

        // return a function that removes this event listener from the given element.
        return function () {
            el && el.removeEventListener(name, fn);
            el = null; // release `el` from closure
            fn = null; // release `fn` from closure
            unfn && unfn();
        };
    }
};

module.exports = util;
