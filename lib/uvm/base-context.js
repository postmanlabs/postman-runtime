var _ = require('lodash'),
    sugarjs = require('./libraries').sugarjs,
    vm = require('vm');

/**
 * Creates a base context which contains sugarified built-ins, such as Date, etc.
 *
 * @param options
 * @param callback
 */
module.exports.get = function (options, callback) {
    if (_.isFunction(options) && !callback) {
        callback = options;
        options = {};
    }
    var context = vm.createContext();
    try {
        vm.runInContext(sugarjs, context);
    }
    catch (e) {
        return callback(e);
    }

    return callback(null, _.assignIn(context, (options && options.base) ? options.base : undefined));
};
