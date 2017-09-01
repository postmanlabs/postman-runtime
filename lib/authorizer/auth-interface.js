var _ = require('lodash'),
    createAuthInterface;

/**
* Creates a wrapper around RequestAuth and provides getters and setters helper functions
*
* @param {RequestAuth} auth
* @constructor
*/
createAuthInterface = function (auth) {
    // cached value of auth object
    var authObject = auth.parameters().toObject();

    return {
        /**
         * @param {String|Array<String>} key
         * @return {*} Returns a value or array of values depending on the input
         */
        get: function (key) {
            if (_.isString(key)) {
                return authObject[key];
            }
            if (_.isArray(key)) {
                return _.pick(authObject, key);
            }
        },

        /**
         * @param {String|Object} key
         * @param {*} [value]
         * @return {RequestAuth} Returns the modified the auth
         * @example set('foo', 'bar') or set({foo: 'bar'})
         */
        set: function (key, value) {
            var modifiedParams = {};

            if (_.isPlainObject(key)) {
                modifiedParams = key;
            }
            else if (_.isString(key)) {
                modifiedParams[key] = value;
            }
            else {
                return auth;
            }
            auth.parameters().syncFromObject(_.merge(authObject, modifiedParams));
            authObject = auth.parameters().toObject();
            return auth;
        }
    };
};

module.exports = createAuthInterface;
