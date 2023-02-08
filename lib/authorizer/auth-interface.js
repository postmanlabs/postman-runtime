var _ = require('lodash'),
    EMPTY = '',
    createAuthInterface;

/**
 * Creates a wrapper around RequestAuth and provides getters and setters helper functions
 *
 * @constructs AuthInterface
 * @param {RequestAuth} auth -
 * @param {Object} protocolProfileBehavior - Protocol profile behaviors
 * @param {Object} [options] - authorizer options
 * @return {AuthInterface}
 * @throws {Error}
 */
createAuthInterface = function (auth, protocolProfileBehavior, options) {
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
                // This hacky handling here localizes the impact for refresh token in runtime, we want to avoid
                // changing the auth handler interface in general and localizing this here allows us to refactor
                // easily if we decide to move the oauth2 token generation flow into runtime
                if (keys === 'refreshOAuth2Token') {
                    return options && options.refreshOAuth2Token;
                }

                paramVariable = auth.parameters().one(keys);

                return paramVariable && paramVariable.get();
            }
            if (_.isArray(keys)) {
                return _.transform(keys, function (paramObject, key) {
                    if (key === 'refreshOAuth2Token') {
                        paramObject[key] = options && options.refreshOAuth2Token;

                        return paramObject;
                    }

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
         * @param {Boolean} [system] - Explicitly allow setting a param as a system param
         * @return {AuthInterface}
         * @example
         * set('foo', 'bar')
         * set({foo: 'bar', 'alpha': 'beta'})
         * @throws {Error}
         */
        set: function (key, value, system) {
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

                // If we are updating a user param inside runtime, it is now a system param for this execution and
                // should be marked as such
                if (system) {
                    param.system = true;
                }

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
