var _ = require('lodash'),
    EMPTY = '',
    createAuthInterface;

/**
 * Creates a wrapper around RequestAuth and provides getters and setters helper functions
 *
 * @constructs AuthInterface
 * @param {RequestAuth} auth -
 * @param {Object} protocolProfileBehavior - Protocol profile behaviors
 * @return {AuthInterface}
 * @throws {Error}
 */
createAuthInterface = function (auth, protocolProfileBehavior) {
    if (!(auth && auth.parameters && auth.parameters())) {
        throw new Error('runtime~createAuthInterface: invalid auth');
    }

    return /** @lends AuthInterface.prototype **/{
        /**
         * @private
         * @property {protocolProfileBehavior} - Protocol profile behaviors
         */
        _protocolProfileBehavior: protocolProfileBehavior || {},

        /**
         * @param {String|Array<String>} keys -
         * @return {*} Returns a value for a key or an object having all keys & values depending on the input
         * @example
         * get('foo') // bar
         * get(['foo', 'alpha']) // {foo: 'bar', 'alpha': 'beta'}
         */
        get: function (keys) {
            var paramVariable;

            if (_.isString(keys)) {
                paramVariable = auth.parameters().one(keys);

                return paramVariable && paramVariable.get();
            }
            if (_.isArray(keys)) {
                return _.transform(keys, function (paramObject, key) {
                    paramVariable = auth.parameters().one(key);
                    paramVariable && (paramObject[key] = paramVariable.get());

                    return paramObject;
                }, {});
            }

            return undefined;
        },

        /**
         * @param {String|Object} key -
         * @param {*} [value] -
         * @return {AuthInterface}
         * @example
         * set('foo', 'bar')
         * set({foo: 'bar', 'alpha': 'beta'})
         * @throws {Error}
         */
        set: function (key, value) {
            var modifiedParams = {},
                parameters;

            if (_.isObject(key)) {
                modifiedParams = key;
            }
            else if (_.isString(key)) {
                modifiedParams[key] = value;
            }
            else {
                throw new Error('runtime~AuthInterface: set should be called with `key` as a string or object');
            }

            parameters = auth.parameters();
            _.forEach(modifiedParams, function (value, key) {
                var param = parameters.one(key);

                if (!param) {
                    return parameters.add({ key: key, value: value, system: true });
                }

                // Update if the param is a system property or an empty user property (null, undefined or empty string)
                if (param.system || param.value === EMPTY || _.isNil(param.value) || _.isNaN(param.value)) {
                    return param.update({ key: key, value: value, system: true });
                }
            });

            return this;
        }
    };
};

module.exports = createAuthInterface;
